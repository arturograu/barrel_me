# Change Log

All notable changes to the "Barrel Me" extension will be documented in this file.

## [0.2.0]

### Changed

- **Recursive mode is now enabled by default**
  - Hierarchical barrel generation is now the default behavior
  - Creates deep nested barrel structures automatically
  - Better developer experience for complex projects
  - Can be disabled by setting `barrelMe.recursive: false` for flat mode

### Why this change?

The recursive/hierarchical mode is now mature and powerful enough to be the default:

- Deep recursion handles any nesting level
- Smart conflict resolution prevents data loss
- Single-file optimization avoids unnecessary barrels
- Part file detection works seamlessly
- Import migration makes adoption effortless

For simpler use cases, non-recursive mode is still available via settings.

## [0.1.0]

### Added

- **Deep Recursion**: True infinite-depth recursion for nested barrel creation

  - Processes all subdirectory levels, not just immediate children
  - Creates hierarchical barrel structure at any depth
  - Perfect for complex folder structures with multiple nesting levels

- **Import Migration System**: Automatic import migration to barrel files

  - Post-creation prompt to migrate existing imports
  - Scans entire workspace for imports from barrel folder
  - Replaces multiple imports with single barrel import
  - Summary report showing migrated files and import counts

- **Package Import Support**: Full support for `package:` imports

  - Detects and reads package name from `pubspec.yaml`
  - Handles both relative and package imports
  - Converts `package:your_app/path/to/file.dart` to `package:your_app/path/barrel.dart`
  - Preserves import style (package vs relative) based on original usage

- **Automatic Barrel Naming**: Removed manual naming step

  - Automatically uses folder name as barrel name
  - Converts folder names to snake_case following Dart conventions
  - Zero friction workflow, just right-click and create

- **Part File Detection**: Smart handling of Dart part files

  - Automatically detects `part of` directives
  - Excludes part files from barrel exports
  - Only exports main files (e.g., includes `user.dart`, excludes `user.g.dart`, `user.freezed.dart`)
  - Works with json_serializable, freezed, and custom part files

- **Conflict Resolution**: Smart barrel file naming

  - Detects when a file has the same name as its folder
  - Creates `{folder}_barrel.dart` instead of overwriting existing code
  - Prevents data loss from name conflicts

- **Single-File Optimization**: Skip unnecessary barrels
  - Subfolders with only one main file don't get a barrel
  - Single file is exported directly in parent barrel
  - Cleaner structure with fewer unnecessary files

### Fixed

- Recursive mode now processes all nesting levels (was limited to 1 level)
- Import migration now handles package imports from same project
- Better path resolution for complex project structures

## [0.0.1]

### Added

- Initial release of Barrel Me extension
- Context menu command "Create Barrel" for folders
- Interactive input box for barrel file naming
- Automatic scanning of `.dart` files in selected folder
- Exclusion of `main.dart` and existing barrel files
- Smart detection of barrel files (files containing only exports)
- Configurable settings:
  - `barrelMe.exclude`: Folders to exclude (default: test, generated)
  - `barrelMe.recursive`: Include subfolders (default: false)
  - `barrelMe.excludeFiles`: Files to exclude (default: main.dart)
- Dart naming convention validation for file names
- Success notification with emoji
- Automatic opening of created barrel file
- Overwrite confirmation for existing files
- Alphabetically sorted exports
- Support for nested folder structure in exports
