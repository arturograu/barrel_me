import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("Barrel Me extension is now active!");

  const disposable = vscode.commands.registerCommand(
    "barrel-me.create",
    async (uri: vscode.Uri) => {
      try {
        if (!uri) {
          vscode.window.showErrorMessage(
            "Please right-click on a folder to create a barrel file."
          );
          return;
        }

        const stat = fs.statSync(uri.fsPath);
        if (!stat.isDirectory()) {
          vscode.window.showErrorMessage(
            "Please select a folder to create a barrel file."
          );
          return;
        }

        // Get the folder name to use as default
        const folderName = path.basename(uri.fsPath);
        const defaultBarrelName = toSnakeCase(folderName);

        const barrelNameInput = await vscode.window.showInputBox({
          prompt:
            "Enter the barrel file name (or press Enter to use folder name)",
          placeHolder: `Default: ${defaultBarrelName}`,
          validateInput: (value: string) => {
            // Allow empty input (will use default)
            if (!value || value.trim() === "") {
              return null;
            }
            // Validate if user provides a name
            if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
              return "File name must follow Dart naming conventions (lowercase, underscores, no spaces)";
            }
            return null;
          },
        });

        // User cancelled (pressed Escape)
        if (barrelNameInput === undefined) {
          return;
        }

        const barrelName = barrelNameInput.trim() || defaultBarrelName;

        const config = vscode.workspace.getConfiguration("barrelMe");
        const excludeFolders: string[] = config.get("exclude", [
          "test",
          "generated",
        ]);
        const recursive: boolean = config.get("recursive", false);
        const excludeFiles: string[] = config.get("excludeFiles", [
          "main.dart",
        ]);

        if (recursive) {
          // Hierarchical mode: create barrels in subfolders and parent
          const createdFiles = await createHierarchicalBarrels(
            uri.fsPath,
            barrelName,
            excludeFolders,
            excludeFiles
          );

          if (createdFiles.length === 0) {
            vscode.window.showWarningMessage(
              "No Dart files found in the selected folder."
            );
            return;
          }

          vscode.window.showInformationMessage(
            `✅ Created ${createdFiles.length} barrel file(s) successfully.`
          );

          // Open the parent barrel file
          const parentBarrelPath = path.join(uri.fsPath, `${barrelName}.dart`);
          if (fs.existsSync(parentBarrelPath)) {
            const document = await vscode.workspace.openTextDocument(
              parentBarrelPath
            );
            await vscode.window.showTextDocument(document);
          }
        } else {
          // Non-recursive mode: create single barrel in current folder
          const dartFiles = await scanForDartFiles(
            uri.fsPath,
            excludeFolders,
            excludeFiles,
            false
          );

          // Filter out part files - we only export main files
          const mainFiles = filterPartFiles(dartFiles);

          if (mainFiles.length === 0) {
            vscode.window.showWarningMessage(
              "No Dart files found in the selected folder (excluding part files)."
            );
            return;
          }

          const barrelContent = generateBarrelContent(mainFiles, uri.fsPath);
          const barrelFileName = `${barrelName}.dart`;
          const barrelFilePath = path.join(uri.fsPath, barrelFileName);

          // Check if file already exists
          if (fs.existsSync(barrelFilePath)) {
            const overwrite = await vscode.window.showWarningMessage(
              `File '${barrelFileName}' already exists. Do you want to overwrite it?`,
              "Yes",
              "No"
            );

            if (overwrite !== "Yes") {
              return;
            }
          }

          // Write the barrel file
          fs.writeFileSync(barrelFilePath, barrelContent, "utf8");

          vscode.window.showInformationMessage(
            `✅ Barrel file '${barrelFileName}' generated successfully.`
          );

          // Open the created file
          const document = await vscode.workspace.openTextDocument(
            barrelFilePath
          );
          await vscode.window.showTextDocument(document);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(
          `Failed to create barrel file: ${errorMessage}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Creates hierarchical barrel files: one in each subfolder and one in parent
 */
async function createHierarchicalBarrels(
  folderPath: string,
  barrelName: string,
  excludeFolders: string[],
  excludeFiles: string[]
): Promise<string[]> {
  const createdFiles: string[] = [];

  // Get immediate subdirectories and files
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  const subdirs: string[] = [];
  const rootFiles: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      if (!excludeFolders.includes(entry.name)) {
        subdirs.push(entry.name);
      }
    } else if (entry.isFile() && entry.name.endsWith(".dart")) {
      if (
        !excludeFiles.includes(entry.name) &&
        !isBarrelFile(fullPath) &&
        entry.name !== `${barrelName}.dart`
      ) {
        rootFiles.push(fullPath);
      }
    }
  }

  // Create barrel files in each subdirectory
  const subfolderBarrels: { subdir: string; barrelFileName: string }[] = [];
  const singleFileSubfolders: string[] = []; // Track subfolders with only one file

  for (const subdir of subdirs) {
    const subdirPath = path.join(folderPath, subdir);
    const dartFiles = await scanForDartFiles(
      subdirPath,
      excludeFolders,
      excludeFiles,
      false // Non-recursive for each subfolder
    );

    // If no files, skip
    if (dartFiles.length === 0) {
      continue;
    }

    // Filter out part files - we only export main files
    const mainFiles = filterPartFiles(dartFiles);

    // If no main files (only parts), skip
    if (mainFiles.length === 0) {
      continue;
    }

    // If only one main file (with or without parts), track it for direct export (no barrel needed)
    if (mainFiles.length === 1) {
      singleFileSubfolders.push(mainFiles[0]);
      continue;
    }

    // Check if a file with the same name as the folder exists
    const conflictingFile = path.join(subdirPath, `${subdir}.dart`);
    const hasConflict =
      fs.existsSync(conflictingFile) && !isBarrelFile(conflictingFile);

    // Determine barrel filename
    const barrelFileName = hasConflict
      ? `${subdir}_barrel.dart`
      : `${subdir}.dart`;
    const barrelFilePath = path.join(subdirPath, barrelFileName);

    // Generate barrel content (excluding the barrel file itself from exports)
    const filesToExport = mainFiles.filter(
      (f) => path.basename(f) !== barrelFileName
    );

    if (filesToExport.length > 0) {
      const barrelContent = generateBarrelContent(filesToExport, subdirPath);
      fs.writeFileSync(barrelFilePath, barrelContent, "utf8");
      createdFiles.push(barrelFilePath);
      subfolderBarrels.push({ subdir, barrelFileName });
    }
  }

  // Create parent barrel file that exports subfolder barrels and root files
  // Filter out part files from root files
  const mainRootFiles = filterPartFiles(rootFiles);

  if (
    subfolderBarrels.length > 0 ||
    mainRootFiles.length > 0 ||
    singleFileSubfolders.length > 0
  ) {
    const exports: string[] = [];

    // Export root-level main files (excluding part files)
    for (const file of mainRootFiles) {
      const relativePath = path.relative(folderPath, file);
      const normalizedPath = relativePath.split(path.sep).join("/");
      exports.push(`export '${normalizedPath}';`);
    }

    // Export single files from subfolders (no barrel needed)
    for (const file of singleFileSubfolders) {
      const relativePath = path.relative(folderPath, file);
      const normalizedPath = relativePath.split(path.sep).join("/");
      exports.push(`export '${normalizedPath}';`);
    }

    // Export subfolder barrels
    for (const { subdir, barrelFileName } of subfolderBarrels) {
      exports.push(`export '${subdir}/${barrelFileName}';`);
    }

    const barrelContent = exports.sort().join("\n") + "\n";
    const parentBarrelPath = path.join(folderPath, `${barrelName}.dart`);

    fs.writeFileSync(parentBarrelPath, barrelContent, "utf8");
    createdFiles.push(parentBarrelPath);
  }

  return createdFiles;
}

/**
 * Scans a directory for Dart files
 */
async function scanForDartFiles(
  folderPath: string,
  excludeFolders: string[],
  excludeFiles: string[],
  recursive: boolean
): Promise<string[]> {
  const dartFiles: string[] = [];

  function scanDirectory(dirPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded folders
        if (excludeFolders.includes(entry.name)) {
          continue;
        }

        // Only recurse if recursive mode is enabled
        if (recursive) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".dart")) {
        if (excludeFiles.includes(entry.name)) {
          continue;
        }

        if (isBarrelFile(fullPath)) {
          continue;
        }

        dartFiles.push(fullPath);
      }
    }
  }

  scanDirectory(folderPath);
  return dartFiles;
}

/**
 * Checks if a file is likely a barrel file (contains only exports and comments)
 */
function isBarrelFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter(
        (line) =>
          !line.startsWith("//") &&
          !line.startsWith("/*") &&
          !line.startsWith("*")
      );

    // If all non-empty, non-comment lines are exports, it's a barrel file
    return lines.every((line) => line.startsWith("export ") || line === "}");
  } catch {
    return false;
  }
}

/**
 * Checks if a file is a part file (contains 'part of' directive)
 */
function isPartFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Check if any line starts with 'part of'
    return lines.some((line) => line.startsWith("part of "));
  } catch {
    return false;
  }
}

/**
 * Filters out part files and returns only main files that should be exported
 */
function filterPartFiles(dartFiles: string[]): string[] {
  return dartFiles.filter((file) => !isPartFile(file));
}

/**
 * Generates the content of the barrel file
 */
function generateBarrelContent(dartFiles: string[], basePath: string): string {
  const exports = dartFiles
    .map((file) => {
      const relativePath = path.relative(basePath, file);

      // Normalize path separators for different OS
      const normalizedPath = relativePath.split(path.sep).join("/");
      return `export '${normalizedPath}';`;
    })
    .sort() // Sort alphabetically
    .join("\n");

  return exports + "\n";
}

/**
 * Converts a string to snake_case following Dart naming conventions
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1") // Add underscore before capital letters
    .replace(/[-\s]+/g, "_") // Replace hyphens and spaces with underscores
    .replace(/^_/, "") // Remove leading underscore
    .toLowerCase() // Convert to lowercase
    .replace(/_{2,}/g, "_"); // Replace multiple underscores with single underscore
}

export function deactivate() {}
