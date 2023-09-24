<script lang="ts">
    import { onMount } from "svelte";
    import { Command } from "@tauri-apps/api/shell";
    import { get } from "svelte/store";
    import { gameExePath } from "../lib/store";
    import { dialog, path } from "@tauri-apps/api";
    import { processing, processName } from "../lib/store";

    $: isTemplateInstalled = false;
    $: modName = "MyMod";
    $: appendComments = true;

    async function checkForTemplate() {
        try {
            let cmd = new Command("dotnet-template-check", ["new", "sotfmod"]);
            let result = await cmd.execute();
            isTemplateInstalled = result.code === 0 && !result.stdout.includes("No templates or subcommands found");
        } catch (err) {
            console.log(err);
        }

        processing.set(false);
    }

    async function installTemplate() {
        try {
            processing.set(true);
            processName.set("Installing template...");

            let cmd = new Command("dotnet-install-template", ["new", "install", "RedLoader.Templates"]);
            await cmd.execute();
        } catch (err) {
            console.log(err);
        }

        await checkForTemplate();
    }

    async function createProject() {
        try {
            processing.set(true);
            processName.set("Creating project...");

            let targetLocation = "";
            let gameDir = await path.dirname(get(gameExePath));

            const diares = await dialog.open({
                directory: true,
                multiple: false,
            });

            if (diares && diares.length > 0) {
                const dir = diares as string;
                targetLocation = await path.join(dir, modName);
            }

            console.log(modName);
            console.log(targetLocation);
            console.log(gameDir);

            let argList = ["new", "sotfmod", "-n", modName, "-g", gameDir, "-o", targetLocation];
            if (!appendComments) {
                argList.push("-c", "false");
            }

            console.log(argList);
            console.log(`Checked ${appendComments}`);
    
            let cmd = new Command("dotnet-create-project", argList);
            let result = await cmd.execute();
            console.log(result.stdout);
            console.log(result.stderr);

            cmd = new Command("open-explorer", [targetLocation]);
            await cmd.execute();
        } catch (err) {
            console.log(err);
        }

        processing.set(false);
    }

    onMount(async () => {
        processing.set(true);
        processName.set("Checking for template...");
        
        await checkForTemplate();
    });
</script>

<div class="column">
    <b class="desc">
        Various tools for modders
    </b>
    {#if !isTemplateInstalled}
        <div class="description">
            <span>
                Install the template to create new mod projects in dotnet
            </span>
            <button class="generic-button" on:click={installTemplate}>Install Template</button>
        </div>
    {:else}
        <div class="description">
            <span>
                Create a new mod project using the game path set in the "Main" tab
            </span>
            <input class="generic-input" type="text" bind:value={modName} />
            <div class="form-checkbox">
                <input type="checkbox" id="check" bind:checked={appendComments}>
                <label for="check">
                  Append Comments
                </label>
                <p class="note">
                  Append documenting comments to the generated code. Recommended if it's your first mod.
                </p>
            </div>
            <button class="generic-button" on:click={createProject}>Create Project</button>
        </div>
    {/if}
</div>

<style>
    .desc {
        margin-bottom: 2em;
        display: block;
        text-align: center;
        color: #a2a2a2;
    }

    .generic-button {
        color: #659cf0;
    }

    .description {
        padding: 10px;
        border-radius: 10px;
        border: 2px dashed #414141;
    }
    
    .description > * {
        width: 100%;
    }

    .description > span {
        margin-bottom: 1em;
        display: block;
        text-align: center;
        font-size: 0.9em;
        color: #a2a2a2;
    }

    .generic-input {
        box-sizing: border-box;
        color: #a2a2a2;
        text-align: center;
        margin-bottom: 0.8em;
    }
</style>