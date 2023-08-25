<script lang="ts">
    import { fs, dialog } from "@tauri-apps/api";
    import { writable } from "svelte/store";
    import { gameExePath, isPathValid } from "./store";

    async function selectPath() {
        try {
            const result = await dialog.open({
                multiple: false,
                filters: [{ name: "Executable", extensions: ["exe"] }],
            });
            if (result && result.length > 0) {
                const exe = result as string;
                if (exe.endsWith("SonsOfTheForest.exe")) {
                    gameExePath.set(result as string);
                    isPathValid.set(true);
                }
            }
        } catch (error) {
            console.error("Error selecting path:", error);
        }
    }
</script>

<div id="path-selector">
    <input class="path-input" type="text" bind:value={$gameExePath} readonly />
    <button class="select-btn" on:click={selectPath}>...</button>
</div>

<style>
    #path-selector {
        margin-bottom: 1em;
        display: flex;
        width: 100%;
        align-items: center;
    }

    .path-input {
        flex: 1; /* Takes up all available space */
        box-sizing: border-box;
        height: 100%; /* Ensures that it takes the full height of its parent */
        margin: 0; /* Removes default margin from input */
        border-radius: 8px 0 0 8px;
        width: 80%;
        color: #a2a2a2;
        text-align: center;
        /* font-family: "Roboto Mono", monospace; */
    }

    .select-btn {
        border-radius: 0 8px 8px 0;
        height: 100%; /* Ensures that it takes the full height of its parent */
        margin: 0; /* Removes default margin from button */
        box-sizing: border-box;
    }
</style>
