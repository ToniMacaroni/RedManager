<script lang="ts">
  import { onMount } from 'svelte';
  import { runTask } from './store';
  import { InstallMode, type FeatureInstaller } from "./featureInstaller";
  import { confirmAction } from './utils';
  import UilArrowCircleDown from "~icons/uil/arrow-circle-down";
  import UilTrashAlt from "~icons/uil/trash-alt";
  import UilSync from "~icons/uil/sync";

  export let feature: FeatureInstaller;

  let mode: InstallMode = feature.currentMode;
  let visible = false;
  let loading = true;
  let remoteVersion: string | null = null;
  let localVersion: string | null = null;

  async function refresh() {
    await feature.refreshMode();
    mode = feature.currentMode;
    localVersion = feature.localVersion;
    visible = await feature.canDoAction();
  }

  async function run(targetMode: InstallMode) {
    const name = feature.getName();

    if (targetMode === InstallMode.Uninstall) {
      const message = feature.uninstallWarning ?? `Remove ${name} from the game folder?`;
      if (!(await confirmAction(`Uninstall ${name}`, message))) return;
    }

    const verb = targetMode === InstallMode.Uninstall ? "Removing" : targetMode === InstallMode.Update ? "Updating" : "Installing";
    const done = targetMode === InstallMode.Uninstall ? "removed" : targetMode === InstallMode.Update ? "updated" : "installed";

    await runTask(`${verb} ${name}...`, () => feature.handle(targetMode), `${name} ${done}.`);
    await refresh();
  }

  onMount(async () => {
    try {
      remoteVersion = await feature.getRemoteVersionString();
      await refresh();
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="card feature">
    <div class="info">
      <span class="name">{feature.getName()}</span>
      <span class="muted small">Checking installation...</span>
    </div>
  </div>
{:else if visible}
  <div class="card feature" class:warning={!feature.hasInstaller()}>
    <div class="info">
      <div class="title-row">
        <span class="name">{feature.getName()}</span>
        {#if mode === InstallMode.Update}
          <span class="badge badge-info">Update available</span>
        {:else if mode === InstallMode.Uninstall && feature.hasInstaller()}
          <span class="badge badge-success">Installed</span>
        {:else if mode === InstallMode.Uninstall}
          <span class="badge badge-warning">Conflicting loader</span>
        {:else}
          <span class="badge">Not installed</span>
        {/if}
      </div>
      {#if feature.description}
        <span class="muted small">{feature.description}</span>
      {/if}
      {#if feature.hasInstaller()}
        <span class="faint small">
          {#if localVersion}Installed: v{localVersion} · {/if}Latest: {remoteVersion ?? "unavailable (offline?)"}
        </span>
      {/if}
    </div>

    <div class="actions">
      {#if mode === InstallMode.Install}
        <button class="btn-primary" on:click={() => run(InstallMode.Install)}><UilArrowCircleDown /> Install</button>
      {:else}
        {#if mode === InstallMode.Update}
          <button class="btn-info" on:click={() => run(InstallMode.Update)}><UilSync /> Update</button>
        {:else if feature.hasInstaller()}
          <button class="btn-ghost" title="Download and install again" on:click={() => run(InstallMode.Install)}><UilSync /> Reinstall</button>
        {/if}
        <button class="btn-danger" on:click={() => run(InstallMode.Uninstall)}><UilTrashAlt /> {feature.hasInstaller() ? "Uninstall" : "Remove"}</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .feature {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .feature.warning {
    border-color: rgba(227, 179, 65, 0.3);
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .name {
    font-weight: 600;
    font-size: 1.05em;
  }

  .small {
    font-size: 0.88em;
  }

  .actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
</style>
