<script lang="ts">
  import { processProgress, processing } from './store';
  import { InstallMode, type FeatureInstaller } from "./featureInstaller";
    import { GithubInfo, redLoaderInfo } from './githubInfo';
    import { onMount, createEventDispatcher } from 'svelte';
    import { ModDatabase, type Mod, type InstalledMod } from './mods';
    import StatusButton from './StatusButton.svelte';
    import { downloadAndInstall } from './utils';
    import ImageCache from './imageCache';

    export let mod: Mod;
    export let isGrid: boolean = false;

    let isLibrary = false;
    let isImageLoaded = false;
    let cachedImageUrl = '';

    const dispatch = createEventDispatcher();

    onMount(async () => {
      isLibrary = mod.type == "Library";
      
      // Load cached image
      if (mod.imageUrl) {
        try {
          cachedImageUrl = await ImageCache.getCachedImageUrl(mod.imageUrl);
        } catch (error) {
          // Use fallback image
          cachedImageUrl = "https://placehold.co/300x200/252525/FFF?text=No+Image";
        }
      } else {
        cachedImageUrl = "https://placehold.co/300x200/252525/FFF?text=No+Image";
      }
    });

    async function update() {
      if (!mod.installedMod) {
        return;
      }
      await uninstall();
      await install();

      dispatch("refreshMods");
    }

    async function uninstall() {

      if (!mod.installedMod) {
        return;
      }

      processing.set(true);
      processProgress.set(0);

      await ModDatabase.uninstallMod(mod.installedMod);
      await refresh();

      processing.set(false);

      dispatch("refreshMods");
    }

    async function install() {
      processing.set(true);
      processProgress.set(0);

      await ModDatabase.installMod(mod);
      await refresh();

      processing.set(false);

      dispatch("refreshMods");
    }

    async function enableMod() {
      if (!mod.installedMod) {
        return;
      }

      await ModDatabase.toggleMod(mod.installedMod, true);
      await refresh();
    }

    async function disableMod() {
      if (!mod.installedMod) {
        return;
      }

      await ModDatabase.toggleMod(mod.installedMod, false);
      await refresh();
    }

    async function refresh() {
      mod = mod;
      if(mod)
      {
        isLibrary = mod.type == "Library";
      }
      //installedMod = ModDatabase.getInstalledMod(mod.mod_id);
      //isModInstalled = installedMod !== undefined;

      //isUpdateAvailable = false;
    }

    function formatDate(dateString: string) {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };
    
    function onImageLoad() {
      isImageLoaded = true;
    }
</script>

