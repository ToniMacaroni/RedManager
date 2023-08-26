<script lang="ts">
    import FeatureList from "../lib/FeatureList.svelte";
import InstallFeature from "../lib/InstallationComponent.svelte";
    import PathSelector from "../lib/PathSelector.svelte";
    import { ueFeature } from "../lib/featureInstaller";
    import { isPathValid } from "../lib/store";

</script>

<FeatureList features={[ueFeature]} />
