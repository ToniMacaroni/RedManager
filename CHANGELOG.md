## v1.2.1 - 2025-10-17

- Align package and app versions (frontend `package.json` and `src-tauri/Cargo.toml`).
- Improve image caching: load from cache immediately and perform throttled background checks with limited concurrency.

### v1.2.0 - 2025-10-16

- UI and window layout improvements, including color-coding for mod states (enabled/disabled/unknown).
- Image caching rework: immediate cache load, background validation (throttled) and optimized WebP storage.
- Lazy-loading of images and improved SOTF API integration for more reliable search results.
- Documentation and README updates (project layout diagram, badges).
- Misc fixes and versioning adjustments to address .NET compatibility issues.

### <= v1.1.9 - 2025-02-10

- Added infinite scroll instead of pre-fetching all mods.
- Use sotf-mods api for searching with debounce.
- Added icons for navigation bar.
- UI overhaul.
- Fixed last updated indicator.
- Fixed image covers not showing.
- Fixed wrong image covers for mods after searching.

