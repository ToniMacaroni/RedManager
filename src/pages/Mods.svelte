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
    import ImageCache from "../lib/imageCache";

    let filtered: Mod[] = [];
    let filterTerm: string = "";

    let onlineSelected = true;
    let installedSelected = false;

    let isGrid = false;

    let page = 1;
	let newBatch: Mod[] = [];
    let isLoading: boolean = false;

    async function fetchData() {
        //processing.set(true);
        //processProgress.set(0);
        //processName.set("Loading mods...");
        isLoading = true;
        let res = await ModDatabase.fetchMods(page, Sorting.newest, true, false, filterTerm);
        let mods = res.data;
        await ModDatabase.initModList(mods);
		newBatch = mods;
        filtered = [...filtered, ...newBatch];
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
        
        await ModDatabase.initDatabase();
        await fetchData();
        
        // Preload images for the first visible mods for faster display
        if (filtered.length > 0) {
            const imageUrls = filtered.slice(0, 10)
                .map(mod => mod.imageUrl)
                .filter(url => url && url.trim() !== '');
            
            if (imageUrls.length > 0) {
                ImageCache.preloadImages(imageUrls).catch(error => 
                    console.warn('Failed to preload images:', error)
                );
            }
        }

        isGrid = window.innerWidth > 720; /* Match 320px minimum + 2x48px padding + 320px for second card */
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
        page = 1;
        filtered = [];
        
        if (installedSelected) {
            // For installed mods, fetch and filter locally
            let allInstalled = await ModDatabase.getInstalledMods();
            filtered = allInstalled.filter(mod => 
                mod.name.toLowerCase().includes(filterTerm.toLowerCase())
            );
        } else {
            // For online mods, use API search
            await fetchData();
        }
    }, 600);

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
        filtered = [];
        
        let allInstalled = await ModDatabase.getInstalledMods();
        
        // Apply search filter if there is one
        if (filterTerm && filterTerm.trim() !== '') {
            filtered = allInstalled.filter(mod => 
                mod.name.toLowerCase().includes(filterTerm.toLowerCase())
            );
        } else {
            filtered = allInstalled;
        }
        
        // Sort installed mods by name
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        
        isLoading = false;
        // page = 1;
        // filtered = [];
        // await fetchData();
        //await filter();
    }

    async function refreshMods() {
        await ModDatabase.loadInstalledMods();
        
        // Update the installation status for all mods in the current list
        await ModDatabase.initModList(filtered);
        
        // Trigger reactivity by reassigning the filtered array
        filtered = [...filtered];
    }

</script>

