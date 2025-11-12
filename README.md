# Barrel Me 🛢️

A Visual Studio Code extension for Dart and Flutter projects that makes creating barrel files effortless.

## Features

✨ **Easy Barrel File Generation**: Right-click on any folder to create a barrel file with all Dart exports.

🏗️ **Hierarchical Barrel Generation**: Optionally create barrel files in each subfolder, with the parent exporting subfolder barrels for better organization.

🎨 **Intuitive UX**: Inspired by the Flutter Bloc extension, providing a familiar and smooth experience.

⚙️ **Customizable**: Configure which folders and files to exclude from barrel generation.

🔄 **Smart Detection**: Automatically excludes existing barrel files and main.dart.

🚀 **Quick Creation**: Press Enter without typing to automatically use the folder name as the barrel name.

## Usage

### Creating a Barrel File

1. **Right-click** on a folder in your Dart or Flutter project
2. Select **"Create Barrel"** from the context menu
3. Enter a name for your barrel file (e.g., `auth`, `models`) or press Enter to use the folder name
4. The barrel file(s) will be created automatically

The extension will:

- Scan the selected folder for `.dart` files
- Exclude `main.dart` and existing barrel files
- Generate barrel file(s) with all necessary exports:
  - **Non-recursive mode** (default): Single barrel file exporting only files in the current directory (subdirectories ignored)
  - **Recursive mode**: Hierarchical barrels in each subfolder + parent barrel that exports the subfolder barrels
- Open the barrel file for you to review

### Example

If you have the following structure:

```
lib/features/auth/
  ├── login_page.dart
  ├── signup_page.dart
  ├── widgets/
  │   ├── auth_button.dart
  │   └── auth_form.dart
  └── models/
      └── user.dart
```

### Non-Recursive Mode (default)

Right-click on `auth/` → "Create Barrel" → Press Enter (or type `auth`):

```dart
export 'login_page.dart';
export 'signup_page.dart';
```

This creates a single barrel file (`auth.dart`) that exports **only the Dart files in the current directory** - subdirectories are ignored.

> **💡 Tip:** Just press Enter to automatically use the folder name (`auth`) as the barrel filename!

### Recursive Mode (when enabled in settings)

With `barrelMe.recursive: true`, right-click on `auth/` → "Create Barrel" → Press Enter:

This creates **hierarchical barrel files**:

**`auth/models/models.dart`:**

```dart
export 'user.dart';
```

**`auth/widgets/widgets.dart`:**

```dart
export 'auth_button.dart';
export 'auth_form.dart';
```

**`auth/auth.dart`:**

```dart
export 'login_page.dart';
export 'models/models.dart';
export 'signup_page.dart';
export 'widgets/widgets.dart';
```

This hierarchical approach:

- ✅ Creates a barrel file in each subfolder
- ✅ Parent barrel exports subfolder barrels (not individual files)
- ✅ Better organization for large codebases
- ✅ Each module can be imported independently

### Automatic Naming

When you press Enter without typing a name, the extension automatically converts the folder name to follow Dart naming conventions (snake_case):

| Folder Name     | Generated Barrel     |
| --------------- | -------------------- |
| `auth`          | `auth.dart`          |
| `AuthPages`     | `auth_pages.dart`    |
| `user-profile`  | `user_profile.dart`  |
| `shopping_cart` | `shopping_cart.dart` |

You can always override this by typing a custom name before pressing Enter.

## Configuration

You can customize the extension behavior in your VS Code settings:

### `barrelMe.exclude`

Folders to exclude when scanning for Dart files.

**Default:**

```json
["test", "generated"]
```

**Example:**

```json
"barrelMe.exclude": ["test", "generated", ".dart_tool", "build"]
```

### `barrelMe.recursive`

Enable hierarchical barrel file generation. When enabled:

- Creates a barrel file in each immediate subfolder
- Creates a parent barrel that exports the subfolder barrels
- Each subfolder's barrel exports files only within that subfolder

**Default:** `false`

**Example:**

```json
"barrelMe.recursive": true
```

### `barrelMe.excludeFiles`

Files to exclude from barrel exports.

**Default:**

```json
["main.dart"]
```

**Example:**

```json
"barrelMe.excludeFiles": ["main.dart", "app.dart"]
```

## Command Palette

You can also access the barrel creation command from the Command Palette:

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Create Barrel"
3. Press Enter

> **Note:** When using the Command Palette, you'll need to right-click on a folder first.

## Requirements

- Visual Studio Code version 1.80.0 or higher
- Dart or Flutter project

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux)
3. Search for "Barrel Me"
4. Click Install

### From VSIX

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view
4. Click on the "..." menu
5. Select "Install from VSIX..."
6. Choose the downloaded file

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/barrel-me.git
cd barrel-me

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch
```

### Running the Extension

1. Press `F5` in VS Code to open a new Extension Development Host window
2. Open a Dart or Flutter project
3. Right-click on a folder and select "Create Barrel"

### Building

```bash
# Compile and package
npm run vscode:prepublish
vsce package
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Issues

If you encounter any problems or have suggestions, please file an issue on the [GitHub repository](https://github.com/yourusername/barrel-me/issues).

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### 0.0.1 (Initial Release)

- ✨ Create barrel files from context menu
- ⚙️ Configurable exclude folders and files
- 🔄 Optional recursive scanning
- 🎨 Smart barrel file detection
- ✅ Dart naming convention validation

## Acknowledgments

Inspired by the [Flutter Bloc Extension](https://marketplace.visualstudio.com/items?itemName=FelixAngelov.bloc) by Felix Angelov.

---

**Enjoy creating barrel files! 🎯**
