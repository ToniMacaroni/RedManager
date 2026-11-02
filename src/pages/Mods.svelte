<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { fs, path } from "@tauri-apps/api";
    import { debounce } from "lodash";
    import { errorMessage, getDirectoryPath, isPathValid } from "../lib/store";
    import ModCard from "../lib/ModCard.svelte";
    import { ModDatabase, Sorting, type Mod } from "../lib/mods";
    import SvgSpinnersBlocksWave from '~icons/svg-spinners/blocks-wave';
    import UilSearch from "~icons/uil/search";
    import UilSync from "~icons/uil/sync";
    import UilExclamationTriangle from "~icons/uil/exclamation-triangle";

    type View = "browse" | "installed";

    const dispatch = createEventDispatcher<{ navigate: number }>();

    let view: View = "browse";
    let searchTerm = "";
    let mods: Mod[] = [];
    let installedMods: Mod[] = [];

    let page = 0;
    let hasMore = true;
    let browseLoading = false;
    let browseError: string | null = null;
    let installedLoading = false;
    let installedError: string | null = null;
    let loaderMissing = false;

    // incremented on every reset so responses for an older search are ignored
    let browseRequest = 0;
    let browsedTerm = "";
    let installedRequest = 0;

    let sentinel: HTMLDivElement;
    let observer: IntersectionObserver | null = null;

    $: filteredInstalled = installedMods.filter(m => m.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));
    $: visibleMods = view === "browse" ? mods : filteredInstalled;
    $: updateCount = installedMods.filter(m => m.hasUpdate).length;
    $: isLoading = view === "browse" ? browseLoading : installedLoading;
    $: loadError = view === "browse" ? browseError : installedError;

    async function loadNextPage() {
        if (browseLoading || !hasMore || view !== "browse") return;

        const id = browseRequest;
        browseLoading = true;
        browseError = null;

        try {
            const res = await ModDatabase.fetchMods(page + 1, Sorting.newest, true, false, searchTerm);
            if (id !== browseRequest) return;

            ModDatabase.initModList(res.data);
            mods = [...mods, ...res.data];
            page = res.meta?.page ?? page + 1;
            hasMore = res.data.length > 0 && (!res.meta || res.meta.page < res.meta.pages);
        } catch (error) {
            if (id !== browseRequest) return;
            browseError = errorMessage(error);
            hasMore = false;
        } finally {
            if (id === browseRequest) browseLoading = false;
        }

        // keep filling if the sentinel is still on screen (e.g. on a tall window)
        queueMicrotask(checkSentinel);
    }

    function resetBrowse() {
        browseRequest++;
        browsedTerm = searchTerm;
        mods = [];
        page = 0;
        hasMore = true;
        browseLoading = false;
        browseError = null;
        loadNextPage();
    }

    function retryBrowse() {
        hasMore = true;
        loadNextPage();
    }

    async function loadInstalled() {
        const id = ++installedRequest;
        installedLoading = true;
        installedError = null;
        try {
            const result = await ModDatabase.getInstalledMods();
            if (id === installedRequest) installedMods = result;
        } catch (error) {
            if (id === installedRequest) installedError = errorMessage(error);
        } finally {
            if (id === installedRequest) installedLoading = false;
        }
    }

    function checkSentinel() {
        if (!sentinel || view !== "browse") return;
        const rect = sentinel.getBoundingClientRect();
        if (rect.top < window.innerHeight + 400) loadNextPage();
    }

    const onSearch = debounce(() => {
        if (view === "browse") resetBrowse();
    }, 400);

    async function setView(next: View) {
        if (view === next) return;
        view = next;
        if (view === "browse") {
            if (!mods.length || browsedTerm !== searchTerm) resetBrowse();
        } else {
            await loadInstalled();
        }
    }

    async function refresh() {
        await ModDatabase.loadInstalledMods();
        if (view === "browse") {
            resetBrowse();
        } else {
            await loadInstalled();
        }
    }

    // after an install/uninstall only the installed state changes, so keep the list and scroll position
    async function onModChanged() {
        if (view === "browse") {
            ModDatabase.initModList(mods);
            mods = mods;
        }
        await loadInstalled();
    }

    onMount(async () => {
        if (!$isPathValid) return;

        observer = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) loadNextPage();
        }, { rootMargin: "400px" });
        if (sentinel) observer.observe(sentinel);

        try {
            loaderMissing = !(await fs.exists(await path.join(await getDirectoryPath(), "_RedLoader")));
            await ModDatabase.loadInstalledMods();
        } catch (error) {
            console.log(error);
        }

        loadNextPage();
        loadInstalled();
    });

    onDestroy(() => {
        observer?.disconnect();
        onSearch.cancel();
    });
