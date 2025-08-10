# CDriveCleaner (.NET 9 + WPF)

A modern C: drive cleaner for Windows built with .NET 9 and WPF.

## Features (planned)
- Safe cleanup: Temp folders, Recycle Bin, browser caches, logs, Windows Update cache, thumbnail cache
- Analysis first, then one-click cleanup
- Optional advanced tools: duplicate files, large files, disk usage

## Build & Run
- Requires Windows 10/11 with .NET SDK 9.0+
- Open `CDriveCleaner.sln` in Visual Studio 2022 (17.10+) or run from terminal:
  ```powershell
  dotnet restore
  dotnet build
  dotnet run --project .\CDriveCleaner.App
  ```

Note: This repository can be created on non-Windows hosts, but WPF apps can only be built/run on Windows.

## Elevation
The app requests administrator privileges via `app.manifest` for operations like clearing Windows Update cache.

## Projects
- `CDriveCleaner.App`: WPF UI
- `CDriveCleaner.Core`: Cleaning & analysis logic
- `CDriveCleaner.Tests`: Unit tests