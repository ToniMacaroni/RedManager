<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { errorMessage, notify, runTask } from './store';
    import { ModDatabase, type Mod } from './mods';
    import { confirmAction } from './utils';
    import UilArrowCircleDown from "~icons/uil/arrow-circle-down";
    import UilTrashAlt from "~icons/uil/trash-alt";
    import UilSync from "~icons/uil/sync";
    import UilExternalLinkAlt from "~icons/uil/external-link-alt";
    import UilBox from "~icons/uil/box";
    import UilExclamationTriangle from "~icons/uil/exclamation-triangle";

    export let mod: Mod;

    let imageFailed = false;
    let imageLoaded = false;
    let toggling = false;

    $: isLibrary = mod.type === "Library";
    $: installedVersion = mod.installedMod?.manifest.version;
    $: layoutIssue = mod.installedMod?.layoutIssue;

    const dispatch = createEventDispatcher<{ changed: void }>();

    async function install() {
        await runTask(`Installing ${mod.name}...`, () => ModDatabase.installMod(mod), `${mod.name} installed.`);
        dispatch("changed");
    }

    async function update() {
        if (!mod.installedMod) return;
        const installed = mod.installedMod;
        await runTask(`Updating ${mod.name}...`, async () => {
            await ModDatabase.uninstallMod(installed);
            await ModDatabase.installMod(mod);
        }, `${mod.name} updated to ${mod.latestVersion}.`);
        dispatch("changed");
    }

    async function uninstall() {
        if (!mod.installedMod) return;
        if (!(await confirmAction(`Uninstall ${mod.name}`, `Remove ${mod.name} and its files from the game?`))) return;
        const installed = mod.installedMod;
        await runTask(`Removing ${mod.name}...`, () => ModDatabase.uninstallMod(installed), `${mod.name} removed.`);
        dispatch("changed");
    }

    async function fixLayout() {
        if (!mod.installedMod) return;
        const installed = mod.installedMod;
        const where = installed.layoutIssue === "nested"
            ? `It was extracted into an extra folder inside Mods.`
            : `Its .dll is in the game folder instead of Mods.`;
        if (!(await confirmAction(`Fix ${mod.name}`, `${where} RedLoader won't load it there.

Move ${installed.modName}.dll and the ${installed.modName} folder directly into ${installed.targetFolder}?`))) return;
        await runTask(`Fixing ${mod.name}...`, () => ModDatabase.fixLayout(installed), `${mod.name} moved to the right folder.`);
        dispatch("changed");
    }

    async function toggle() {
        if (!mod.installedMod || toggling) return;
        toggling = true;
        try {
            await ModDatabase.toggleMod(mod.installedMod, !mod.installedMod.isEnabled);
            mod = mod;
        } catch (error) {
            notify(`Couldn't change ${mod.name}: ${errorMessage(error)}`, "error");
        } finally {
            toggling = false;
        }
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
</script>

<article class="mod-card" class:disabled={mod.isInstalled && mod.installedMod && !mod.installedMod.isEnabled}>
    <div class="cover">
        {#if mod.imageUrl && !imageFailed}
            <img
                src={mod.imageUrl}
                alt=""
                loading="lazy"
                class:loaded={imageLoaded}
                on:load={() => imageLoaded = true}
                on:error={() => imageFailed = true}
            />
        {:else}
            <div class="cover-placeholder"><UilBox /></div>
        {/if}
        {#if mod.hasUpdate}
            <span class="badge badge-info cover-badge">Update</span>
        {:else if isLibrary}
            <span class="badge cover-badge">Library</span>
        {/if}
    </div>

    <div class="body">
        <div class="title-row">
            <h3 class="title" title={mod.name}>{mod.name}</h3>
            {#if !mod.isLocalOnly}
                <button class="btn-ghost link-btn" title="View on sotf-mods.com" on:click={() => ModDatabase.openModPage(mod)}>
                    <UilExternalLinkAlt />
                </button>
            {/if}
        </div>
        <span class="author">by {mod.user?.name ?? "Unknown"}</span>
        <p class="desc">{mod.shortDescription ?? (mod.isLocalOnly ? "Installed locally, not listed on sotf-mods.com." : "")}</p>

        <div class="meta">
            <span title="Latest version">
                {#if mod.hasUpdate && installedVersion}v{installedVersion} → {/if}v{mod.latestVersion}
            </span>
            {#if mod.lastReleasedAt}<span>{formatDate(mod.lastReleasedAt)}</span>{/if}
            {#if mod.category?.name}<span>{mod.category.name}</span>{/if}
        </div>
    </div>

    {#if layoutIssue}
        <div class="layout-warning">
            <UilExclamationTriangle />
            <span>In the wrong folder, so RedLoader won't load it.</span>
            <button class="link" on:click={fixLayout}>Fix</button>
        </div>
    {/if}

    <div class="footer">
        {#if mod.isInstalled}
            {#if !isLibrary && mod.installedMod}
                <label class="switch" title={mod.installedMod.isEnabled ? "Enabled — click to disable" : "Disabled — click to enable"}>
                    <input type="checkbox" checked={mod.installedMod.isEnabled} disabled={toggling} on:change={toggle} />
                    <span class="switch-track"></span>
                    <span class="switch-label">{mod.installedMod.isEnabled ? "Enabled" : "Disabled"}</span>
                </label>
            {/if}
            <span class="spacer"></span>
            {#if mod.hasUpdate}
                <button class="btn-info" on:click={update}><UilSync /> Update</button>
            {/if}
            <button class="btn-danger" title="Uninstall" on:click={uninstall}><UilTrashAlt />{mod.hasUpdate ? "" : " Uninstall"}</button>
        {:else}
            <span class="spacer"></span>
            <button class="btn-success" on:click={install}><UilArrowCircleDown /> Install</button>
        {/if}
    </div>
</article>

<style>
    .mod-card {
        display: flex;
        flex-direction: column;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
        transition: border-color 0.15s;
    }

    .mod-card:hover {
        border-color: var(--border-strong);
    }

    .mod-card.disabled .cover,
    .mod-card.disabled .body {
        opacity: 0.55;
    }

    .cover {
        position: relative;
        aspect-ratio: 16 / 7;
        overflow: hidden;
        background: var(--surface-2);
    }

    .cover img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.25s;
    }

    .cover img.loaded {
        opacity: 1;
    }

    .cover-placeholder {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 2.2em;
        color: var(--surface-3);
    }

    .cover-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        backdrop-filter: blur(6px);
    }

    .body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 12px 14px 0;
    }

    .title-row {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .title {
        flex: 1;
        min-width: 0;
        font-size: 1.02em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .link-btn {
        padding: 4px;
        margin: -4px -6px -4px 0;
    }

    .author {
        font-size: 0.85em;
        color: var(--text-faint);
    }

    .desc {
        margin-top: 6px;
        font-size: 0.88em;
        color: var(--text-muted);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.9em;
    }

    .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 12px;
        margin-top: 8px;
        font-size: 0.8em;
        color: var(--text-faint);
    }

    .layout-warning {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 10px 14px 0;
        padding: 6px 10px;
        border-radius: var(--radius-sm);
        background: var(--warning-soft);
        color: var(--warning);
        font-size: 0.82em;
    }

    .layout-warning span {
        flex: 1;
    }

    .layout-warning button.link {
        color: inherit;
        text-decoration: underline;
    }

    .footer {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 12px 14px 14px;
    }

    .footer button {
        padding: 0.4em 0.85em;
    }

    .spacer {
        flex: 1;
    }

    .switch {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.85em;
        color: var(--text-muted);
    }

    .switch input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }

    .switch-track {
        position: relative;
        width: 32px;
        height: 18px;
        border-radius: 999px;
        background: var(--surface-3);
        transition: background-color 0.15s;
    }

    .switch-track::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--text-muted);
        transition: transform 0.15s, background-color 0.15s;
    }

    .switch input:checked + .switch-track {
        background: var(--success);
    }

    .switch input:checked + .switch-track::after {
        transform: translateX(14px);
        background: #fff;
    }

    .switch input:focus-visible + .switch-track {
        outline: 2px solid var(--info);
        outline-offset: 2px;
    }
</style>