<div class="mod-card-wrapper" 
     class:installed-enabled={mod.isInstalled && mod.installedMod?.isEnabled && !mod.isUnknownSource}
     class:installed-disabled={mod.isInstalled && !mod.installedMod?.isEnabled && !mod.isUnknownSource}
     class:unknown-source-enabled={mod.isUnknownSource && mod.isInstalled && mod.installedMod?.isEnabled}
     class:unknown-source-disabled={mod.isUnknownSource && mod.isInstalled && !mod.installedMod?.isEnabled}>
  <div class="feature-container description {isGrid?'grid-thing':''}">
    <div class="mod-title-section">
      <span class="mod-title">{mod.name}</span>
      <div class="link-buttons">
        {#if !mod.isUnknownSource}
          <button type="button" on:click={() => ModDatabase.openModPage(mod)} class="site-link" title="https://sotf-mods.com/mods/{mod.user.slug}/{mod.slug}">view on sotf-mods</button>
        {/if}
        {#if ModDatabase.hasModUrl(mod)}
          <button type="button" on:click={() => ModDatabase.openModUrl(mod)} class="site-link" title={mod.installedMod?.manifest?.url || ''}>view mod url</button>
        {/if}
      </div>
    </div>
    <span class="description-content header-desc">{mod.shortDescription?mod.shortDescription:""}</span>
    <div class="mod-card-horizontal">
      <!-- <img class="cover-img" src="{mod.imageUrl?mod.imageUrl:"https://placehold.co/600x400/252525/FFF?text=No+Image"}" /> -->
      <div class="image-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        {#if mod.isUnknownSource}
          <img
            class="cover-img"
            src="https://placehold.co/600x400/000000/FFF?text=Unknown+Source"
            alt="Unknown source mod"
            title="Unknown Source"
          />
        {:else}
          <img
            class="cover-img clickable-image"
            src={cachedImageUrl || "https://placehold.co/600x400/252525/FFF?text=Loading..."}
            alt="Mod cover for {mod.name}"
            on:load={onImageLoad}
            on:click={() => ModDatabase.openModPage(mod)}
            title="Click to view on sotf-mods"
          />
        {/if}
      </div>
      <div class="vertical">
        <span class="description-content">Author: <b class="update">{mod.user.name}</b></span>
        <span class="description-content">Version: <b class="update">{mod.latestVersion}</b></span>
        <span class="description-content">Updated: <b class="update">{mod.lastReleasedAt?formatDate(mod.lastReleasedAt):"-"}</b></span>
        <span class="description-content">Category: <b class="update">{mod.category?mod.category.name:"-"}</b></span>
        
        <!-- Always show status section for spacing, but without "Status:" label -->
        <div class="enable-toggle-container">
          {#if mod.isInstalled && !isLibrary}
            <label class="toggle-switch">
              <input
                type="checkbox"
                checked={mod.installedMod?.isEnabled}
                on:change={(e) => {
                  // @ts-ignore
                  if (e.target?.checked) {
                    enableMod();
                  } else {
                    disableMod();
                  }
                }}
              />
              <span class="toggle-slider"></span>
              <span class="toggle-text">{mod.installedMod?.isEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          {:else}
            <span class="status-placeholder" class:installed={mod.isInstalled}>{mod.isInstalled ? 'Installed' : ''}</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Move button INSIDE the main card container -->
    <div class="button-section">
      <StatusButton isUpdateAvailable={mod.hasUpdate} isModInstalled={mod.isInstalled} update={update} uninstall={uninstall} install={install} />
    </div>
  </div>
</div>

<style>
  /* Wrapper for the entire mod card + button */
  .mod-card-wrapper {
    width: 100%;
    max-width: none; /* Remove fixed constraint for flexibility */
    min-width: 420px; /* Match grid minimum to prevent overlap */
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 0 16px; /* Add horizontal padding to fill the grid column */
  }

  .mod-card-horizontal {
    display: flex;
    flex-direction: row;
    align-items: flex-start; /* Changed from center to flex-start for top alignment */
    overflow: visible; /* Ensure no clipping of content */
    min-height: 120px; /* Ensure enough height for the image */
  }

  .vertical {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-left: 10px; /* Match the main card padding exactly */
  }
  
  .mod-card-horizontal > .vertical {
    /* margin-right: 1em; */
    flex: 1;
  }

  .feature-container > * {
    width: 100%;
  }

  .feature-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    min-height: 280px;
    max-height: none;
    width: 100%;
    max-width: none; /* Remove fixed constraint */
    border: 1px solid transparent;
  }

  .header-desc {
    height: 72px; /* Increased height for 3 lines: 3 * 19px line-height + some spacing */
    overflow: hidden; /* Hide overflow text */
    line-height: 19px; /* 1.2em = 19px at 16px base */
    display: -webkit-box;
    -webkit-line-clamp: 3; /* Changed to 3 lines */
    line-clamp: 3; /* Standard property for compatibility */
    -webkit-box-orient: vertical;
  }

  .description {
    padding: 10px;
    /* border-radius: 10px; */
    /* border: 2px solid #414141; */
    /* border-bottom: 2px solid #414141; */

    border-radius: 10px; /* Full border radius for complete card */
    border: 2px solid #333; /* Complete border around entire card */
    background-color: #121212;

    margin-bottom: 20px;
    /* Removed asymmetric margin-right for better button centering */
  }

  .description-content {
    display: block;
    text-align: left;
    font-size: 14px; /* 0.9em = 14px at 16px base */
    color: #767676;
    margin-bottom: 8px; /* 0.5em = 8px at 16px base */
  }

  .description-content > b {
    font-weight: 500;
  }

  .mod-title {
    margin-top: 3px; /* 0.2em = 3px at 16px base */
    display: block;
    font-size: 19px; /* 1.2em = 19px at 16px base */
    font-weight: bold;
    color: #a2a2a2;
    text-align: left;
  }

  .mod-title-section {
    display: flex;
    flex-direction: column;
    gap: 5px; /* 0.3em = 5px at 16px base */
    margin-bottom: 8px; /* 0.5em = 8px at 16px base */
  }

  .site-link {
    cursor: pointer;
    font-weight: 700;
    font-size: 10px; /* 0.65em = 10px at 16px base */
    text-transform: lowercase;
    background: none;
    border: none;
    color: #24c8db; /* Blue link color by default */
    padding: 0;
    text-decoration: underline;
    align-self: flex-start;
  }

  .site-link:hover {
    color: #1ea3b3; /* Darker blue on hover */
  }

  .site-link:visited {
    color: #8e44ad; /* Purple for visited links */
  }

  .grid-thing {
    /* Grid-specific styling now applied to the feature-container within wrapper */
    height: auto;
    min-height: 280px;
    max-height: none;
    overflow: visible;
  }

  .image-container {
    position: relative;
    width: 220px; /* Restored proper width for card spacing */
    height: 120px; /* Keep landscape height - 11:6 ratio */
    margin: 0 auto 16px auto; /* Center the image container horizontally */
    background-color: #1e1e1e;
    border-radius: 8px;
    overflow: visible; /* Allow full image visibility */
    flex-shrink: 0; /* Prevent container from shrinking */
    flex-grow: 0; /* Prevent container from growing */
    flex-basis: auto; /* Use natural size */
  }
  
  .cover-img {
    width: 220px !important; /* FORCED landscape width - restored */
    height: 120px !important; /* FORCED landscape height */
    min-width: 220px !important; /* FORCE minimum width */
    max-width: 220px !important; /* FORCE maximum width */
    min-height: 120px !important; /* FORCE minimum height */
    max-height: 120px !important; /* FORCE maximum height */
    border-radius: 8px;
    display: block !important;
    transition: opacity 0.3s ease-in-out;
    object-fit: cover !important; /* FORCE cover fit */
    object-position: center !important; /* FORCE center position */
    flex-shrink: 0 !important; /* PREVENT shrinking */
    flex-grow: 0 !important; /* PREVENT growing */
    box-sizing: border-box !important; /* FORCE box sizing */
  }

  /* Even more specific selector to override any global styles */
  .mod-card-wrapper .image-container .cover-img {
    width: 220px !important;
    height: 120px !important;
    min-width: 220px !important;
    max-width: 220px !important;
    min-height: 120px !important;
    max-height: 120px !important;
  }

  /* Enable/Disable Toggle Styles */
  .enable-toggle-container {
    display: flex;
    align-items: center;
    gap: 8px; /* 0.5em = 8px at 16px base */
    margin-top: 8px; /* 0.5em = 8px at 16px base */
    margin-bottom: 8px; /* 0.5em = 8px at 16px base */
    min-height: 24px; /* Ensure consistent height even when empty */
  }

  .toggle-switch {
    display: flex;
    align-items: center;
    gap: 8px; /* 0.5em = 8px at 16px base */
    cursor: pointer;
    user-select: none;
  }

  .toggle-switch input[type="checkbox"] {
    display: none;
  }

  .toggle-slider {
    position: relative;
    width: 40px;
    height: 20px;
    background-color: #333;
    border-radius: 20px;
    transition: background-color 0.3s ease;
    border: 1px solid #555;
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background-color: #666;
    border-radius: 50%;
    transition: transform 0.3s ease, background-color 0.3s ease;
  }

  .toggle-switch input[type="checkbox"]:checked + .toggle-slider {
    background-color: #28a745; /* Green for enabled */
    border-color: #28a745;
  }

  .toggle-switch input[type="checkbox"]:checked + .toggle-slider::before {
    transform: translateX(20px);
    background-color: #fff;
  }

  .toggle-slider {
    position: relative;
    width: 40px;
    height: 20px;
    background-color: #dc3545; /* Red for disabled */
    border-radius: 20px;
    transition: background-color 0.3s ease;
    border: 1px solid #dc3545;
  }

  .toggle-text {
    font-size: 14px; /* 0.85em = 14px at 16px base */
    color: #dc3545; /* Red for disabled */
    font-weight: 500;
    min-width: 60px;
  }

  .toggle-switch input[type="checkbox"]:checked ~ .toggle-text {
    color: #28a745; /* Green for enabled */
  }

  /* Status placeholder styling */
  .status-placeholder {
    font-size: 14px; /* 0.85em = 14px at 16px base */
    font-weight: 500;
    min-width: 60px;
    color: #767676; /* Default gray color for consistency */
  }

  /* Only make it green when actually showing "Installed" */
  .status-placeholder.installed {
    color: #28a745; /* Green for installed */
  }

  /* Clickable image styling */
  .clickable-image {
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .clickable-image:hover {
    opacity: 0.8;
  }

  /* Button container - directly attached to mod card */
  .button-section {
    padding: 15px 10px 10px 10px; /* Increased top padding to 15px to make difference more visible */
    border-top: 1px solid #333; /* Subtle separator line */
    background-color: #121212; /* Match card background */
    margin: 0; /* No margin - use only padding for spacing */
    width: 100%; /* Ensure full width */
    box-sizing: border-box; /* Include padding in width calculation */
  }

  /* Card background colors based on installation status */
  /* Apply background to feature-container instead of wrapper to avoid padding overflow */
  .installed-enabled .feature-container {
    background-color: #0d2b1a !important; /* Very dark green for installed and enabled mods */
  }

  .installed-disabled .feature-container {
    background-color: #2b0d0d !important; /* Very dark red for installed but disabled mods */
  }

  /* Button section should also inherit the background */
  .installed-enabled .button-section {
    background-color: #0d2b1a !important;
  }

  .installed-disabled .button-section {
    background-color: #2b0d0d !important;
  }

  /* Unknown source styling - enabled (dark yellow + dark green mix) */
  .unknown-source-enabled .feature-container {
    background-color: #1f2410 !important; /* Mix of dark yellow (#2b2410) and dark green (#0d2b1a) */
  }

  .unknown-source-enabled .button-section {
    background-color: #1f2410 !important;
  }

  /* Unknown source styling - disabled (dark yellow + dark red mix) */
  .unknown-source-disabled .feature-container {
    background-color: #2b180d !important; /* Mix of dark yellow (#2b2410) and dark red (#2b0d0d) */
  }

  .unknown-source-disabled .button-section {
    background-color: #2b180d !important;
  }

  /* Link buttons container */
  .link-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    min-height: 16px; /* Reserve space for at least one line of links */
    align-items: flex-start;
    justify-content: flex-start; /* Ensure links start from the left */
  }
</style>