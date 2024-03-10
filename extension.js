const vscode = require("vscode");

/**
 * This method is called when your extension is activated
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Extensão AdvPL Functions List foi ativada.");
  vscode.window.showInformationMessage(
    "Extensão AdvPL Functions List foi ativada."
  );

  // Criar a barra lateral e registrar a classe como provedor de dados
  const sideBarMenuStaticFunctions = vscode.window.createTreeView(
    "sideBarMenuStaticFunctions",
    {
      treeDataProvider: new SideBarMenuStaticFunctionsProvider(),
    }
  );

  // Criar a barra lateral e registrar a classe como provedor de dados
  const sideBarMenuUserFunctions = vscode.window.createTreeView(
    "sideBarMenuUserFunctions",
    {
      treeDataProvider: new SideBarMenuUserFunctionsProvider(),
    }
  );

  context.subscriptions.push(sideBarMenuStaticFunctions);
  context.subscriptions.push(sideBarMenuUserFunctions);

  // Adicionar um manipulador de eventos para abrir o arquivo na linha correspondente
  vscode.commands.registerCommand(
    "advplFunctionsList.sideBarMenu.openFile",
    (lineNumber) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const newPosition = new vscode.Position(lineNumber - 1, 0); // Linhas são baseadas em zero
        const newSelection = new vscode.Selection(newPosition, newPosition);
        activeEditor.selection = newSelection;
        activeEditor.revealRange(
          new vscode.Range(newPosition, newPosition),
          vscode.TextEditorRevealType.InCenter
        );
      }
    }
  );
}

// This method is called when your extension is deactivated
function deactivate() {
  console.log("Extensão AdvPL Functions List foi desativada.");
  vscode.window.showInformationMessage(
    "Extensão AdvPL Functions List foi desativada."
  );
}

class SideBarMenuStaticFunctionsProvider {
  constructor() {
    // EventEmitter para notificar quando os dados da árvore mudam
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Registrar observadores para eventos de alteração no editor de texto
    vscode.workspace.onDidChangeTextDocument(() => {
      this.refresh(); // Atualizar os dados da árvore quando o documento for modificado
    });

    vscode.window.onDidChangeActiveTextEditor(() => {
      this.refresh(); // Atualizar os dados da árvore quando o editor ativo mudar
    });

    vscode.workspace.onDidCloseTextDocument(() => {
      this.refresh(); // Atualizar os dados da árvore quando um documento for fechado
    });
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    let elementLabel;
    let elementLineNumber;
    let collapsibleState;
    let commandSideBarMenuOpenFile;

    elementLabel = element.label;
    elementLineNumber = element.lineNumber;

    if (element.parameters && element.parameters.length > 0) {
      collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    } else {
      collapsibleState = vscode.TreeItemCollapsibleState.None;
    }

    commandSideBarMenuOpenFile = {
      title: "Abrir arquivo",
      command: "advplFunctionsList.sideBarMenu.openFile",
      arguments: [elementLineNumber],
    };

    return {
      label: elementLabel,
      collapsibleState: collapsibleState,
      command: commandSideBarMenuOpenFile,
    };
  }

  async getChildren(element) {
    if (element) {
      let parametersList = [];
      if (element.parameters) {
        element.parameters.forEach((element) => {
          parametersList.push({
            label: element,
          });
        });
      }
      return parametersList;
    } else {
      let staticFunctionsList = [];
      getStaticFunctionsInActiveEditor().forEach((element) => {
        staticFunctionsList.push(element);
      });
      return staticFunctionsList;
    }
  }
}

class SideBarMenuUserFunctionsProvider {
  constructor() {
    // EventEmitter para notificar quando os dados da árvore mudam
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Registrar observadores para eventos de alteração no editor de texto
    vscode.workspace.onDidChangeTextDocument(() => {
      this.refresh(); // Atualizar os dados da árvore quando o documento for modificado
    });

    vscode.window.onDidChangeActiveTextEditor(() => {
      this.refresh(); // Atualizar os dados da árvore quando o editor ativo mudar
    });

    vscode.workspace.onDidCloseTextDocument(() => {
      this.refresh(); // Atualizar os dados da árvore quando um documento for fechado
    });
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    let elementLabel;
    let elementLineNumber;
    let collapsibleState;
    let commandSideBarMenuOpenFile;

    elementLabel = element.label;
    elementLineNumber = element.lineNumber;

    if (element.parameters && element.parameters.length > 0) {
      collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    } else {
      collapsibleState = vscode.TreeItemCollapsibleState.None;
    }

    commandSideBarMenuOpenFile = {
      title: "Abrir arquivo",
      command: "advplFunctionsList.sideBarMenu.openFile",
      arguments: [elementLineNumber],
    };

    return {
      label: elementLabel,
      collapsibleState: collapsibleState,
      command: commandSideBarMenuOpenFile,
    };
  }

  async getChildren(element) {
    if (element) {
      let parametersList = [];
      if (element.parameters) {
        element.parameters.forEach((element) => {
          parametersList.push({
            label: element,
          });
        });
      }
      return parametersList;
    } else {
      let userFunctionsList = [];
      getUserFunctionsInActiveEditor().forEach((element) => {
        userFunctionsList.push(element);
      });
      return userFunctionsList;
    }
  }
}

function getStaticFunctionsInActiveEditor() {
  let activeEditor;
  let textEditor;
  let staticFunctionsList;
  let extensionSettings;
  let regexExpression;
  let matches;
  let elementLabel;
  let elementParametersList;

  activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return [];
  }

  extensionSettings = vscode.workspace.getConfiguration("advplFunctionsList");

  textEditor = activeEditor.document.getText();
  if (textEditor.length == 0) {
    return [];
  }

  staticFunctionsList = [];
  regexExpression = extensionSettings.regex.staticfunctions;
  regexExpression = RegExp(regexExpression, "gi");

  while ((matches = regexExpression.exec(textEditor)) !== null) {
    elementLabel = matches[1];
    elementParametersList = [];

    matches[2].split(",").forEach((element) => {
      element = checkElementType(element);
      elementParametersList.push(element.trim());
    });

    staticFunctionsList.push({
      label: elementLabel,
      parameters: elementParametersList,
      lineNumber: activeEditor.document.positionAt(matches.index).line + 1,
    });
  }

  return staticFunctionsList;
}

function getUserFunctionsInActiveEditor() {
  let activeEditor;
  let textEditor;
  let userFunctionsList;
  let extensionSettings;
  let regexExpression;
  let matches;
  let elementLabel;
  let elementParametersList;

  activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return [];
  }

  extensionSettings = vscode.workspace.getConfiguration("advplFunctionsList");

  textEditor = activeEditor.document.getText();
  if (textEditor.length == 0) {
    return [];
  }

  userFunctionsList = [];
  regexExpression = extensionSettings.regex.userfunctions;
  regexExpression = RegExp(regexExpression, "gi");

  while ((matches = regexExpression.exec(textEditor)) !== null) {
    elementLabel = matches[1];
    elementParametersList = [];

    matches[2].split(",").forEach((element) => {
      element = checkElementType(element);
      elementParametersList.push(element.trim());
    });

    userFunctionsList.push({
      label: elementLabel,
      parameters: elementParametersList,
      lineNumber: activeEditor.document.positionAt(matches.index).line + 1,
    });
  }

  return userFunctionsList;
}

function checkElementType(element) {
  element = element.trim();
  if (element.trim().length > 0) {
    if (element.search(" as ") > 0) {
      element = element.split(" as ").join(" : ");
    } else {
      if (element.startsWith("c")) {
        element = `${element} : character`;
      } else if (element.startsWith("n")) {
        element = `${element} : numeric`;
      } else if (element.startsWith("a")) {
        element = `${element} : array`;
      } else if (element.startsWith("d")) {
        element = `${element} : date`;
      } else if (element.startsWith("o")) {
        element = `${element} : object`;
      } else if (element.startsWith("j")) {
        element = `${element} : json`;
      } else {
        element = `${element} : undefined`;
      }
    }
  }
  return element;
}

module.exports = {
  activate,
  deactivate,
};
