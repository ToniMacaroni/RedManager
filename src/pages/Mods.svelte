<script lang="ts">
    import { onMount } from "svelte";
    import { Command } from "@tauri-apps/api/shell";
    import { get } from "svelte/store";
    import { gameExePath, isPathValid, processProgress } from "../lib/store";
    import { dialog, path, process } from "@tauri-apps/api";
    import { processing, processName } from "../lib/store";
    import ModCard from "../lib/ModCard.svelte";
    import type { Mod } from "../lib/mods";
    import { ModDatabase, Sorting } from "../lib/mods";
    import InfiniteScroll from "../lib/InfiniteScroll.svelte";
    import { debounce } from "lodash";
    import SvgSpinnersBlocksWave from '~icons/svg-spinners/blocks-wave'

    let filtered: Mod[] = [];
    let installedList: Mod[] = [];
    let filterTerm: string = "";

    let onlineSelected = true;
    let installedSelected = false;

    let isGrid = false;

    let page = 1;
	let newBatch: Mod[] = [];
    let isLoading: boolean = true;
    let loadFailed: boolean = false;

    async function fetchData() {
        //processing.set(true);
        //processProgress.set(0);
        //processName.set("Loading mods...");
        isLoading = true;
        loadFailed = false;
        try {
            let res = await ModDatabase.fetchMods(page, Sorting.newest, true, false, filterTerm);
            let mods = res.data;
            await ModDatabase.initModList(mods);
            newBatch = mods;
            filtered = [...filtered, ...newBatch];
        } catch (err) {
            console.log(err);
            newBatch = [];
            loadFailed = true;
        }
        isLoading = false;
        //processing.set(false);
	};

    // $: filtered = [
	// 	...filtered,
    //     ...newBatch
    // ];

    onMount(async () => {
        //processing.set(true);
        //processProgress.set(0);
        //processName.set("Loading mods...");
        //await ModDatabase.refreshAll(false);

        //await filter();
        //processing.set(false);
        
        try {
            await ModDatabase.initDatabase();
        } catch (err) {
            console.log(err);
        }
        await fetchData();
        

        isGrid = window.innerWidth > 1000;
    });

    // async function filter() {
    //     let modBucket: Mod[] = [];
    //     if(filterTerm.startsWith("unapproved:"))
    //     {
    //         modBucket = await ModDatabase.getUnapprovedMods();
    //     }
    //     else if(filterTerm.startsWith("nsfw:"))
    //     {
    //         modBucket = await ModDatabase.getNsfwMods();
    //     }
    //     else
    //     {
    //         modBucket = await ModDatabase.getMods();
    //     }

    //     let split =  filterTerm.split(":");
    //     let term = split[split.length - 1];

    //     filtered = modBucket.filter((mod) => {
    //         let passesTerm = mod.name.toLowerCase().includes(term.toLowerCase());
    //         let passesScope = (onlineSelected && !mod.isInstalled) || (installedSelected && mod.isInstalled);
    //         return passesTerm && passesScope;
    //     });
    // }

    const handleSearchInput = debounce(async e => {
        filterTerm = e.target.value;
        if (installedSelected) {
            filterInstalled();
            return;
        }
        page = 1;
        filtered = [];
        await fetchData();
    }, 600);

    function filterInstalled() {
        let term = filterTerm.trim().toLowerCase();
        filtered = installedList.filter((mod) => mod.name.toLowerCase().includes(term));
    }

    async function toggleOnline() {
        // onlineSelected = !onlineSelected;

        onlineSelected = true;
        installedSelected = false;
        page = 1;
        filtered = [];
        await fetchData();
        //await filter();
    }

    async function toggleInstalled() {
        // installedSelected = !installedSelected;

        onlineSelected = false;
        installedSelected = true;
        isLoading = true;
        loadFailed = false;
        filtered = [];
        try {
            installedList = await ModDatabase.getInstalledMods();
            filterInstalled();
        } catch (err) {
            console.log(err);
            loadFailed = true;
        }
        isLoading = false;
        // page = 1;
        // filtered = [];
        // await fetchData();
        //await filter();
    }

    async function retry() {
        if (installedSelected) {
            await toggleInstalled();
            return;
        }
        await fetchData();
    }

    async function refreshMods() {
        await ModDatabase.loadInstalledMods();
        
        if (onlineSelected) {
            await toggleOnline();
            return;
        }

        await toggleInstalled();
    }

</script>

<svelte:window on:resize={() => isGrid = window.innerWidth > 1000} />
<div class="column">
    {#if $isPathValid}
        <div class="row-center">
            <input class="generic-input search-input" placeholder="Search" type="text" on:input={handleSearchInput} />
            <button class="btn-left cat-btn" class:cat-btn-selected={onlineSelected} on:click={toggleOnline}>Online</button>
            <button class="btn-right cat-btn" class:cat-btn-selected={installedSelected} on:click={toggleInstalled}>Installed</button>
        </div>

        <div class="scroller" class:grid={isGrid}>
            {#each filtered as mod}
                <ModCard mod={mod} isGrid={isGrid} on:refreshMods={refreshMods}/>
            {/each}

            {#if isLoading}
            <SvgSpinnersBlocksWave style="font-size: 2em; color: #f65050; position: absolute; bottom: 40px;" />
            {/if}

            {#if loadFailed}
                <div class="status-msg">
                    Couldn't load mods, check your connection.
                    <br>
                    <button on:click={retry}>Retry</button>
                </div>
            {:else if !isLoading && filtered.length === 0}
                <div class="status-msg">No mods found.</div>
            {/if}

            <InfiniteScroll
                hasMore={newBatch.length !== 0 && !installedSelected}
                threshold={100}
                on:loadMore={() => {page++; fetchData()}} />
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

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        grid-gap: 1em;
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
        color: #a2a2a2;
    }

    .cat-btn-selected {
        background-color: #111;
        color: #659cf0;
    }

    .status-msg {
        grid-column: 1 / -1;
        padding: 2em 0;
        color: #a2a2a2;
        text-align: center;
    }

    .no-corner {
        border-radius: 0;
    }
</style>