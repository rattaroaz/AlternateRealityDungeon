using System.Text.Json;

namespace AlternateRealityDungeon.Services;

public class MapStorageService
{
    private const string MapStorageKey = "dungeon_maps";
    private const string DefaultMapKey = "default_map";
    private const int MaxMapsPerSlot = 10;
    private const int MapWidth = 65;
    private const int MapHeight = 65;
    private const int NumLevels = 4;

    private readonly string _storagePath;
    private MapCollection? _cachedMaps;

    public MapStorageService() : this(null)
    {
    }

    public MapStorageService(string? storagePath)
    {
        _storagePath = string.IsNullOrWhiteSpace(storagePath)
            ? ResolveMapsStoragePath()
            : storagePath;
        Directory.CreateDirectory(_storagePath);
        GameLogger.LogInfo("MapStorage", "Storage initialized", new { path = _storagePath });
        if (string.IsNullOrWhiteSpace(storagePath))
            TryMigrateFromLegacyAppDataStorage();
    }

    /// <summary>
    /// Prefer the project repo's Data/Maps folder (so map editor saves can be committed to git).
    /// Falls back to Data/Maps beside the running app when no .csproj is found (mobile/published builds).
    /// </summary>
    private static string ResolveMapsStoragePath()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (dir.GetFiles("*.csproj").Length > 0)
            {
                return Path.Combine(dir.FullName, "Data", "Maps");
            }
            dir = dir.Parent;
        }

        return Path.Combine(AppContext.BaseDirectory, "Data", "Maps");
    }

    private void TryMigrateFromLegacyAppDataStorage()
    {
        var destination = GetStorageFilePath();
        if (File.Exists(destination))
            return;

        try
        {
            var legacyFile = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AlternateRealityDungeon",
                "maps",
                "map_collection.json");

            if (File.Exists(legacyFile))
            {
                File.Copy(legacyFile, destination);
                GameLogger.LogInfo("MapStorage", "Migrated map data from LocalAppData", new { destination });
            }
        }
        catch (Exception ex)
        {
            GameLogger.LogError("MapStorage", "Failed to migrate legacy map storage", ex);
        }
    }

    public class MapData
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = "Untitled";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int Width { get; set; } = 65;
        public int Height { get; set; } = 65;
        public int NumLevels { get; set; } = 4;
        public int PlayerStartX { get; set; } = 32;
        public int PlayerStartY { get; set; } = 32;
        public int[][][] Levels { get; set; } = Array.Empty<int[][]>();
        // Edge-based walls: HWalls[level][y][x] = horizontal wall on top edge of cell
        // VWalls[level][y][x] = vertical wall on left edge of cell
        public bool[][][] HWalls { get; set; } = Array.Empty<bool[][]>();
        public bool[][][] VWalls { get; set; } = Array.Empty<bool[][]>();
        // Edge-based doors (parallel to walls): 0=none, 1=normal, 2=hidden, 3=one-way positive (S/E), 4=one-way negative (N/W)
        public int[][][] HDoors { get; set; } = Array.Empty<int[][]>();
        public int[][][] VDoors { get; set; } = Array.Empty<int[][]>();
    }

    public static void NormalizeWallDoorExclusivity(MapData map)
    {
        if (map.HWalls == null || map.HDoors == null || map.VWalls == null || map.VDoors == null)
            return;

        for (int level = 0; level < Math.Min(NumLevels, map.HWalls.Length); level++)
        {
            if (map.HWalls[level] == null || map.HDoors[level] == null)
                continue;

            for (int y = 0; y <= MapHeight && y < map.HWalls[level].Length; y++)
            {
                if (map.HWalls[level][y] == null || map.HDoors[level][y] == null)
                    continue;

                for (int x = 0; x < MapWidth && x < map.HWalls[level][y].Length; x++)
                {
                    if (x < map.HDoors[level][y].Length && map.HDoors[level][y][x] > 0)
                        map.HWalls[level][y][x] = false;
                }
            }

            if (level >= map.VWalls.Length || map.VWalls[level] == null || map.VDoors[level] == null)
                continue;

            for (int y = 0; y < MapHeight && y < map.VWalls[level].Length; y++)
            {
                if (map.VWalls[level][y] == null || map.VDoors[level][y] == null)
                    continue;

                for (int x = 0; x <= MapWidth && x < map.VWalls[level][y].Length; x++)
                {
                    if (x < map.VDoors[level][y].Length && map.VDoors[level][y][x] > 0)
                        map.VWalls[level][y][x] = false;
                }
            }
        }
    }

    public class MapCollection
    {
        public MapData? DefaultMap { get; set; }
        public List<MapData> SavedMaps { get; set; } = new();
    }

    public class LegacySlotInfo
    {
        public int Slot { get; set; }
        public bool HasMapData { get; set; }
        public DateTime? SavedAt { get; set; }
        public string DisplayName { get; set; } = "";
    }

    private class LegacyGameSave
    {
        public string? MapId { get; set; }
        public int[][]? MapLevels { get; set; }
        public int MapPlayerStartX { get; set; } = 32;
        public int MapPlayerStartY { get; set; } = 32;
    }

    private string GetStorageFilePath() => Path.Combine(_storagePath, "map_collection.json");

    public async Task<MapCollection> LoadMapCollectionAsync()
    {
        if (_cachedMaps != null) return _cachedMaps;

        var filePath = GetStorageFilePath();
        if (File.Exists(filePath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(filePath);
                _cachedMaps = JsonSerializer.Deserialize<MapCollection>(json) ?? new MapCollection();
                if (_cachedMaps.DefaultMap != null)
                    NormalizeWallDoorExclusivity(_cachedMaps.DefaultMap);
                foreach (var savedMap in _cachedMaps.SavedMaps)
                {
                    if (savedMap != null)
                        NormalizeWallDoorExclusivity(savedMap);
                }
                GameLogger.LogInfo("MapStorage", "Loaded map collection", new
                {
                    path = filePath,
                    hasDefault = _cachedMaps.DefaultMap != null,
                    savedCount = _cachedMaps.SavedMaps.Count
                });
            }
            catch (Exception ex)
            {
                GameLogger.LogError("MapStorage", "Failed to deserialize map collection", ex);
                _cachedMaps = new MapCollection();
            }
        }
        else
        {
            _cachedMaps = new MapCollection();
        }

        if (_cachedMaps.DefaultMap == null)
        {
            var legacyMap = await TryLoadLegacyTemplateMapAsync();
            if (legacyMap != null)
            {
                _cachedMaps.DefaultMap = legacyMap;
                await SaveMapCollectionAsync(_cachedMaps);
            }
        }

        return _cachedMaps;
    }

    private async Task<MapData?> TryLoadLegacyTemplateMapAsync()
    {
        try
        {
            var databaseDir = Path.Combine(AppContext.BaseDirectory, "Database");
            if (!Directory.Exists(databaseDir)) return null;

            for (int slot = 1; slot <= 10; slot++)
            {
                var slotPath = Path.Combine(databaseDir, $"slot{slot}.json");
                if (!File.Exists(slotPath)) continue;

                var json = await File.ReadAllTextAsync(slotPath);
                if (string.IsNullOrWhiteSpace(json)) continue;

                var legacy = JsonSerializer.Deserialize<LegacyGameSave>(json);
                if (legacy?.MapLevels == null || legacy.MapLevels.Length == 0) continue;

                var map = ConvertLegacyMap(legacy, slot);
                if (map != null) return map;
            }
        }
        catch (Exception ex)
        {
            GameLogger.LogError("MapStorage", "Legacy template import failed", ex);
        }

        return null;
    }

    private static string GetLegacySlotPath(int slot) =>
        Path.Combine(AppContext.BaseDirectory, "Database", $"slot{slot}.json");

    private MapData? ConvertLegacyMap(LegacyGameSave legacy, int slotNumber)
    {
        if (legacy.MapLevels == null || legacy.MapLevels.Length < MapHeight) return null;

        var levels = new int[NumLevels][][];
        for (int level = 0; level < NumLevels; level++)
        {
            levels[level] = new int[MapHeight][];
            for (int y = 0; y < MapHeight; y++)
            {
                levels[level][y] = new int[MapWidth];
                var sourceRowIndex = level * MapHeight + y;
                if (sourceRowIndex >= legacy.MapLevels.Length) continue;
                var sourceRow = legacy.MapLevels[sourceRowIndex] ?? Array.Empty<int>();
                for (int x = 0; x < MapWidth && x < sourceRow.Length; x++)
                {
                    var legacyTile = sourceRow[x];
                    levels[level][y][x] = legacyTile switch
                    {
                        1 => 1, // Preserve legacy solid wall tiles
                        2 => 2, // Stairs down
                        3 => 3, // Stairs up
                        5 => 5,
                        6 => 6,
                        7 => 7,
                        8 => 8,
                        _ => 0
                    };
                }
            }
        }

        var hWalls = new bool[NumLevels][][];
        var vWalls = new bool[NumLevels][][];
        var hDoors = new int[NumLevels][][];
        var vDoors = new int[NumLevels][][];

        for (int level = 0; level < NumLevels; level++)
        {
            hWalls[level] = new bool[MapHeight + 1][];
            hDoors[level] = new int[MapHeight + 1][];
            for (int y = 0; y <= MapHeight; y++)
            {
                hWalls[level][y] = new bool[MapWidth];
                hDoors[level][y] = new int[MapWidth];
            }

            vWalls[level] = new bool[MapHeight][];
            vDoors[level] = new int[MapHeight][];
            for (int y = 0; y < MapHeight; y++)
            {
                vWalls[level][y] = new bool[MapWidth + 1];
                vDoors[level][y] = new int[MapWidth + 1];
            }

            // Perimeter walls
            for (int x = 0; x < MapWidth; x++)
            {
                hWalls[level][0][x] = true;
                hWalls[level][MapHeight][x] = true;
            }
            for (int y = 0; y < MapHeight; y++)
            {
                vWalls[level][y][0] = true;
                vWalls[level][y][MapWidth] = true;
            }

            // Convert legacy wall tiles (value 1) to edge walls.
            for (int y = 0; y < MapHeight; y++)
            {
                for (int x = 0; x < MapWidth; x++)
                {
                    bool hereWall = IsLegacyWall(level, x, y, legacy.MapLevels);
                    bool northWall = IsLegacyWall(level, x, y - 1, legacy.MapLevels);
                    bool southWall = IsLegacyWall(level, x, y + 1, legacy.MapLevels);
                    bool westWall = IsLegacyWall(level, x - 1, y, legacy.MapLevels);
                    bool eastWall = IsLegacyWall(level, x + 1, y, legacy.MapLevels);

                    if (hereWall != northWall) hWalls[level][y][x] = true;
                    if (hereWall != southWall) hWalls[level][y + 1][x] = true;
                    if (hereWall != westWall) vWalls[level][y][x] = true;
                    if (hereWall != eastWall) vWalls[level][y][x + 1] = true;
                }
            }
        }

        return new MapData
        {
            Name = $"Legacy Slot {slotNumber} Template",
            CreatedAt = DateTime.UtcNow,
            Width = MapWidth,
            Height = MapHeight,
            NumLevels = NumLevels,
            PlayerStartX = legacy.MapPlayerStartX,
            PlayerStartY = legacy.MapPlayerStartY,
            Levels = levels,
            HWalls = hWalls,
            VWalls = vWalls,
            HDoors = hDoors,
            VDoors = vDoors
        };
    }

    private bool IsLegacyWall(int level, int x, int y, int[][] legacyFlatRows)
    {
        if (x < 0 || x >= MapWidth || y < 0 || y >= MapHeight) return true;
        var rowIndex = level * MapHeight + y;
        if (rowIndex < 0 || rowIndex >= legacyFlatRows.Length) return true;
        var row = legacyFlatRows[rowIndex];
        if (row == null || x >= row.Length) return true;
        return row[x] == 1;
    }

    public async Task SaveMapCollectionAsync(MapCollection collection)
    {
        _cachedMaps = collection;
        var filePath = GetStorageFilePath();
        var json = JsonSerializer.Serialize(collection, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(filePath, json);
        GameLogger.LogInfo("MapStorage", "Saved map collection", new
        {
            path = filePath,
            hasDefault = collection.DefaultMap != null,
            savedCount = collection.SavedMaps.Count
        });
    }

    public async Task<MapData?> GetDefaultMapAsync()
    {
        var collection = await LoadMapCollectionAsync();
        if (collection.DefaultMap != null)
            NormalizeWallDoorExclusivity(collection.DefaultMap);
        return collection.DefaultMap;
    }

    public async Task SetDefaultMapAsync(MapData map)
    {
        NormalizeWallDoorExclusivity(map);
        var collection = await LoadMapCollectionAsync();
        collection.DefaultMap = map;
        await SaveMapCollectionAsync(collection);
    }

    public async Task<List<MapData>> GetSavedMapsAsync()
    {
        var collection = await LoadMapCollectionAsync();
        return collection.SavedMaps;
    }

    public async Task<List<LegacySlotInfo>> GetLegacySlotInfosAsync()
    {
        var results = new List<LegacySlotInfo>();
        for (int slot = 1; slot <= 10; slot++)
        {
            var path = GetLegacySlotPath(slot);
            if (!File.Exists(path))
            {
                results.Add(new LegacySlotInfo { Slot = slot, HasMapData = false, DisplayName = "(Empty)" });
                continue;
            }

            try
            {
                var json = await File.ReadAllTextAsync(path);
                var legacy = JsonSerializer.Deserialize<LegacyGameSave>(json);
                bool hasMap = legacy?.MapLevels != null && legacy.MapLevels.Length >= MapHeight;
                results.Add(new LegacySlotInfo
                {
                    Slot = slot,
                    HasMapData = hasMap,
                    SavedAt = File.GetLastWriteTime(path),
                    DisplayName = hasMap ? $"Legacy Slot {slot} Template" : "(No map data)"
                });
            }
            catch (Exception ex)
            {
                GameLogger.LogError("MapStorage", $"Failed to read legacy slot {slot}", ex);
                results.Add(new LegacySlotInfo
                {
                    Slot = slot,
                    HasMapData = false,
                    SavedAt = File.GetLastWriteTime(path),
                    DisplayName = "(Unreadable)"
                });
            }
        }

        return results;
    }

    public async Task<MapData?> ImportFromLegacySlotAsync(int slot)
    {
        if (slot < 1 || slot > 10) return null;
        var path = GetLegacySlotPath(slot);
        if (!File.Exists(path)) return null;

        try
        {
            var json = await File.ReadAllTextAsync(path);
            var legacy = JsonSerializer.Deserialize<LegacyGameSave>(json);
            if (legacy?.MapLevels == null || legacy.MapLevels.Length < MapHeight) return null;
            var map = ConvertLegacyMap(legacy, slot);
            if (map != null)
                NormalizeWallDoorExclusivity(map);
            return map;
        }
        catch (Exception ex)
        {
            GameLogger.LogError("MapStorage", $"Failed to import legacy slot {slot}", ex);
            return null;
        }
    }

    public async Task<MapData?> GetMapByIdAsync(string? mapId)
    {
        if (string.IsNullOrEmpty(mapId)) return null;
        
        var collection = await LoadMapCollectionAsync();
        
        // Check if it's the default map
        if (collection.DefaultMap?.Id == mapId)
        {
            NormalizeWallDoorExclusivity(collection.DefaultMap);
            return collection.DefaultMap;
        }
        
        // Check saved maps
        var saved = collection.SavedMaps.FirstOrDefault(m => m?.Id == mapId);
        if (saved != null)
            NormalizeWallDoorExclusivity(saved);
        return saved;
    }

    public async Task SaveMapToSlotAsync(MapData map, int slotIndex)
    {
        var collection = await LoadMapCollectionAsync();
        
        // Ensure we have enough slots
        while (collection.SavedMaps.Count <= slotIndex)
        {
            collection.SavedMaps.Add(null!);
        }

        // Limit to MaxMapsPerSlot
        if (slotIndex >= MaxMapsPerSlot)
        {
            slotIndex = MaxMapsPerSlot - 1;
        }

        collection.SavedMaps[slotIndex] = map;
        GameLogger.LogInfo("MapStorage", "Saved map to slot", new { slotIndex, mapName = map.Name, mapId = map.Id });
        
        NormalizeWallDoorExclusivity(map);
        // Clean up nulls and limit size
        collection.SavedMaps = collection.SavedMaps
            .Where(m => m != null)
            .Take(MaxMapsPerSlot)
            .ToList();

        await SaveMapCollectionAsync(collection);
    }

    public async Task DeleteMapAtSlotAsync(int slotIndex)
    {
        var collection = await LoadMapCollectionAsync();
        if (slotIndex >= 0 && slotIndex < collection.SavedMaps.Count)
        {
            collection.SavedMaps.RemoveAt(slotIndex);
            GameLogger.LogInfo("MapStorage", "Deleted map slot", new { slotIndex });
            await SaveMapCollectionAsync(collection);
        }
    }

    // Generate a procedural map (fallback when no default exists)
    public MapData GenerateProceduralMap()
    {
        GameLogger.LogInfo("MapGenerate", "Procedural map generation started");

        try
        {
            var map = new MapData
            {
                Name = "Procedural Dungeon",
                CreatedAt = DateTime.UtcNow,
                Width = MapWidth,
                Height = MapHeight,
                NumLevels = NumLevels,
                PlayerStartX = 32,
                PlayerStartY = 32,
                Levels = new int[NumLevels][][],
                HWalls = new bool[NumLevels][][],
                VWalls = new bool[NumLevels][][],
                HDoors = new int[NumLevels][][],
                VDoors = new int[NumLevels][][]
            };

            var random = new Random();
            var roomsByLevel = new List<(int x, int y, int w, int h, int cx, int cy)>[NumLevels];

            // Initialize every level first so stair placement can write to the next level.
            for (int level = 0; level < NumLevels; level++)
            {
                InitializeGeneratedLevel(map, level);
                roomsByLevel[level] = GenerateRoomsForLevel(map, level, random);
                GameLogger.LogInfo("MapGenerate", "Generated rooms for level", new
                {
                    level,
                    roomCount = roomsByLevel[level].Count
                });
            }

            for (int level = 0; level < NumLevels - 1; level++)
            {
                PlaceStairs(map, level, roomsByLevel[level], random);
            }

            NormalizeWallDoorExclusivity(map);

            var structureErrors = MapValidation.ValidateStructure(map);
            var stairErrors = MapValidation.ValidateStairs(map);
            if (structureErrors.Count > 0 || stairErrors.Count > 0)
            {
                GameLogger.LogWarning("MapGenerate", "Generated map failed validation", new
                {
                    structureErrors,
                    stairErrors
                });
            }
            else
            {
                GameLogger.LogInfo("MapGenerate", "Procedural map generation completed", new
                {
                    width = map.Width,
                    height = map.Height,
                    levels = map.NumLevels,
                    playerStartX = map.PlayerStartX,
                    playerStartY = map.PlayerStartY
                });
            }

            return map;
        }
        catch (Exception ex)
        {
            GameLogger.LogError("MapGenerate", "Procedural map generation failed", ex);
            throw;
        }
    }

    private static void InitializeGeneratedLevel(MapData map, int level)
    {
        map.Levels[level] = new int[MapHeight][];
        for (int y = 0; y < MapHeight; y++)
        {
            map.Levels[level][y] = new int[MapWidth];
            for (int x = 0; x < MapWidth; x++)
            {
                map.Levels[level][y][x] = 0; // Floor
            }
        }

        map.HWalls[level] = new bool[MapHeight + 1][];
        for (int y = 0; y <= MapHeight; y++)
        {
            map.HWalls[level][y] = new bool[MapWidth];
            for (int x = 0; x < MapWidth; x++)
            {
                map.HWalls[level][y][x] = (y == 0 || y == MapHeight);
            }
        }

        map.VWalls[level] = new bool[MapHeight][];
        for (int y = 0; y < MapHeight; y++)
        {
            map.VWalls[level][y] = new bool[MapWidth + 1];
            for (int x = 0; x <= MapWidth; x++)
            {
                map.VWalls[level][y][x] = (x == 0 || x == MapWidth);
            }
        }

        map.HDoors[level] = new int[MapHeight + 1][];
        for (int y = 0; y <= MapHeight; y++)
        {
            map.HDoors[level][y] = new int[MapWidth];
        }

        map.VDoors[level] = new int[MapHeight][];
        for (int y = 0; y < MapHeight; y++)
        {
            map.VDoors[level][y] = new int[MapWidth + 1];
        }
    }

    private List<(int x, int y, int w, int h, int cx, int cy)> GenerateRoomsForLevel(MapData map, int level, Random random)
    {
        var rooms = new List<(int x, int y, int w, int h, int cx, int cy)>();
        int numRooms = random.Next(8, 13);

        for (int i = 0; i < numRooms; i++)
        {
            int w = random.Next(4, 11);
            int h = random.Next(4, 11);
            int x = random.Next(1, MapWidth - w - 1);
            int y = random.Next(1, MapHeight - h - 1);

            bool overlaps = rooms.Any(r =>
                x < r.x + r.w + 1 && x + w + 1 > r.x &&
                y < r.y + r.h + 1 && y + h + 1 > r.y);

            if (!overlaps)
            {
                for (int ry = y; ry < y + h && ry < MapHeight - 1; ry++)
                {
                    for (int rx = x; rx < x + w && rx < MapWidth - 1; rx++)
                    {
                        if (rx > 0 && ry > 0)
                            map.Levels[level][ry][rx] = 0;
                    }
                }
                rooms.Add((x, y, w, h, x + w / 2, y + h / 2));
            }
        }

        for (int i = 1; i < rooms.Count; i++)
        {
            CarveCorridor(map.Levels[level], rooms[i - 1].cx, rooms[i - 1].cy, rooms[i].cx, rooms[i].cy, random);
        }
        if (rooms.Count > 2)
        {
            CarveCorridor(map.Levels[level], rooms[^1].cx, rooms[^1].cy, rooms[0].cx, rooms[0].cy, random);
        }

        if (level == 0)
        {
            for (int dy = -2; dy <= 2; dy++)
            {
                for (int dx = -2; dx <= 2; dx++)
                {
                    int px = map.PlayerStartX + dx;
                    int py = map.PlayerStartY + dy;
                    if (px > 0 && px < MapWidth - 1 && py > 0 && py < MapHeight - 1)
                    {
                        map.Levels[level][py][px] = 0;
                    }
                }
            }

            if (rooms.Count > 0)
            {
                var nearest = rooms.OrderBy(r =>
                    Math.Abs(r.cx - map.PlayerStartX) + Math.Abs(r.cy - map.PlayerStartY)).First();
                CarveCorridor(map.Levels[level], map.PlayerStartX, map.PlayerStartY, nearest.cx, nearest.cy, random);
            }
        }

        return rooms;
    }

    private void CarveCorridor(int[][] levelMap, int x1, int y1, int x2, int y2, Random random)
    {
        int x = x1, y = y1;
        while (x != x2 || y != y2)
        {
            if (x >= 0 && x < MapWidth && y >= 0 && y < MapHeight)
                levelMap[y][x] = 0; // Floor

            if (random.NextDouble() < 0.5)
            {
                if (x != x2) x += Math.Sign(x2 - x);
                else if (y != y2) y += Math.Sign(y2 - y);
            }
            else
            {
                if (y != y2) y += Math.Sign(y2 - y);
                else if (x != x2) x += Math.Sign(x2 - x);
            }
        }
        if (x >= 0 && x < MapWidth && y >= 0 && y < MapHeight)
            levelMap[y][x] = 0;
    }

    private void PlaceStairs(MapData map, int level, List<(int x, int y, int w, int h, int cx, int cy)> rooms, Random random)
    {
        if (level + 1 >= NumLevels || map.Levels[level + 1] == null)
        {
            GameLogger.LogWarning("MapGenerate", "Cannot place stairs; next level is missing", new { level });
            return;
        }

        var usedPositions = new List<(int x, int y)>();
        var candidates = rooms.Count > 0
            ? rooms.Select(r => (r.cx, r.cy)).ToList()
            : new List<(int cx, int cy)> { (MapWidth / 2, MapHeight / 2) };

        if (rooms.Count == 0)
        {
            GameLogger.LogWarning("MapGenerate", "No rooms available; using fallback stair positions", new { level });
        }

        for (int stairNum = 0; stairNum < 2; stairNum++)
        {
            int attempts = 0;
            (int cx, int cy) stairRoom;

            do
            {
                stairRoom = candidates[random.Next(candidates.Count)];
                attempts++;
            } while (usedPositions.Any(p => Math.Abs(p.x - stairRoom.cx) < 8 && Math.Abs(p.y - stairRoom.cy) < 8) && attempts < 20);

            int stairX = Math.Clamp(stairRoom.cx, 1, MapWidth - 2);
            int stairY = Math.Clamp(stairRoom.cy, 1, MapHeight - 2);

            if (usedPositions.Contains((stairX, stairY)))
            {
                stairX = Math.Clamp(stairX + stairNum + 2, 1, MapWidth - 2);
                stairY = Math.Clamp(stairY + stairNum + 2, 1, MapHeight - 2);
            }

            map.Levels[level][stairY][stairX] = 2; // STAIRS_DOWN
            map.Levels[level + 1][stairY][stairX] = 3; // STAIRS_UP
            usedPositions.Add((stairX, stairY));

            for (int dy = -1; dy <= 1; dy++)
            {
                for (int dx = -1; dx <= 1; dx++)
                {
                    if (dx == 0 && dy == 0) continue;
                    int nx = stairX + dx;
                    int ny = stairY + dy;
                    if (nx > 0 && nx < MapWidth - 1 && ny > 0 && ny < MapHeight - 1)
                    {
                        if (map.Levels[level][ny][nx] == 1)
                            map.Levels[level][ny][nx] = 0;
                        if (map.Levels[level + 1][ny][nx] == 1)
                            map.Levels[level + 1][ny][nx] = 0;
                    }
                }
            }

            GameLogger.LogDebug("MapGenerate", "Placed stair pair", new { level, stairX, stairY });
        }
    }

    // Convert MapData to JSON for JavaScript
    public string MapDataToJson(MapData map)
    {
        return JsonSerializer.Serialize(map);
    }

    // Parse MapData from JSON
    public MapData? MapDataFromJson(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<MapData>(json);
        }
        catch (Exception ex)
        {
            GameLogger.LogError("MapStorage", "Failed to parse map JSON", ex);
            return null;
        }
    }
}
