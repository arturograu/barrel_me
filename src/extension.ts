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

        const barrelName = getDefaultBarrelName(uri.fsPath);
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
          await handleHierarchicalMode(
            uri.fsPath,
            barrelName,
            excludeFolders,
            excludeFiles
          );
        } else {
          await handleSingleBarrelMode(
            uri.fsPath,
            barrelName,
            excludeFolders,
            excludeFiles
          );
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
 * Opens a file in the VS Code editor
 */
async function openFileInEditor(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);
}

/**
 * Handles hierarchical barrel generation (recursive mode)
 */
async function handleHierarchicalMode(
  folderPath: string,
  barrelName: string,
  excludeFolders: string[],
  excludeFiles: string[]
): Promise<void> {
  const createdFiles = await createHierarchicalBarrels(
    folderPath,
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

  const parentBarrelPath = path.join(folderPath, `${barrelName}.dart`);
  await openFileInEditor(parentBarrelPath);
}

/**
 * Handles single barrel file generation (non-recursive mode)
 */
async function handleSingleBarrelMode(
  folderPath: string,
  barrelName: string,
  excludeFolders: string[],
  excludeFiles: string[]
): Promise<void> {
  const dartFiles = await scanForDartFiles(
    folderPath,
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

  const barrelContent = generateBarrelContent(mainFiles, folderPath);
  const barrelFileName = `${barrelName}.dart`;
  const barrelFilePath = path.join(folderPath, barrelFileName);

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

  await openFileInEditor(barrelFilePath);
}

/**
 * Categorizes directory entries into subdirectories and dart files
 */
function categorizeDirectoryEntries(
  folderPath: string,
  barrelName: string,
  excludeFolders: string[],
  excludeFiles: string[]
): { subdirs: string[]; rootFiles: string[] } {
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

  return { subdirs, rootFiles };
}

/**
 * Result of processing a subdirectory
 */
type SubdirectoryResult =
  | { type: "skipped" }
  | { type: "single_file"; filePath: string }
  | { type: "barrel_created"; barrelPath: string; barrelFileName: string };

/**
 * Processes all subdirectories and collects results
 */
async function processAllSubdirectories(
  folderPath: string,
  subdirs: string[],
  excludeFolders: string[],
  excludeFiles: string[]
): Promise<{
  createdBarrels: { subdir: string; barrelFileName: string }[];
  singleFileSubfolders: string[];
  createdFilePaths: string[];
}> {
  const createdBarrels: { subdir: string; barrelFileName: string }[] = [];
  const singleFileSubfolders: string[] = [];
  const createdFilePaths: string[] = [];

  for (const subdir of subdirs) {
    const result = await processSubdirectory(
      folderPath,
      subdir,
      excludeFolders,
      excludeFiles
    );

    if (result.type === "single_file") {
      singleFileSubfolders.push(result.filePath);
    } else if (result.type === "barrel_created") {
      createdFilePaths.push(result.barrelPath);
      createdBarrels.push({
        subdir,
        barrelFileName: result.barrelFileName,
      });
    }
    // type === "skipped" means no action needed
  }

  return { createdBarrels, singleFileSubfolders, createdFilePaths };
}

/**
 * Processes a single subdirectory and determines if it needs a barrel file
 */
async function processSubdirectory(
  folderPath: string,
  subdir: string,
  excludeFolders: string[],
  excludeFiles: string[]
): Promise<SubdirectoryResult> {
  const subdirPath = path.join(folderPath, subdir);
  const dartFiles = await scanForDartFiles(
    subdirPath,
    excludeFolders,
    excludeFiles,
    false
  );

  if (dartFiles.length === 0) {
    return { type: "skipped" };
  }

  const mainFiles = filterPartFiles(dartFiles);
  if (mainFiles.length === 0) {
    return { type: "skipped" };
  }

  // If only one main file, no barrel needed - export directly
  if (mainFiles.length === 1) {
    return { type: "single_file", filePath: mainFiles[0] };
  }

  // Multiple main files - create barrel
  const barrelFileName = determineBarrelFileName(subdirPath, subdir);
  const barrelFilePath = path.join(subdirPath, barrelFileName);

  const filesToExport = mainFiles.filter(
    (f) => path.basename(f) !== barrelFileName
  );

  if (filesToExport.length === 0) {
    return { type: "skipped" };
  }

  const barrelContent = generateBarrelContent(filesToExport, subdirPath);
  fs.writeFileSync(barrelFilePath, barrelContent, "utf8");

  return {
    type: "barrel_created",
    barrelPath: barrelFilePath,
    barrelFileName,
  };
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

  const { subdirs, rootFiles } = categorizeDirectoryEntries(
    folderPath,
    barrelName,
    excludeFolders,
    excludeFiles
  );

  // Create barrel files in each subdirectory
  const {
    createdBarrels: subfolderBarrels,
    singleFileSubfolders,
    createdFilePaths,
  } = await processAllSubdirectories(
    folderPath,
    subdirs,
    excludeFolders,
    excludeFiles
  );

  createdFiles.push(...createdFilePaths);

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
    mainRootFiles.forEach((file) => {
      exports.push(createExportStatement(file, folderPath));
    });

    // Export single files from subfolders (no barrel needed)
    singleFileSubfolders.forEach((file) => {
      exports.push(createExportStatement(file, folderPath));
    });

    // Export subfolder barrels
    subfolderBarrels.forEach(({ subdir, barrelFileName }) => {
      exports.push(`export '${subdir}/${barrelFileName}';`);
    });

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
 * Determines the barrel filename for a subdirectory, handling conflicts
 * If a file with the same name as the folder exists, append '_barrel' suffix
 */
function determineBarrelFileName(
  subdirPath: string,
  subdirName: string
): string {
  const conflictingFile = path.join(subdirPath, `${subdirName}.dart`);
  const hasConflict =
    fs.existsSync(conflictingFile) && !isBarrelFile(conflictingFile);

  return hasConflict ? `${subdirName}_barrel.dart` : `${subdirName}.dart`;
}

/**
 * Reads a file and returns non-empty, trimmed lines
 */
function readFileLines(filePath: string): string[] | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return null;
  }
}

/**
 * Checks if a file is likely a barrel file (contains only exports and comments)
 */
function isBarrelFile(filePath: string): boolean {
  const lines = readFileLines(filePath);
  if (!lines) {
    return false;
  }

  const nonCommentLines = lines.filter(
    (line) =>
      !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*")
  );

  // If all non-empty, non-comment lines are exports, it's a barrel file
  return nonCommentLines.every(
    (line) => line.startsWith("export ") || line === "}"
  );
}

/**
 * Checks if a file is a part file (contains 'part of' directive)
 */
function isPartFile(filePath: string): boolean {
  const lines = readFileLines(filePath);
  if (!lines) {
    return false;
  }

  // Check if any line starts with 'part of'
  return lines.some((line) => line.startsWith("part of "));
}

/**
 * Filters out part files and returns only main files that should be exported
 */
function filterPartFiles(dartFiles: string[]): string[] {
  return dartFiles.filter((file) => !isPartFile(file));
}

/**
 * Creates a normalized export statement for a file
 */
function createExportStatement(filePath: string, basePath: string): string {
  const relativePath = path.relative(basePath, filePath);
  const normalizedPath = relativePath.split(path.sep).join("/");
  return `export '${normalizedPath}';`;
}

/**
 * Generates the content of the barrel file
 */
function generateBarrelContent(dartFiles: string[], basePath: string): string {
  const exports = dartFiles
    .map((file) => createExportStatement(file, basePath))
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

/**
 * Gets the default barrel name from a folder path
 */
function getDefaultBarrelName(folderPath: string): string {
  const folderName = path.basename(folderPath);
  return toSnakeCase(folderName);
}

export function deactivate() {}
