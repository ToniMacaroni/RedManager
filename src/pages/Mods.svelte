<script lang="ts">
    import { onMount } from "svelte";
    import { Command } from "@tauri-apps/api/shell";
    import { get } from "svelte/store";
    import { gameExePath, isPathValid, processProgress } from "../lib/store";
    import { dialog, path } from "@tauri-apps/api";
    import { processing, processName } from "../lib/store";
    import ModCard from "../lib/ModCard.svelte";
    import type { Mod } from "../lib/mods";
    import { ModDatabase } from "../lib/mods";

    let filtered: Mod[] = [];
    let filterTerm: string = "";

    let onlineSelected = true;
    let installedSelected = true;

    onMount(async () => {
        processing.set(true);
        processProgress.set(0);
        processName.set("Loading mods...");
        await ModDatabase.refreshAll(false);

        await filter();
        processing.set(false);
    });

    async function filter() {
        filtered = ModDatabase.getMods().filter((mod) => {
            let passesTerm = mod.name.toLowerCase().includes(filterTerm.toLowerCase());
            let passesScope = (onlineSelected && !mod.isInstalled) || (installedSelected && mod.isInstalled);
            return passesTerm && passesScope;
        });
    }

    async function toggleOnline() {
        onlineSelected = !onlineSelected;
        await filter();
    }

    async function toggleInstalled() {
        installedSelected = !installedSelected;
        await filter();
    }

</script>

<div class="column">
    {#if isPathValid}
        <div class="horizontal">
            <input class="generic-input search-input" placeholder="Search" type="text" bind:value={filterTerm} on:input={filter} />
            <button class="btn-left cat-btn" class:cat-btn-selected={onlineSelected} on:click={toggleOnline}>Online</button>
            <button class="btn-right cat-btn" class:cat-btn-selected={installedSelected} on:click={toggleInstalled}>Installed</button>
        </div>
        <div class="scroller">
            {#each filtered as mod}
                <ModCard mod={mod}/>
            {/each}
        </div>
    {:else}
        <b>Set the correct path in the main tab to start browsing mods.</b>
    {/if}
    
</div>

<style>
    .scroller {
        height: 75vh;
        overflow-y: scroll;
        overflow-x: hidden;
    }

    .horizontal {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .search-input {
        flex: 1;
        margin-right: 0.5em;
    }

    .cat-btn {
        padding: 0;
        margin-top: -4px;
        height: 2.7em;
        width: 6em;
    }

    .cat-btn-selected {
        background-color: #111;
    }

    .no-corner {
        border-radius: 0;
    }
</style>