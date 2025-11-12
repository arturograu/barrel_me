# Welcome to Barrel Me Extension

## What's in the folder

- `package.json` - This is the manifest file defining the extension and command.
  - The extension registers a command and defines its title and command name. With this information VS Code can show the command in the command palette.
  - It also defines the context menu contribution.
- `src/extension.ts` - This is the main file where you provide the implementation of your command.
  - The file exports one function, `activate`, which is called the very first time your extension is activated.
  - Inside the `activate` function, we call `registerCommand` and define the implementation of the command.
- `tsconfig.json` - TypeScript configuration file.
- `.vscode/launch.json` - Debug configuration for running and debugging the extension.
- `.vscode/tasks.json` - Build task configuration.

## Get up and running straight away

- Press `F5` to open a new window with your extension loaded.
- Run your command from the command palette by pressing (`Cmd+Shift+P` or `Ctrl+Shift+P`) and typing `Create Barrel`.
- Right-click on a folder in the file explorer and select `Create Barrel`.
- Set breakpoints in your code inside `src/extension.ts` to debug your extension.
- Find output from your extension in the debug console.

## Make changes

- You can relaunch the extension from the debug toolbar after changing code in `src/extension.ts`.
- You can also reload (`Cmd+R` or `Ctrl+R`) the VS Code window with your extension to load your changes.

## Explore the API

- You can open the full set of our API when you open the file `node_modules/@types/vscode/index.d.ts`.

## Run tests

- Open the debug viewlet (`Cmd+Shift+D` or `Ctrl+Shift+D`) and from the launch configuration dropdown pick `Extension Tests`.
- Press `F5` to run the tests in a new window with your extension loaded.
- See the output of the test result in the debug console.
- Make changes to `src/test/suite/extension.test.ts` or create new test files inside the `src/test/suite` folder.
  - The provided test runner will only consider files matching the name pattern `**.test.ts`.
