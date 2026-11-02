<script lang="ts">
    import { shell } from "@tauri-apps/api";
    import FeatureList from "../lib/FeatureList.svelte";
    import PathSelector from "../lib/PathSelector.svelte";
    import { loaderFeature, bieFeature, melonFeature } from "../lib/featureInstaller";
    import { isPathValid, isDotnetInstalled, getDirectoryPath } from "../lib/store";
    import redLogo from "/redlogo.png";
    import UilFolderOpen from "~icons/uil/folder-open";
    import UilPlay from "~icons/uil/play";
    import UilGithub from "~icons/uil/github";
    import UilExclamationTriangle from "~icons/uil/exclamation-triangle";

    const DOTNET_URL = "https://dotnet.microsoft.com/en-us/download/dotnet/6.0";

    async function openFolder() {
        await shell.open(await getDirectoryPath());
    }

    async function startGame() {
        await shell.open("steam://rungameid/1326470");
    }
</script>

<div class="page">
    <div class="hero">
        <img class="hero-logo" src={redLogo} alt="RedLoader" />
        <p class="muted">Install and manage RedLoader and mods for Sons of the Forest.</p>
    </div>

    {#if !$isDotnetInstalled}
        <div class="banner banner-warning">
            <UilExclamationTriangle />
            <span>
                RedLoader needs the <button class="link" on:click={() => shell.open(DOTNET_URL)}>.NET 6 Desktop Runtime (x64)</button>.
                Install it before launching the game.
            </span>
        </div>
    {/if}

    <PathSelector />

    {#if $isPathValid}
        <span class="section-title">Loader</span>
        <FeatureList features={[bieFeature, melonFeature, loaderFeature]} />

        <div class="quick-actions">
            <button class="btn-primary" on:click={startGame}><UilPlay /> Start Game</button>
            <button on:click={openFolder}><UilFolderOpen /> Open Game Folder</button>
            <span class="spacer"></span>
            <button class="btn-ghost" on:click={() => shell.open("https://github.com/ToniMacaroni/RedLoader")}><UilGithub /> RedLoader on GitHub</button>
        </div>
    {/if}
</div>

<style>
    .hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 8px 0 4px;
        text-align: center;
    }

    .hero-logo {
        width: 200px;
        max-width: 60%;
    }

    .quick-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
    }

    .spacer {
        flex: 1;
    }
</style>
