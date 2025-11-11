/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Jupyter } from "@vscode/jupyter-extension";
import { OAuth2Client } from "google-auth-library";
import vscode, { Disposable } from "vscode";
import { GoogleAuthProvider } from "./auth/auth-provider";
import { getOAuth2Flows } from "./auth/flows/flows";
import { login } from "./auth/login";
import { AuthStorage } from "./auth/storage";
import { ColabClient } from "./colab/client";
import { COLAB_TOOLBAR, REMOVE_SERVER } from "./colab/commands/constants";
import { notebookToolbar } from "./colab/commands/notebook";
import { removeServer } from "./colab/commands/server";
import { ConnectionRefreshController } from "./colab/connection-refresher";
import { ConsumptionNotifier } from "./colab/consumption/notifier";
import { ConsumptionPoller } from "./colab/consumption/poller";
import { ServerKeepAliveController } from "./colab/keep-alive";
import { ServerPicker } from "./colab/server-picker";
import { CONFIG } from "./colab-config";
import { initializeLogger, log } from "./common/logging";
import { Toggleable } from "./common/toggleable";
import { getPackageInfo } from "./config/package-info";
import { AssignmentManager } from "./jupyter/assignments";
import { getJupyterApi } from "./jupyter/jupyter-extension";
import { ColabJupyterServerProvider } from "./jupyter/provider";
import { ServerStorage } from "./jupyter/storage";
import { ExtensionUriHandler } from "./system/uri";
import { NotaEditorProvider } from "./webview/NotaEditorProvider";
import { NotaConverter } from "./webview/NotaConverter";
import { NotaCommands } from "./webview/NotaCommands";

// Called when the extension is activated.
export async function activate(context: vscode.ExtensionContext) {
  const logging = initializeLogger(vscode, context.extensionMode);
  
  // Try to get Jupyter API, but don't fail if not available
  let jupyter: vscode.Extension<Jupyter> | undefined;
  try {
    jupyter = await getJupyterApi(vscode);
    logEnvInfo(jupyter);
  } catch (error) {
    log.info("Jupyter extension not available, running in standalone mode");
  }
  
  const uriHandler = new ExtensionUriHandler(vscode);
  const uriHandlerRegistration = vscode.window.registerUriHandler(uriHandler);
  const authClient = new OAuth2Client(
    CONFIG.ClientId,
    CONFIG.ClientNotSoSecret,
  );
  const authFlows = getOAuth2Flows(
    vscode,
    getPackageInfo(context.extension),
    authClient,
  );
  const authProvider = new GoogleAuthProvider(
    vscode,
    new AuthStorage(context.secrets),
    authClient,
    (scopes: string[]) => login(vscode, authFlows, authClient, scopes),
  );
  await authProvider.initialize();
  const colabClient = new ColabClient(
    new URL(CONFIG.ColabApiDomain),
    new URL(CONFIG.ColabGapiDomain),
    () =>
      GoogleAuthProvider.getOrCreateSession(vscode).then(
        (session) => session.accessToken,
      ),
  );
  const serverStorage = new ServerStorage(vscode, context.secrets);
  const assignmentManager = new AssignmentManager(
    vscode,
    colabClient,
    serverStorage,
  );
  
  // Register Nota Editor Provider (TipTap-based)
  const notaEditorProvider = new NotaEditorProvider(context, colabClient);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      NotaEditorProvider.viewType,
      notaEditorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );
  
  // Only register Jupyter provider if Jupyter extension is available
  let serverProvider: ColabJupyterServerProvider | undefined;
  if (jupyter) {
    serverProvider = new ColabJupyterServerProvider(
      vscode,
      authProvider.whileAuthorized.bind(authProvider),
      assignmentManager,
      colabClient,
      new ServerPicker(vscode, assignmentManager),
      jupyter.exports,
    );
  }
  
  const connections = new ConnectionRefreshController(assignmentManager);
  const keepServersAlive = new ServerKeepAliveController(
    vscode,
    colabClient,
    assignmentManager,
  );
  const consumptionMonitor = watchConsumption(colabClient);
  // Sending server "keep-alive" pings and monitoring consumption requires
  // issuing authenticated requests to Colab. This can only be done after the
  // user has signed in. We don't block extension activation on completing the
  // heavily asynchronous sign-in flow.
  const whileAuthorizedToggle = authProvider.whileAuthorized(
    connections,
    keepServersAlive,
    consumptionMonitor.toggle,
  );

  const subscriptions = [
    logging,
    uriHandler,
    uriHandlerRegistration,
    disposeAll(authFlows),
    authProvider,
    assignmentManager,
    connections,
    keepServersAlive,
    ...consumptionMonitor.disposables,
    whileAuthorizedToggle,
    ...registerCommands(assignmentManager, context),
  ];
  
  if (serverProvider) {
    subscriptions.push(serverProvider);
  }
  
  context.subscriptions.push(...subscriptions);
}

