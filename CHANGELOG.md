## 1.2.0
- Redesigned UI: new header and tabs, card-based layout, consistent buttons, badges and switches.
- Errors are now shown as notifications instead of failing silently; successes are confirmed too.
- Uninstalling RedLoader, old loaders or mods now asks for confirmation and explains what gets removed.
- Loader tab shows the installed and latest RedLoader version and offers a reinstall.
- The game path you choose is remembered, and picking the wrong exe shows an error.
- Mods: smoother infinite scroll, no stale results when typing quickly, empty/error states with retry.
- Mods: installing or removing a mod keeps your place in the list.
- Mods: updates are detected by version (an installed newer version is no longer flagged as an update).
- Mods: installed list matches mods by id, handles missing Mods/Libs folders and offline mods.
- Mods: dependencies are installed automatically without a popup for each one.
- Mods: installing now places files in Mods/Libs correctly no matter how the mod zip is laid out.
- Mods: mods sitting in the wrong folder are detected and can be moved into place with one click.
- Mod Creation: fixed the template check never detecting the installed template.
- Mod Creation: validates the mod name, handles cancelling the folder picker and reports dotnet errors.
- Mod Creation: supports both `dotnet new install` and the older `--install` syntax.
- Better .NET 6 and Steam install detection.
- Extraction is protected against archive entries that point outside the game folder.
- Updated to Tauri 1.8, Vite 5 and the latest Svelte 4.

## 1.1.9
- Added infinite scroll instead of pre-fetching all mods.
- Use sotf-mods api for searching with debounce.
- Added icons for navigation bar.
- UI overhaul.
- Fixed last updated indicator.
- Fixed image covers not showing.
- Fixed wrong image covers for mods after searching.
