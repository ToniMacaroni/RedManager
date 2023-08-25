<script lang="ts">
    import InstallFeature from "../lib/InstallationComponent.svelte";
    import PathSelector from "../lib/PathSelector.svelte";
    import { ueFeature } from "../lib/featureInstaller";
    import { isPathValid } from "../lib/store";

    let features = [ueFeature];
</script>

<div class="column">
    {#if $isPathValid}
        {#each features as feature}
            <InstallFeature feature={feature} />
        {/each}
    {/if}
</div>
