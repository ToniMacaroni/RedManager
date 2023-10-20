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
    }

    .horizontal > * {
        /* margin-right: 1em; */
        flex: 1;
    }

    .button-wrapper {
        width: 100%;
        flex: 1;
    }
</style>