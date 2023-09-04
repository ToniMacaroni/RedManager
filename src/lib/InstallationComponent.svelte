<script lang="ts">
  import { processProgress, processing } from './store';
  import { InstallMode, type FeatureInstaller } from "./featureInstaller";
    import { GithubInfo, redLoaderInfo } from './githubInfo';
    import { onMount } from 'svelte';

  export let feature: FeatureInstaller;

  $: currentMode = feature.currentModeState;
  $: currentClass = currentMode.toLowerCase();
  $: shouldBeVisible = false;
  $: description = feature.description;

  $: featureLabel = feature.getName();
  $: loading = true;

  async function handleWrapper(callback: () => Promise<void>) {
    processing.set(true);
    processProgress.set(0);

    await callback();

    processing.set(false);

    currentMode = feature.currentModeState;
    await refreshVisibility();
  }

  async function handleDefault() {
    await handleWrapper(async () => {
      await feature.handleCurrentMode();
    });
  }  

  async function handleUpdate() {
    await handleWrapper(async () => {
      await feature.handle(InstallMode.Update);
    });
  }

  async function handleUninstall() {
    await handleWrapper(async () => {
      await feature.handle(InstallMode.Uninstall);
    });
  }

  onMount( async () => {
    await feature.refreshMode();
    currentMode = feature.currentModeState;
    featureLabel = feature.getName();
    await refreshVisibility();
    loading = false;
  });

  async function refreshVisibility()
  {
    shouldBeVisible = await feature.canDoAction() as boolean;
  }
</script>

{#if loading}
  <div class="feature-container">
    <span class="description-content">Checking {feature.getName()} installation...</span>
  </div>
{/if}

{#if shouldBeVisible}
  <div class="feature-container" class:description={description} >
    {#if description}
        <span class="description-content">{description}</span>
    {/if}
  {#if currentMode==="Update"}
    <div class="horizontal">
      <button on:click={handleUpdate} class="update btn-left">Update {feature.getName()}</button>
      <button on:click={handleUninstall} class="uninstall btn-right">Uninstall {feature.getName()}</button>
    </div>
  {:else}
    <button on:click={handleDefault} class="{currentClass}">{currentMode} {feature.getName()}</button>
  {/if}
  </div>
{/if}

<style>
  .horizontal {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .horizontal > * {
    /* margin-right: 1em; */
    flex: 1;
  }

  .feature-container > * {
    width: 100%;
  }

  .description {
    padding: 10px;
    border-radius: 10px;
    border: 2px dashed #414141;
  }

  .description-content {
    margin-bottom: 1em;
    display: block;
    text-align: center;
    font-size: 0.9em;
    color: #a2a2a2;
  }

  .btn-left {
    border-radius: 10px 0 0 10px;
  }

  .btn-right {
    border-radius: 0 10px 10px 0;
  }
</style>