function logEnvInfo(jupyter: vscode.Extension<Jupyter>) {
  log.info(`${vscode.env.appName}: ${vscode.version}`);
  log.info(`Remote: ${vscode.env.remoteName ?? "N/A"}`);
  log.info(`App Host: ${vscode.env.appHost}`);
  const jupyterVersion = getPackageInfo(jupyter).version;
  log.info(`Jupyter extension version: ${jupyterVersion}`);
}

/**
 * Sets up consumption monitoring.
 *
 * If the user has already signed in, starts immediately. Otherwise, waits until
 * the user signs in.
 */
function watchConsumption(colab: ColabClient): {
  toggle: Toggleable;
  disposables: Disposable[];
} {
  const disposables: Disposable[] = [];
  const poller = new ConsumptionPoller(vscode, colab);
  disposables.push(poller);
  const notifier = new ConsumptionNotifier(
    vscode,
    colab,
    poller.onDidChangeCcuInfo,
  );
  disposables.push(notifier);

  return { toggle: poller, disposables };
}

function registerCommands(
  assignmentManager: AssignmentManager,
  _context: vscode.ExtensionContext,
): Disposable[] {
  const notaConverter = new NotaConverter();
  const notaCommands = new NotaCommands(notaConverter);

  return [
    // New Nota Document command
    vscode.commands.registerCommand("colab.newNotaDocument", async () => {
      const uri = vscode.Uri.file("Untitled.nota").with({ scheme: "untitled" });
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    }),
    
    // Export to Jupyter Notebook command
    vscode.commands.registerCommand("colab.exportToJupyter", async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document.uri.path.endsWith(".nota")) {
        vscode.window.showErrorMessage("Please open a .nota file to export");
        return;
      }

      try {
        // Parse the current document
        const notaContent = JSON.parse(activeEditor.document.getText());
        
        // Convert to ipynb
        const ipynbContent = await notaCommands.exportToIpynb(notaContent);
        
        // Generate default filename
        const notaPath = notaCommands.getNotaFilePath(activeEditor.document.uri);
        const defaultFilename = notaCommands.generateIpynbFilename(notaPath);
        
        // Show save dialog
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(defaultFilename),
          filters: {
            "Jupyter Notebooks": ["ipynb"],
          },
        });

        if (uri) {
          // Write the file
          const content = JSON.stringify(ipynbContent, null, 2);
          await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
          vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
        }
      } catch (error) {
        log.error("Export failed:", error);
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

    // Import from Jupyter Notebook command
    vscode.commands.registerCommand("colab.importFromJupyter", async () => {
      try {
        // Show open dialog
        const uris = await vscode.window.showOpenDialog({
          canSelectMany: false,
          filters: {
            "Jupyter Notebooks": ["ipynb"],
          },
        });

        if (!uris || uris.length === 0) {
          return;
        }

        // Read the ipynb file
        const ipynbContent = await vscode.workspace.fs.readFile(uris[0]);
        const ipynbData = JSON.parse(Buffer.from(ipynbContent).toString("utf8"));

        // Convert to nota
        const notaContent = await notaCommands.importFromIpynb(ipynbData);

        // Generate nota filename
        const ipynbFilename = uris[0].fsPath;
        const notaFilename = ipynbFilename.replace(/\.ipynb$/, ".nota");

        // Show save dialog for nota file
        const saveUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(notaFilename),
          filters: {
            "Nota Documents": ["nota"],
          },
        });

        if (saveUri) {
          // Write the nota file
          const content = JSON.stringify(notaContent, null, 2);
          await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, "utf8"));
          
          // Open the new nota file
          const doc = await vscode.workspace.openTextDocument(saveUri);
          await vscode.window.showTextDocument(doc);
          vscode.window.showInformationMessage(`Imported from ${uris[0].fsPath}`);
        }
      } catch (error) {
        log.error("Import failed:", error);
        vscode.window.showErrorMessage(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

    // TODO: Register the rename server alias command once rename is reflected
    // in the recent kernels list. See https://github.com/microsoft/vscode-jupyter/issues/17107.
    vscode.commands.registerCommand(
      REMOVE_SERVER.id,
      async (withBackButton?: boolean) => {
        await removeServer(vscode, assignmentManager, withBackButton);
      },
    ),
    vscode.commands.registerCommand(COLAB_TOOLBAR.id, async () => {
      await notebookToolbar(vscode, assignmentManager);
    }),
  ];
}

/**
 * Returns a Disposable that calls dispose on all items in the array which are
 * disposable.
 */
function disposeAll(items: { dispose?: () => void }[]): Disposable {
  return {
    dispose: () => {
      items.forEach((item) => item.dispose?.());
    },
  };
}
