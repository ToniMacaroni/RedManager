<script lang="ts">
    import InstallFeature from "../lib/InstallationComponent.svelte";
    import PathSelector from "../lib/PathSelector.svelte";
    import { debugInstaller, loaderFeature, bieFeature, melonFeature } from "../lib/featureInstaller";
    import { gameExePath, isPathValid, isDotnetInstalled } from "../lib/store";

    let features = [bieFeature, melonFeature, loaderFeature];
</script>

<div class="column">
    <center><img class="big-logo" src="https://raw.githubusercontent.com/ToniMacaroni/SonsModLoader/master/Resources/redlogo.png" alt="Red" width="300"/></center>
    <br>
    <PathSelector />
    {#if $isPathValid}
        {#each features as feature}
            <InstallFeature feature={feature} />
        {/each}
    {/if}
    {#if $isDotnetInstalled}
        <br>
        <span style="color: #a2a2a2;font-weight: 500"><a href="https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/runtime-desktop-6.0.21-windows-x64-installer" target="_blank">Dotnet 6</a> is needed for the loader to work!</span>
    {/if}
</div>
