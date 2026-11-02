<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { invoke } from "@tauri-apps/api";
  import { getVersion } from "@tauri-apps/api/app";
  import {
    dismissToast,
    gameExePath,
    getSavedGamePath,
    isDotnetInstalled,
    isPathValid,
    processName,
    processProgress,
    processing,
    setGamePath,
    toasts,
  } from "./lib/store";
  import MainPage from "./pages/MainPage.svelte";
  import Mods from "./pages/Mods.svelte";
  import Modding from "./pages/Modding.svelte";
  import redLogo from "/redlogo.png";
  import UilBox from "~icons/uil/box";
  import UilArrowCircleDown from "~icons/uil/arrow-circle-down";
  import UilBriefcase from "~icons/uil/briefcase";
  import UilTimes from "~icons/uil/times";
  import UilCheckCircle from "~icons/uil/check-circle";
  import UilExclamationTriangle from "~icons/uil/exclamation-triangle";
  import UilInfoCircle from "~icons/uil/info-circle";

  const tabs = [
    { label: "Loader", component: MainPage, icon: UilArrowCircleDown },
    { label: "Mods", component: Mods, icon: UilBox },
    { label: "Mod Creation", component: Modding, icon: UilBriefcase },
  ];

  const toastIcons = { success: UilCheckCircle, error: UilExclamationTriangle, info: UilInfoCircle };

  let activeTab = 0;
  let initializing = true;
  let appVersion = "";

  function selectTab(index: number) {
    activeTab = index;
  }

  async function detectGamePath() {
    const saved = getSavedGamePath();
    if (saved && (await setGamePath(saved))) {
      return;
    }

    try {
      const steamPath = await invoke<string | null>("get_steam_path");
      if (steamPath) {
        await setGamePath(steamPath);
      }
    } catch (err) {
      console.log(err);
    }
  }

  onMount(async () => {
    document.addEventListener("contextmenu", (event) => event.preventDefault());

    getVersion().then(v => appVersion = v).catch(() => {});

    try {
      await detectGamePath();
      isDotnetInstalled.set(await invoke<boolean>("is_dotnet6_installed"));
    } catch (err) {
      console.log(err);
    } finally {
      initializing = false;
    }
  });
</script>

<div class="app">
  <header>
    <div class="brand">
      <img src={redLogo} alt="" class="brand-logo" />
      <span class="brand-name">RedManager</span>
      {#if appVersion}<span class="brand-version">v{appVersion}</span>{/if}
    </div>
    <nav><div class="tablist" role="tablist">
      {#each tabs as tab, i}
        <button
          role="tab"
          class="tab"
          class:active={i === activeTab}
          aria-selected={i === activeTab}
          on:click={() => selectTab(i)}
        >
          <svelte:component this={tab.icon} />
          {tab.label}
        </button>
      {/each}
    </div></nav>
  </header>

  <main class="content" class:content-fill={activeTab === 1}>
    {#if initializing}
      <div class="init">Looking for Sons of the Forest...</div>
    {:else}
      <!-- remount the page whenever a different game install is selected -->
      {#key $isPathValid ? $gameExePath : ""}
        <svelte:component this={tabs[activeTab].component} on:navigate={(e) => selectTab(e.detail)} />
      {/key}
    {/if}
  </main>

  {#if $processing}
    <div class="loading-overlay" transition:fade={{ duration: 150 }}>
      <div class="loading-card">
        <span class="loading-title">{$processName}</span>
        <div class="progress-bar">
          <div class="progress" class:indeterminate={$processProgress <= 0} style="width: {$processProgress > 0 ? $processProgress : 30}%"></div>
        </div>
      </div>
    </div>
  {/if}

  <div class="toasts" aria-live="polite">
    {#each $toasts as toast (toast.id)}
      <div class="toast toast-{toast.kind}" transition:fly={{ y: 16, duration: 200 }}>
        <svelte:component this={toastIcons[toast.kind]} />
        <span class="toast-message">{toast.message}</span>
        <button class="btn-ghost toast-close" aria-label="Dismiss" on:click={() => dismissToast(toast.id)}><UilTimes /></button>
      </div>
    {/each}
  </div>
</div>

<style>
  .app {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 0 16px;
    height: 56px;
    flex-shrink: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brand-logo {
    height: 26px;
  }

  .brand-name {
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .brand-version {
    font-size: 0.75em;
    color: var(--text-faint);
  }

  nav, .tablist {
    display: flex;
    gap: 4px;
    height: 100%;
  }

  .tab {
    height: 100%;
    padding: 0 14px;
    border: 0;
    border-radius: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--text-muted);
  }

  .tab:hover:not(:disabled) {
    background: transparent;
    color: var(--text);
  }

  .tab.active {
    color: var(--text);
    border-bottom-color: var(--accent);
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 24px;
  }

  .content-fill {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .init {
    text-align: center;
    color: var(--text-muted);
    margin-top: 20vh;
  }

  .loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
  }

  .loading-card {
    width: min(440px, 80vw);
    padding: 22px 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  }

  .loading-title {
    font-weight: 500;
  }

  .progress-bar {
    background: var(--surface-3);
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
  }

  .progress {
    height: 100%;
    background-color: var(--accent);
    border-radius: 999px;
    transition: width 0.3s;
  }

  .progress.indeterminate {
    animation: slide 1.2s ease-in-out infinite;
  }

  @keyframes slide {
    from { transform: translateX(-100%); }
    to { transform: translateX(340%); }
  }

  .toasts {
    position: fixed;
    right: 16px;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 30;
    max-width: min(420px, calc(100vw - 32px));
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 8px 10px 14px;
    border-radius: var(--radius);
    background: var(--surface-2);
    border: 1px solid var(--border);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    font-size: 0.92em;
    user-select: text;
  }

  .toast > :global(svg) {
    font-size: 1.2em;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .toast-success > :global(svg) { color: var(--success); }
  .toast-error > :global(svg) { color: var(--danger); }
  .toast-info > :global(svg) { color: var(--info); }

  .toast-error {
    border-color: rgba(253, 140, 143, 0.3);
  }

  .toast-message {
    flex: 1;
    word-break: break-word;
  }

  .toast-close {
    padding: 2px;
    margin-top: -1px;
  }
</style>
