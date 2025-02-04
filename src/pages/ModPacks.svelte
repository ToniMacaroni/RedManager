<script lang="ts">
    import { onMount } from "svelte";
    import { processing, processName } from "../lib/store";
    import FeatureList from "../lib/FeatureList.svelte";
    import { ueFeature } from "../lib/featureInstaller";

    onMount(async () => {
        //processing.set(true);
        //processName.set("Checking for template...");
    });
</script>

<div class="column">
    <div class="modpack-container">
        <b class="header-text">
            COMMUNITY PACK
        </b>
        <span class="pack-description">
            Community rebalanced version of Sons Of The Forest.
        </span>
        <span class="mod-list">
            <ul>
                <li class="mod-text">Mod 1</li>
                <li class="mod-text">Mod 2</li>
                <li class="mod-text">Mod 3</li>
            </ul>
        </span>
        <br>
        <button class="generic-button">Install Pack</button>
    </div>
    <br />
</div>

<style>
    .header-text {
        margin-bottom: 1em;
        display: block;
        text-align: center;
        letter-spacing: 0.3em;
        color: #dd7171;
    }

    .generic-button {
        color: #659cf0;
    }

    .modpack-container {
        padding: 10px;
        border-radius: 10px;
        border-bottom: 2px solid #333;
        background-color: #121212;
    }
    
    .modpack-container > * {
        width: 100%;
    }

    .pack-description {
        margin-bottom: 1em;
        display: block;
        text-align: center;
        font-size: 0.9em;
        color: #a2a2a2;
    }
    .mod-list {
        display: block;
        text-align: left;
    }
    .mod-text {
        color: #606060;
    }
</style>