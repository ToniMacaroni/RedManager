<script lang="ts">
  import Greet from './lib/InstallationComponent.svelte'
  import { gameExePath, isPathValid, processName, processProgress, processing } from './lib/store';
  import Page1 from './pages/MainPage.svelte';
  import Page2 from './pages/AdditionalsPage.svelte';
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

  onMount( async () => {
    try {
      let steamPath = await invoke("get_steam_path");
      console.log(steamPath);
      gameExePath.set(steamPath as string);
      isPathValid.set(true);
    } catch (err) {
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
    <!-- <h1>Welcome to {activeTab}!</h1> -->
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

  <!-- <h1>Welcome to Tauri!</h1> -->

  <!-- <div class="row">
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo vite" alt="Vite Logo" />
    </a>
    <a href="https://tauri.app" target="_blank">
      <img src="/tauri.svg" class="logo tauri" alt="Tauri Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank">
      <img src="/svelte.svg" class="logo svelte" alt="Svelte Logo" />
    </a>
  </div>

  <p>
    Click on the Tauri, Vite, and Svelte logos to learn more.
  </p> -->

  <!-- <div class="row">
    <Greet />
  </div> -->

  <!-- <input id="greet-input" placeholder="Enter a name..." /> -->
  <!-- <button type="submit" class="uninstall">Greet</button>
  <button type="submit" class="uninstall">Greet</button>
  <button type="submit" class="install">Greet</button> -->

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
    gap: 20px;  /* A gap between the text and the progress bar */
  }

  .progress-bar {
    background: rgba(255, 255, 255, 0.2); /* Light translucent background */
    width: 70%; /* Adjust as needed */
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
  }

  .progress {
    height: 100%;
    background-color: #f78166; /* Change this to any desired color */
    transition: width 0.3s; /* Smoothens the progress change */
  }
</style>