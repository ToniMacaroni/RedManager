<script lang="ts">
    import InstallFeature from "../lib/InstallationComponent.svelte";
    import { isPathValid } from "../lib/store";
    import type { FeatureInstaller } from "./featureInstaller";

    export let features: FeatureInstaller[] = [];
</script>

{#if $isPathValid}
    {#each features as feature}
        <InstallFeature feature={feature} />
    {/each}
{/if}
