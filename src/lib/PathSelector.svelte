<script lang="ts">
    import { dialog, path } from "@tauri-apps/api";
    import { gameExePath, isPathValid, notify, setGamePath } from "./store";
    import UilFolderOpen from "~icons/uil/folder-open";
    import UilCheckCircle from "~icons/uil/check-circle";
    import UilExclamationTriangle from "~icons/uil/exclamation-triangle";

    async function selectPath() {
        try {
            const result = await dialog.open({
                multiple: false,
                title: "Select SonsOfTheForest.exe",
                defaultPath: $gameExePath ? await path.dirname($gameExePath) : undefined,
                filters: [{ name: "Sons of the Forest", extensions: ["exe"] }],
            });
            if (typeof result !== "string") return;

            if (!(await setGamePath(result))) {
                notify("That isn't SonsOfTheForest.exe. Pick the exe inside the game's install folder.", "error");
            }
        } catch (error) {
            console.error("Error selecting path:", error);
        }
    }
</script>

<div class="card path-card">
    <div class="path-header">
        <span class="label">Game location</span>
        {#if $isPathValid}
            <span class="badge badge-success"><UilCheckCircle /> Found</span>
        {:else}
            <span class="badge badge-warning"><UilExclamationTriangle /> Not set</span>
        {/if}
    </div>
    <div class="path-row">
        <input
            type="text"
            readonly
            value={$gameExePath}
            placeholder="Couldn't find the game automatically. Browse to SonsOfTheForest.exe"
            title={$gameExePath}
        />
        <button on:click={selectPath}><UilFolderOpen /> Browse</button>
    </div>
</div>

<style>
    .path-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .path-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .label {
        font-weight: 600;
    }

    .path-row {
        display: flex;
        gap: 8px;
    }

    .path-row input {
        flex: 1;
        color: var(--text-muted);
        font-family: 'Cascadia Mono', Consolas, monospace;
        font-size: 0.85em;
        text-overflow: ellipsis;
    }
</style>
