<script lang="ts">
  import { processProgress, processing } from './store';
  import { InstallMode, type FeatureInstaller } from "./featureInstaller";
    import { GithubInfo, redLoaderInfo } from './githubInfo';
    import { onMount } from 'svelte';
    import { ModDatabase, type Mod, type InstalledMod } from './mods';
    import StatusButton from './StatusButton.svelte';
    import { downloadAndInstall } from './utils';

    export let mod: Mod;
    export let isGrid: boolean = false;

    let isLibrary = false;

    onMount(async () => {
      isLibrary = mod.type == "Library";
    });

    async function updateStatus() {

    }

    async function update() {

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
    }

    async function install() {
      processing.set(true);
      processProgress.set(0);

      await ModDatabase.installMod(mod);
      await refresh();

      processing.set(false);
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
</script>

<div class="feature-container description">
  <span class="mod-title">{mod.name} (<a on:click={() => ModDatabase.openModPage(mod)} class="site-link">view on site</a>)</span>
  <span class="description-content header-desc">{mod.short_description}</span>
  <div class="mod-card-horizontal">
    <img class="cover-img" src="{mod.thumbnail_url}" />
    <div class="vertical">
      {#if mod.isInstalled && !isLibrary && !isGrid}
        {#if mod.installedMod?.isEnabled}
          <button class="toggle-button install" on:click={disableMod}>Enabled</button>
        {:else}
          <button class="toggle-button uninstall" on:click={enableMod}>Disabled</button>
        {/if}
      {/if}
      <span class="description-content">Author: <b class="update">{mod.user_name}</b></span>
      <span class="description-content">Version: <b class="update">{mod.latest_version}</b></span>
      <span class="description-content">Updated: <b class="update">{mod.time_ago}</b></span>
      <span class="description-content">Category: <b class="update">{mod.category_name}</b></span>
    </div>
  </div>

  {#if mod.isInstalled && !isLibrary && isGrid}
    {#if mod.installedMod?.isEnabled}
      <button class="toggle-button grid-toggle-button install" on:click={disableMod}>Enabled</button>
    {:else}
      <button class="toggle-button grid-toggle-button uninstall" on:click={enableMod}>Disabled</button>
    {/if}
  {/if}

  <div class="bottom-container">
    <StatusButton isUpdateAvailable={false} isModInstalled={mod.isInstalled} update={update} uninstall={uninstall} install={install} />
  </div>
</div>

<style>
  .mod-card-horizontal {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .vertical {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-left: 0.7em;
  }
  
  .mod-card-horizontal > * {
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
  }

  .header-desc {
    height: 3em;
  }

  .description {
    padding: 10px;
    /* border-radius: 10px; */
    /* border: 2px solid #414141; */
    border-bottom: 2px solid #414141;
    margin-bottom: 20px;
    margin-right: 0.4em;
  }

  .description-content {
    display: block;
    text-align: left;
    font-size: 0.9em;
    color: #767676;
    margin-bottom: 1em;
  }

  .description-content > b {
    font-weight: 500;
  }

  .mod-title {
    margin-top: 0.2em;
    display: block;
    font-size: 1.2em;
    font-weight: bold;
    color: #a2a2a2;
    text-align: left;
  }

  .site-link {
    cursor: pointer;
    font-weight: 700;
    font-size: 0.65em;
    text-transform: lowercase;
  }

  .cover-img {
    width: 10px;
    height: auto;
    border-radius: 10px;
    margin-bottom: 1em;
  }

  .grid-toggle-button {
    position: absolute;
    bottom: 1.4em;
    left: 1em;
  }

  .toggle-button {
    padding: 0;
    height: 2em;
    width: 7em;
    font-size: 0.9em;
    font-weight: 400;
    background-color: rgb(25, 25, 25);
    align-self: flex-start;
  }
</style>