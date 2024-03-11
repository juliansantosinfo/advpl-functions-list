const vscode = require("vscode");

/**
 * Ativa a extensão.
 * Registra os menus laterais e comandos necessários.
 * @param {vscode.ExtensionContext} context - O contexto da extensão.
 */
function activate(context) {
  // Exibe mensagem de ativação da extensão
  showActivationMessage();

  // Cria a visualização da árvore para funções de usuário
  const sideBarMenuFunctions = vscode.window.createTreeView(
    "sideBarMenuFunctions",
    { treeDataProvider: new SideBarMenuProvider(), showCollapseAll: true }
  );

  // Registra as visualizações da árvore para serem liberadas quando a extensão for desativada
  context.subscriptions.push(sideBarMenuFunctions);

  // Registra o comando para abrir um arquivo na linha específica
  vscode.commands.registerCommand(
    "advplFunctionsList.sideBarMenu.openFile",
    (lineNumber) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const newPosition = new vscode.Position(lineNumber - 1, 0);
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

/**
 * Desativa a extensão.
 * Exibe uma mensagem indicando que a extensão foi desativada.
 */
function deactivate() {
  console.log("Extensão AdvPL Functions List foi desativada.");
  showInformationMessage("Extensão AdvPL Functions List foi desativada.");
}

/**
 * Exibe uma mensagem indicando que a extensão foi ativada, se a configuração estiver ativada.
 */
function showActivationMessage() {
  const shouldShowActivationMessage = vscode.workspace
    .getConfiguration()
    .get("advplFunctionsList.showActivationMessage", false);

  if (shouldShowActivationMessage) {
    console.log("Extensão AdvPL Functions List foi ativada.");
    showInformationMessage("Extensão AdvPL Functions List foi ativada.");
  }
}

/**
 * Provedor de dados para a visualização da barra lateral.
 * Responsável por fornecer os itens da árvore.
 */
class SideBarMenuProvider {
  /**
   * Cria uma instância do provedor de dados da barra lateral.
   */
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Registra ouvintes para eventos de alteração de documento e editor ativo
    vscode.workspace.onDidChangeTextDocument(() => this.refresh());
    vscode.window.onDidChangeActiveTextEditor(() => this.refresh());
    vscode.workspace.onDidCloseTextDocument(() => this.refresh());
  }

  /**
   * Dispara um evento para atualizar a visualização da árvore.
   */
  refresh() {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Retorna um item de árvore com base no elemento fornecido.
   * @param {any} element - O elemento para o qual gerar o item de árvore.
   * @returns {vscode.TreeItem} O item de árvore correspondente ao elemento.
   */
  getTreeItem(element) {
    const collapsibleState =
      element.type == "function"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;

    const commandSideBarMenuOpenFile = {
      title: "Abrir arquivo",
      command: "advplFunctionsList.sideBarMenu.openFile",
      arguments: [element.lineNumber],
    };

    let iconName = "x";
    if (element.type) {
      if (element.type === "function") {
        iconName = "symbol-function";
      } else if (element.type === "parameter") {
        iconName = "symbol-parameter";
      } else if (element.type === "variable") {
        iconName = "symbol-variable";
      }
    }

    let treeItem = {};
    treeItem.iconPath = new vscode.ThemeIcon(iconName);
    treeItem.label = element.label;
    treeItem.collapsibleState = collapsibleState;
    if (element.type == "function") {
      treeItem.command = commandSideBarMenuOpenFile;
    }

    return treeItem;
  }

  /**
   * Retorna os filhos do elemento fornecido.
   * @param {any} element - O elemento pai para o qual obter os filhos.
   * @returns {Promise<any[]>} Uma promessa que resolve em uma matriz de elementos filhos.
   */
  async getChildren(element) {
    let functionsList;
    if (element) {
      let functionsList = [];
      if (element.parameters) {
        element.parameters.forEach((element) => {
          functionsList.push({
            type: "parameter",
            label: element,
          });
        });
      }
      if (element.variables) {
        element.variables.forEach((element) => {
          functionsList.push({
            type: "variable",
            label: `${element.scope} : ${element.label}`,
          });
        });
      }
      return functionsList;
    } else {
      functionsList = getFunctionsInActiveEditor();
      return functionsList;
    }
  }
}

/**
 * Retorna uma lista de funções encontradas no editor ativo.
 * @returns {Array} Uma lista de objetos representando as funções encontradas.
 */
function getFunctionsInActiveEditor() {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return [];
  }

  const textEditor = activeEditor.document.getText();
  if (textEditor.length === 0) {
    return [];
  }

  const extensionSettings =
    vscode.workspace.getConfiguration("advplFunctionsList");
  // const regexExpression = extensionSettings.regex[type + "functions"];
  const regexExpression = extensionSettings.regex.functions;
  const regex = RegExp(regexExpression, "gi");

  const functionsList = [];
  let matches;
  while ((matches = regex.exec(textEditor)) !== null) {
    const scope = matches[1];
    const label = matches[2];
    const parameters = parseParameters(matches[3]);
    const lineNumber = activeEditor.document.positionAt(matches.index).line + 1;
    const variables = getFunctionVariables(label);
    functionsList.push({
      type: "function",
      label,
      parameters,
      variables,
      lineNumber,
    });
  }

  return functionsList;
}

/**
 * Analisa uma string de parâmetros e retorna uma lista de parâmetros formatados.
 * @param {string} parametersString - A string contendo os parâmetros da função.
 * @returns {Array} Uma lista de parâmetros formatados.
 */
function parseParameters(parametersString) {
  const parameters = [];
  parametersString.split(",").forEach((element) => {
    const trimmedElement = element.trim();
    if (trimmedElement.length > 0) {
      let parameter = trimmedElement;
      if (parameter.search(" as ") > 0) {
        parameter = parameter.split(" as ").join(" : ");
      } else {
        parameter = addTypePrefix(parameter);
      }
      parameters.push(parameter);
    }
  });
  return parameters;
}

/**
 * Retorna uma lista de variáveis encontradas no corpo da função.
 * @param {string} functionName - O nome da função para a qual extrair as variáveis.
 * @returns {Array} Uma lista de objetos representando as variáveis encontradas.
 */
function getFunctionVariables(functionName) {
  const activeEditor = vscode.window.activeTextEditor;
  const textEditor = activeEditor.document.getText();
  if (textEditor.length === 0) {
    return [];
  }

  const regexExpressionFunction = RegExp(
    `(Static|User)\\sFunction\\s*?${functionName}\\((.*?)\\)([\\s\\S]*?)\\nReturn\\s*?(.*?)\\n`,
    "gi"
  );

  const matcheFunction = regexExpressionFunction.exec(textEditor);

  if (!matcheFunction) {
    return [];
  }

  const functionBody = matcheFunction[0];
  const variableList = extractVariables(functionBody);

  return variableList;
}

/**
 * Extrai variáveis do corpo da função.
 * @param {string} functionBody - O corpo da função para o qual extrair as variáveis.
 * @returns {Array} Uma lista de objetos representando as variáveis encontradas.
 */
function extractVariables(functionBody) {
  const extensionSettings =
    vscode.workspace.getConfiguration("advplFunctionsList");
  const regexExpressionVariables = RegExp(extensionSettings.regex.variables);
  const regex = RegExp(regexExpressionVariables, "gi");

  const variableList = [];
  let matches;
  while ((matches = regex.exec(functionBody)) !== null) {
    const type = "variable";
    const scope = matches[1];
    const label = matches[2];
    variableList.push({ type, scope, label });
  }

  return variableList;
}

/**
 * Adiciona um prefixo de tipo aos parâmetros.
 * @param {string} element - O parâmetro ao qual adicionar o prefixo de tipo.
 * @returns {string} O parâmetro com o prefixo de tipo adicionado.
 */
function addTypePrefix(element) {
  if (element.startsWith("c")) {
    element = `${element} : character`;
  } else if (element.startsWith("n")) {
    element = `${element} : numeric`;
  } else if (element.startsWith("l")) {
    element = `${element} : logical`;
  } else if (element.startsWith("a")) {
    element = `${element} : array`;
  } else if (element.startsWith("d")) {
    element = `${element} : date`;
  } else if (element.startsWith("o")) {
    element = `${element} : object`;
  } else if (element.startsWith("j")) {
    element = `${element} : json`;
  }
  return element;
}

/**
 * Exibe uma mensagem de informação.
 * @param {string} message - A mensagem a ser exibida.
 */
function showInformationMessage(message) {
  vscode.window.showInformationMessage(message);
}

// Exporta as funções `activate` e `deactivate` para serem usadas como interface com o VS Code
module.exports = { activate, deactivate };
