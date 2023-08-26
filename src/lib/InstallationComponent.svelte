<script lang="ts">
  import { processProgress, processing } from './store';
  import { InstallMode, type FeatureInstaller } from "./featureInstaller";
    import { GithubInfo, redLoaderInfo } from './githubInfo';
    import { onMount } from 'svelte';

  export let feature: FeatureInstaller;
  $: currentMode = feature.currentModeState;
  $: currentClass = currentMode.toLowerCase();
  $: shouldBeVisible = true;

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
    await refreshVisibility();
    currentMode = feature.currentModeState;
  });

  async function refreshVisibility()
  {
    if(!await feature.canDoAction())
    {
      shouldBeVisible = false;
      return;
    }
  }
</script>

{#if shouldBeVisible}
  {#if currentMode==="Update"}
    <div class="horizontal">
      <button on:click={handleUpdate} class="update">Update {feature.getName()}</button>
      <button on:click={handleUninstall} class="uninstall">Uninstall {feature.getName()}</button>
    </div>
  {:else}
    <button on:click={handleDefault} class="{currentClass}">{currentMode} {feature.getName()}</button>
  {/if}
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
    margin-left: 5px;
    margin-right: 5px;
  }
</style>