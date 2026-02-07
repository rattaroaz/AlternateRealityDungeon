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
        public int Level { get; set; } = 0;  // Start at level 0, level up to 1 at 1000 XP
        public int Hitpoints { get; set; }
        public int Experience { get; set; }
        public PlayerStats Stats { get; set; } = new PlayerStats();
        public PlayerStats BaseStats { get; set; } = new PlayerStats();  // Base stats before equipment bonuses
        public string? PrimaryWeapon { get; set; }    // Primary weapon for attack
        public string? SecondaryWeapon { get; set; }  // Secondary weapon for defense only
        public Dictionary<string, string?> EquippedClothing { get; set; } = new Dictionary<string, string?>()
        {
            { "Head", null }, { "Hands", null }, { "Arms", null }, { "Body", null }, { "Legs", null }, { "Feet", null }
        };
        public Dictionary<string, List<string>> GroundItems { get; set; } = new Dictionary<string, List<string>>();
        public List<InventoryItem> Inventory { get; set; } = new List<InventoryItem>();
        public bool ShowInventory { get; set; }
        public bool ShowLoseMode { get; set; }
        public bool ShowGetMode { get; set; }
        public int GetItemIndex { get; set; }
        public bool ShowUseMode { get; set; }
        public int UseItemIndex { get; set; }
    }

    // Map data passed along with loaded games
    public class LoadedMapData
    {
        public string? Id { get; set; }
        public int Width { get; set; } = 65;
        public int Height { get; set; } = 65;
        public int NumLevels { get; set; } = 4;
        public int PlayerStartX { get; set; } = 32;
        public int PlayerStartY { get; set; } = 32;
        public int[][][] Levels { get; set; } = Array.Empty<int[][]>();
        // Edge-based walls
        public bool[][][] HWalls { get; set; } = Array.Empty<bool[][]>();
        public bool[][][] VWalls { get; set; } = Array.Empty<bool[][]>();
        // Edge-based doors: 0=none, 1=normal, 2=hidden, 3=one-way positive (S/E), 4=one-way negative (N/W)
        public int[][][] HDoors { get; set; } = Array.Empty<int[][]>();
        public int[][][] VDoors { get; set; } = Array.Empty<int[][]>();
    }

    public class PlayerState
    {
        public PlayerStats? Stats { get; private set; }

        public CameraState? LastCameraState { get; private set; }

        public GameState? LoadedGameState { get; private set; }
        
        public LoadedMapData? CurrentMapData { get; private set; }

        public bool HasStats => Stats != null;

        public void SetStats(PlayerStats stats)
        {
            GameLogger.LogInfo("PlayerState", "Player stats updated", new { 
                name = stats.Name, 
                stamina = stats.Stamina, 
                strength = stats.Strength,
                intelligence = stats.Intelligence 
            });
            Stats = stats;
        }

        public void SetCameraState(CameraState cameraState)
        {
            LastCameraState = cameraState;
        }

        public void SetLoadedGameState(GameState gameState)
        {
            if (gameState != null)
            {
                GameLogger.LogInfo("PlayerState", "Game state loaded", new { 
                    name = gameState.Name, 
                    level = gameState.Level, 
                    hitpoints = gameState.Hitpoints,
                    experience = gameState.Experience,
                    inventoryCount = gameState.Inventory.Count
                });
            }
            else
            {
                GameLogger.LogInfo("PlayerState", "Game state cleared");
            }
            LoadedGameState = gameState;
        }
        
        public void SetCurrentMapData(LoadedMapData? mapData)
        {
            if (mapData != null)
            {
                GameLogger.LogInfo("PlayerState", "Map data set", new { 
                    id = mapData.Id, 
                    width = mapData.Width, 
                    height = mapData.Height,
                    numLevels = mapData.NumLevels,
                    playerStartX = mapData.PlayerStartX,
                    playerStartY = mapData.PlayerStartY
                });
            }
            else
            {
                GameLogger.LogInfo("PlayerState", "Map data cleared");
            }
            CurrentMapData = mapData;
        }

        public void ClearCameraState()
        {
            LastCameraState = null;
        }

        public void ClearLoadedGameState()
        {
            LoadedGameState = null;
        }
        
        public void ClearCurrentMapData()
        {
            CurrentMapData = null;
        }
    }
}