</script>

{#if $isPathValid}
    <div class="mods-page">
        {#if loaderMissing}
            <div class="banner banner-warning">
                <UilExclamationTriangle />
                <span>RedLoader isn't installed, so mods won't load. <button class="link" on:click={() => dispatch("navigate", 0)}>Install it from the Loader tab.</button></span>
            </div>
        {/if}

        <div class="toolbar">
            <div class="search">
                <UilSearch />
                <input
                    type="search"
                    placeholder={view === "browse" ? "Search sotf-mods.com" : "Filter installed mods"}
                    bind:value={searchTerm}
                    on:input={onSearch}
                />
            </div>
            <div class="segmented" role="tablist">
                <button role="tab" class:selected={view === "browse"} aria-selected={view === "browse"} on:click={() => setView("browse")}>Browse</button>
                <button role="tab" class:selected={view === "installed"} aria-selected={view === "installed"} on:click={() => setView("installed")}>
                    Installed
                    {#if installedMods.length}<span class="count">{installedMods.length}</span>{/if}
                    {#if updateCount}<span class="count count-update" title="{updateCount} update(s) available">{updateCount}</span>{/if}
                </button>
            </div>
            <button class="btn-ghost" title="Refresh" on:click={refresh} disabled={isLoading}><UilSync /></button>
        </div>

        <div class="scroller">
            {#if visibleMods.length}
                <div class="grid">
                    {#each visibleMods as mod (mod.mod_id ?? mod.name)}
                        <ModCard {mod} on:changed={onModChanged} />
                    {/each}
                </div>
            {/if}

            {#if loadError}
                <div class="state">
                    <UilExclamationTriangle class="state-icon" />
                    <span>Couldn't load mods: {loadError}</span>
                    <button on:click={view === "browse" ? retryBrowse : loadInstalled}>Try again</button>
                </div>
            {:else if isLoading}
                <div class="state"><SvgSpinnersBlocksWave class="spinner" /></div>
            {:else if !visibleMods.length}
                <div class="state muted">
                    {#if view === "installed" && !installedMods.length}
                        No mods installed yet. Find some in Browse.
                    {:else if searchTerm.trim()}
                        No mods match "{searchTerm.trim()}".
                    {:else}
                        No mods found.
                    {/if}
                </div>
            {/if}

            <div bind:this={sentinel} class="sentinel"></div>
        </div>
    </div>
{:else}
    <div class="page">
        <div class="state muted">
            <span>Set the game location on the Loader tab to start browsing mods.</span>
            <button class="btn-primary" on:click={() => dispatch("navigate", 0)}>Go to Loader</button>
        </div>
    </div>
{/if}

<style>
    .mods-page {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .search {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
    }

    .search > :global(svg) {
        position: absolute;
        left: 10px;
        color: var(--text-faint);
        pointer-events: none;
    }

    .search input {
        padding-left: 34px;
    }

    .segmented {
        display: flex;
        padding: 3px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
    }

    .segmented button {
        padding: 0.35em 0.9em;
        border: 0;
        border-radius: 4px;
        background: transparent;
        color: var(--text-muted);
    }

    .segmented button.selected {
        background: var(--surface-3);
        color: var(--text);
    }

    .count {
        font-size: 0.78em;
        padding: 0 6px;
        border-radius: 999px;
        background: var(--surface-2);
        color: var(--text-muted);
    }

    .count-update {
        background: var(--info-soft);
        color: var(--info);
    }

    .scroller {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        margin-right: -12px;
        padding-right: 12px;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 14px;
    }

    .state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 40px 0;
        text-align: center;
    }

    .state :global(.state-icon) {
        font-size: 1.8em;
        color: var(--danger);
    }

    .state :global(.spinner) {
        font-size: 2em;
        color: var(--accent);
    }

    .sentinel {
        height: 1px;
    }
</style>
