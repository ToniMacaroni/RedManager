# RedManager — Sons Of The Forest mod manager (fork)

<p align="center">
    <a alt="total downloads">
        <img src="https://img.shields.io/github/downloads/Za-Pa-Al/RedManager/latest/total" /></a>
    <a href="https://github.com/Za-Pa-Al/RedManager/releases" alt="latest version">
      <img src="https://img.shields.io/github/v/release/Za-Pa-Al/RedManager?label=version" />
    </a>
</p>

---

The RedManager is a general tool for installing/uninstalling/updating different features of the [RedLoader](https://github.com/ToniMacaroni/RedLoader) ecosystem as well as general Sons of the Forest modding features.

**:arrow_forward:[Original RedManager from ToniMacaroni](https://github.com/ToniMacaroni/RedManager):arrow_backward:**  
# Installation
Download <code>RedModManager.exe</code> from [Releases](https://github.com/Za-Pa-Al/RedManager/releases) and place the <code>.exe</code> in a folder OTHER then directly in <code>Sons Of The Forest\\</code>.<br>
For example you can safely place <code>RedModManager.exe</code> in <code>Sons Of The Forest\RedModManager\\</code>.<br>

> **⚠️ IMPORTANT:** If placed in the same folder as <code>Sons Of The Forest\\SonsOfTheForest.exe</code> and subsequently in the same folder as <code>Sons Of The Forest\\_Redloader</code>, the <code>.dlls</code> in <code>Sons Of The Forest\\_Redloader</code> will likely cause a startup crash due to .NET conflicts.

# Summary of Changes

## Overview

Enhancements to the RedModManager Tauri/Svelte application.

**User-Facing Improvements**

- **Visual Status System**: Immediate mod status recognition through color coding
- **Responsive Layout**: Optimal card display across all window sizes
- **Fast Image Loading**: Cached thumbnails with optimization
- **Window Memory**: Application remembers user's preferred size/position
- **Unknown Mods**: Unknown Mods are display in different color
- **Mod Urls**: Mod Urls are also displayed

## Technical

**Key Changes by Category**

**🏗️ Backend Infrastructure (Rust/Tauri)**

**Files Modified:**

- [Cargo.toml](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Added window state persistence plugin
- [main.rs](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Major expansion with image caching system
- [tauri.conf.json](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Window configuration and security updates

**Major Features Added:**

- **Window State Persistence**: Integrated [tauri-plugin-window-state v0.1](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) for remembering user window size/position
- **Advanced Image Caching System**: Comprehensive image optimization and caching with:
  - Smart server change detection (ETag/Last-Modified headers)
  - Automatic image optimization (WebP conversion, thumbnail generation)
  - 24-hour cache expiration with graceful fallbacks
  - Memory and disk cache management
- **Updated Window Configuration**: 1400x900 default size, 600px minimum width

**🎨 Frontend UI/UX Enhancements (Svelte)**

**Files Modified:**

- [ModCard.svelte](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Complete redesign with conditional styling
- [StatusButton.svelte](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Color-coded button system
- [Mods.svelte](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Grid layout optimization and search improvements
- [App.svelte](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - TypeScript improvements

**Major Features Added:**

- **Responsive Grid System**: Auto-fit layout with 420px minimum columns, preventing card overlap
- **Color-Coded Status Indicators**:
  - Install/Update buttons: Blue background (#0f1e2e)
  - Uninstall buttons: Red background (#2d0a0a)
  - Card backgrounds: Green for enabled mods, red for disabled
- **Optimized Image Display**: 220x120px forced dimensions with proper container overflow handling
- **Enhanced Search Interface**: Aligned with grid padding, improved button groups

**📦 Development Infrastructure**

**Files Added:**

- [launch.json](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Tauri development configuration
- [tasks.json](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Build and cleanup tasks
- [cleanup.bat](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) & [cleanup.ps1](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Process cleanup scripts
- [imageCache.ts](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Frontend image cache management
- [CacheDebugPanel.svelte](vscode-file://vscode-app/c:/Users/Alex/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - Development debugging tools

**Features Added:**

- **Automated Development Workflow**: VS Code tasks for building, running, and cleanup
- **Process Management**: Smart cleanup scripts for development server conflicts
- **Debug Tools**: Cache debugging panel with memory usage statistics

**🔧 Performance & Stability**

**Key Improvements:**

- **Grid Position Stability**: Unique keys (mod.mod_id) prevent position shifting during operations
- **Optimized Refresh Logic**: Proper mod status synchronization with initModList() calls
- **Memory Management**: Intelligent image caching with size limits and automatic cleanup
- **Network Optimization**: Progressive image loading and preloading for better UX

**Project Layout**

```mermaid
graph LR
A["RedManager - Tauri/Svelte App"]:::main
A --> B["Frontend - Svelte (.svelte, .ts)"]:::frontend
A --> C["Backend - Rust/Tauri (.rs, .toml)"]:::backend
A --> D["Build/Distribution"]:::build

B --> B1["src/App.svelte"]:::frontendLeaf
B --> B2["src/pages/MainPage.svelte"]:::frontendLeaf
B --> B3["src/pages/Mods.svelte"]:::frontendLeaf
B --> B4["src/lib/ModCard.svelte"]:::frontendLeaf
B --> B5["src/lib/StatusButton.svelte"]:::frontendLeaf
B --> B6["src/lib/imageCache.ts"]:::tsLeaf

C --> C1["src-tauri/src/main.rs"]:::backendLeaf
C --> C2["src-tauri/Cargo.toml"]:::tomlLeaf
C --> C3["src-tauri/tauri.conf.json"]:::tomlLeaf

D --> D1["src-tauri/target/release/RedModManager.exe"]:::buildLeaf
D --> D2["src-tauri/target/release/bundle/"]:::buildLeaf

desc1[".svelte: Svelte UI components (Frontend, HTML/CSS/JS)"]:::desc
desc2[".ts: TypeScript logic (Frontend, JS/TS)"]:::desc
desc3[".rs: Rust backend code (Backend, Rust)"]:::desc
desc4[".toml/.json: Project configuration (Backend, TOML/JSON)"]:::desc
desc5[".exe/.bundle: Distributable files (Binary/Installer)"]:::desc

B1 -.-> desc1
B2 -.-> desc1
B3 -.-> desc1
B4 -.-> desc1
B5 -.-> desc1
B6 -.-> desc2
C1 -.-> desc3
C2 -.-> desc4
C3 -.-> desc4
D1 -.-> desc5
D2 -.-> desc5

classDef main fill:#fff,stroke:#222,stroke-width:2px,color:#222;
classDef frontend fill:#e0f7fa,stroke:#222,stroke-width:2px,color:#222;
classDef frontendLeaf fill:#b2ebf2,stroke:#222,stroke-width:2px,color:#222;
classDef tsLeaf fill:#80deea,stroke:#222,stroke-width:2px,color:#222;
classDef backend fill:#e8eaf6,stroke:#222,stroke-width:2px,color:#222;
classDef backendLeaf fill:#c5cae9,stroke:#222,stroke-width:2px,color:#222;
classDef tomlLeaf fill:#b3b3e6,stroke:#222,stroke-width:2px,color:#222;
classDef build fill:#ffe0b2,stroke:#222,stroke-width:2px,color:#222;
classDef buildLeaf fill:#ffcc80,stroke:#222,stroke-width:2px,color:#222;
classDef desc fill:#fffde7,stroke:#222,stroke-width:1px,color:#222;
class A main;
class B frontend;
class C backend;
class D build;
class B1,B2,B3,B4,B5 frontendLeaf;
class B6 tsLeaf;
class C1 backendLeaf;
class C2,C3 tomlLeaf;
class D1,D2 buildLeaf;
class desc1,desc2,desc3,desc4,desc5 desc;
