<script lang="ts">
  import Greet from './lib/InstallationComponent.svelte'
  import { gameExePath, isDotnetInstalled, isPathValid, processName, processProgress, processing } from './lib/store';
  import Page1 from './pages/MainPage.svelte';
  import Page2 from './pages/AdditionalsPage.svelte';
  import Page3 from './pages/Modders.svelte';
  import { onMount } from "svelte";
  import { fade } from 'svelte/transition';
    import { invoke } from '@tauri-apps/api';

  let showOverlay: boolean = false;

  processing.subscribe(value => {
    showOverlay = value;
  });

  let tabs = [
        { label: "Main", component: Page1 },
        { label: "Extras", component: Page2 },
        { label: "Modders", component: Page3 },
    ];
  let activeTabComponent = tabs[0].component;
  
  function selectTab(tabComponent) {
      activeTabComponent = tabComponent;
  }

  function handleKeyPress(event: KeyboardEvent, tabComponent) {
      if (event.key === "Enter" || event.key === " ") {
          selectTab(tabComponent);
      }
  }

  document.addEventListener('DOMContentLoaded', () => {
    processing.set(false);
  })

  onMount( async () => {
    processing.set(true);
    processName.set("Initializing...");

    try {
      let steamPath = await invoke("get_steam_path");
      console.log(steamPath);
      gameExePath.set(steamPath as string);
      isPathValid.set(true);
    } catch (err) {
      console.log(err);
    }

    try {
      let hasDotnet = await invoke("is_dotnet6_installed");
      console.log(hasDotnet);
      isDotnetInstalled.set(hasDotnet as boolean);
    }
    catch (err) {
      console.log(err);
    }
  })
</script>

<main>
  <div class="tabs">
    {#each tabs as tab}
        <div 
            class="tab {tab.component === activeTabComponent ? 'activetab' : ''}" 
            tabindex="0" 
            role="button"
            on:click={() => selectTab(tab.component)}
            on:keydown={(e) => handleKeyPress(e, tab.component)}>
            {tab.label}
        </div>
    {/each}
  </div>

  <div class="container">
    <svelte:component this={activeTabComponent} />
  </div>

  
  {#if showOverlay}
    <div class="loading-overlay" transition:fade={{ delay: 0, duration: 150 }}>
      {$processName}
      <div class="progress-bar">
          <div class="progress" style="width: {$processProgress}%"></div>
      </div>
    </div>
  {/if}

</main>

<style>
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    gap: 20px;
  }

  .progress-bar {
    background: rgba(255, 255, 255, 0.2);
    width: 70%;
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
  }

  .progress {
    height: 100%;
    background-color: #f65050;
    transition: width 0.3s;
  }
</style>