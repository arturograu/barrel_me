# Change Log

All notable changes to the "Barrel Me" extension will be documented in this file.

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
