using SonsSdk;

namespace src_tauri;

public class src_tauri : SonsMod
{
    public override void OnInitializeMod()
    {
        // Do your early mod initialization which doesn't involve game or sdk stuff here
    }

    protected override void OnSdkInitialized()
    {
        // Do your mod initialization which involves game or sdk stuff here
        // This is for stuff like UI creation event registration etc.
        
        src_tauriUi.Create();
    }

    protected override void OnGameStart()
    {
        // This is called once the player spawns in the world and gains control.
    }
    
    // This is called every frame.
    // public override void OnUpdate()
    // {
    // }
}