namespace AlternateRealityDungeon
{
    public class PlayerStats
    {
        public string Name { get; set; } = "Adventurer";
        public int Stamina { get; set; }
        public int Charisma { get; set; }
        public int Strength { get; set; }
        public int Intelligence { get; set; }
        public int Wisdom { get; set; }
        public int Skill { get; set; }
        public int Speed { get; set; }
    }

    public class CameraState
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double Z { get; set; }
        public double Yaw { get; set; }
    }

    public class InventoryItem
    {
        public string Name { get; set; } = "";
        public int Count { get; set; }
        public bool Equipped { get; set; }
    }

    public class GameState
    {
        public string Name { get; set; } = "Adventurer";
        public int Level { get; set; } = 1;
        public int Hitpoints { get; set; }
        public int Experience { get; set; }
        public PlayerStats Stats { get; set; } = new PlayerStats();
        public Dictionary<string, List<string>> GroundItems { get; set; } = new Dictionary<string, List<string>>();
        public List<InventoryItem> Inventory { get; set; } = new List<InventoryItem>();
        public bool ShowInventory { get; set; }
        public bool ShowLoseMode { get; set; }
        public bool ShowGetMode { get; set; }
        public int GetItemIndex { get; set; }
    }

    public class PlayerState
    {
        public PlayerStats? Stats { get; private set; }

        public CameraState? LastCameraState { get; private set; }

        public GameState? LoadedGameState { get; private set; }

        public bool HasStats => Stats != null;

        public void SetStats(PlayerStats stats)
        {
            Stats = stats;
        }

        public void SetCameraState(CameraState cameraState)
        {
            LastCameraState = cameraState;
        }

        public void SetLoadedGameState(GameState gameState)
        {
            LoadedGameState = gameState;
        }

        public void ClearCameraState()
        {
            LastCameraState = null;
        }

        public void ClearLoadedGameState()
        {
            LoadedGameState = null;
        }
    }
}
