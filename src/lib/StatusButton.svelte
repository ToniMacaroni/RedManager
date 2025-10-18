<script lang="ts">
    export let isUpdateAvailable: boolean;
    export let isModInstalled: boolean;

    export let update: () => Promise<void>;
    export let uninstall: () => Promise<void>;
    export let install: () => Promise<void>;
</script>

{#if isUpdateAvailable}
    <div class="horizontal">
        <button class="update btn-left button-wrapper" on:click={update}>Update</button>
        <button class="uninstall btn-right button-wrapper" on:click={uninstall}>Uninstall</button>
    </div>
{:else}
    {#if isModInstalled}
        <button class="uninstall button-wrapper" on:click={uninstall}>Uninstall</button>
    {:else}
        <button class="install button-wrapper" on:click={install}>Install</button>
    {/if}
{/if}

  
<style>
    .horizontal {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%; /* Full width */
        max-width: none; /* No restrictions */
        margin: 0; /* No auto margins */
        box-sizing: border-box;
    }

    .horizontal > * {
        /* margin-right: 1em; */
        flex: 1;
    }

    .button-wrapper {
        width: 100%; /* Full width of container */
        max-width: none; /* Remove width restrictions */
        margin: 0; /* No auto margins needed */
        display: block;
        box-sizing: border-box;
    }

    .install {
        color: #a0a0a0 !important; /* More gray text */
        background-color: #0f1e2e !important; /* Darker blue background */
        border: 1px solid rgba(252,252,252,0.1) !important; /* Restore gray border */
    }

    .install:hover {
        color: #a0a0a0 !important; /* Keep gray text on hover */
        background-color: #1a365d !important; /* Slightly lighter blue on hover */
        border: 1px solid rgba(252,252,252,0.1) !important; /* Keep gray border */
    }

    .uninstall {
        color: #a0a0a0 !important; /* More gray text */
        background-color: #2d0a0a !important; /* Darker red background */
        border: 1px solid rgba(252,252,252,0.1) !important; /* Restore gray border */
    }

    .uninstall:hover {
        color: #a0a0a0 !important; /* Keep gray text on hover */
        background-color: #4a1515 !important; /* Slightly lighter red on hover */
        border: 1px solid rgba(252,252,252,0.1) !important; /* Keep gray border */
    }

    .update {
        color: #a0a0a0 !important; /* More gray text */
        background-color: #0f1e2e !important; /* Same blue as Install button */
        border: 1px solid rgba(252,252,252,0.1) !important; /* Gray border */
    }

    .update:hover {
        color: #a0a0a0 !important; /* Keep gray text on hover */
        background-color: #1a365d !important; /* Same hover blue as Install button */
        border: 1px solid rgba(252,252,252,0.1) !important; /* Keep gray border */
    }
</style>