<svelte:window on:resize={() => isGrid = window.innerWidth > 720} />
<div class="column mods-page-container">
    {#if isPathValid}
        <div class="search-container">
            <input class="generic-input search-input" placeholder="Search" type="text" on:input={handleSearchInput} />
            <div class="button-group">
                <button class="btn-left cat-btn" class:cat-btn-selected={onlineSelected} on:click={toggleOnline}>Online</button>
                <button class="btn-right cat-btn" class:installed-selected={installedSelected} on:click={toggleInstalled}>Installed</button>
            </div>
        </div>

        <div class="scroller" class:grid={isGrid}>
            {#each filtered as mod (mod.mod_id)}
                <ModCard mod={mod} isGrid={isGrid} on:refreshMods={refreshMods}/>
            {/each}

            {#if isLoading}
            <SvgSpinnersBlocksWave style="font-size: 32px; color: #f65050; position: absolute; bottom: 40px;" />
            {/if}

            <InfiniteScroll
                hasMore={newBatch.length !== 0 && !installedSelected}
                threshold={500}
                on:loadMore={() => {page++; fetchData()}} />
        </div>

    {:else}
        <b>Set the correct path in the main tab to start browsing mods.</b>
    {/if}
    
</div>

<style>
    /* Specific container for mods page with compact spacing */
    .mods-page-container {
        padding: 0 !important; /* Remove all padding */
        margin: 0 !important; /* Remove all margin */
        justify-content: flex-start !important; /* Force align to top */
        gap: 0 !important; /* No gap between elements */
    }

    /* Override column to reduce top spacing */
    .column {
        padding-top: 8px !important; /* Force minimal top padding */
        justify-content: flex-start !important; /* Force align to top instead of center */
        padding-bottom: 8px; /* Add some bottom spacing to window border */
    }

    .scroller {
        height: 75vh; /* Optimized height to show approximately 2 rows */
        overflow-y: scroll;
        overflow-x: visible; /* Allow horizontal overflow to prevent image cutoff */
        margin-bottom: 16px; /* Add spacing from window border */
    }

    /* Search bar container - align with grid edges */
    .search-container {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important; /* FORCE center all children */
        justify-content: flex-start; /* Align to start */
        padding: 0px 48px 0px 32px !important; /* Increased left padding to align with card content (16px grid + 16px card padding) */
        margin: 0 0 16px 0 !important; /* Add bottom margin to prevent cards from scrolling under */
        height: 38px; /* Minimal height to fit content */
        gap: 8px; /* Use gap instead of margin for spacing */
        box-sizing: border-box;
    }

    /* Button group to keep category buttons connected */
    .button-group {
        display: flex !important;
        align-items: center !important; /* FORCE center buttons vertically with search input */
        margin-left: 0; /* Remove margin since container uses gap */
        margin-bottom: 0 !important; /* FORCE override any inherited margins */
        height: 38px; /* Match search input height exactly */
        flex-shrink: 0; /* Prevent shrinking */
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); /* Increased to 320px to ensure no overlap with 220px images + padding */
        grid-gap: 20px; /* Restored larger gap for better spacing */
        padding: 16px 48px 16px 16px; /* Increased right padding significantly for scrollbar */
        width: 100%;
        justify-content: start;
        box-sizing: border-box;
        /* Remove height constraints to allow natural scrolling */
    }

    /* Force single column on narrow screens */
    @media (max-width: 900px) {
        .grid {
            grid-template-columns: 1fr; /* Force single column */
            padding: 16px 40px 16px 16px; /* Increased right padding for scrollbar space */
            grid-gap: 20px; /* Consistent gap in single column */
        }

        .search-container {
            padding: 0px 40px 0px 32px !important; /* Increased left padding to align with card content */
            margin: 0 0 16px 0 !important; /* Add bottom margin for tablet responsive */
            height: 40px; /* Slightly larger height for mobile touch targets */
        }
    }

    /* Extra small windows - near minimum size */
    @media (max-width: 650px) {
        .grid {
            grid-template-columns: 1fr; /* Force single column */
            padding: 8px 32px 8px 8px; /* Reduced padding but maintain scrollbar space */
            grid-gap: 12px; /* Smaller gap for tight spaces */
        }

        .search-container {
            padding: 0px 32px 0px 24px !important; /* Increased left padding to align with card content (8px grid + 16px card padding) */
            margin: 0 0 16px 0 !important; /* Add bottom margin for mobile responsive */
            height: 36px; /* Slightly smaller for tight spaces */
        }
        
        .mods-page-container {
            padding: 0 !important;
            margin: 0 !important;
        }
    }

    .search-input {
        flex: 1;
        margin-right: 0; /* Removed margin since button-group handles spacing */
        margin-bottom: 0 !important; /* Override global generic-input margin */
        height: 38px; /* Fixed height to match buttons */
        box-sizing: border-box;
        align-self: center; /* Force center alignment within flex container */
        min-height: 38px; /* Ensure minimum height */
        max-height: 38px; /* Ensure maximum height */
    }

    .cat-btn {
        padding: 0;
        margin: 0 !important; /* FORCE override global button margin */
        height: 38px; /* Adjusted to match typical input height */
        width: 96px; /* 6em = 96px at 16px base */
        color: #a2a2a2;
        border: 1px solid #555; /* Add border to define button edges */
        vertical-align: middle; /* Force vertical alignment */
        display: inline-flex; /* Change to inline-flex for better alignment */
        align-items: center; /* Center button content */
        justify-content: center; /* Center button text */
        margin-bottom: 0 !important; /* Override global button margin-bottom */
    }

    /* Remove double border between connected buttons */
    .button-group .cat-btn + .cat-btn {
        border-left: none;
    }

    .cat-btn-selected {
        background-color: #111;
        color: #659cf0;
    }

    /* Make Installed button green when selected - higher specificity */
    .btn-right.cat-btn.installed-selected {
        background-color: #111 !important;
        color: #28a745 !important; /* Green color */
    }
</style>