<script lang="ts">
    import InstallFeature from "../lib/InstallationComponent.svelte";
    import PathSelector from "../lib/PathSelector.svelte";
    import { debugInstaller, loaderFeature, bieFeature, melonFeature } from "../lib/featureInstaller";
    import { gameExePath, isPathValid } from "../lib/store";

    let features = [bieFeature, melonFeature, loaderFeature];
</script>

<div class="column">
    <PathSelector />
    {#if $isPathValid}
        {#each features as feature}
            <InstallFeature feature={feature} />
        {/each}
    {/if}
</div>
