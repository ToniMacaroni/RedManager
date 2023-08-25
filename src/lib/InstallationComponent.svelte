<script lang="ts">
  import { processProgress, processing } from './store';
  import { InstallMode, type FeatureInstaller } from "./featureInstaller";
    import { GithubInfo, redLoaderInfo } from './githubInfo';
    import { onMount } from 'svelte';

  export let feature: FeatureInstaller;
  $: currentMode = feature.currentModeState;
  $: currentClass = currentMode.toLowerCase();
  $: shouldBeVisible = true;

  async function handleInstallation() {
    processing.set(true);
    processProgress.set(0);

    await feature.handleCurrentMode();

    processing.set(false);

    currentMode = feature.currentModeState;
    await refreshVisibility();
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
  <button on:click={handleInstallation} class="{currentClass}">{currentMode} {feature.getName()}</button>
{/if}