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

    public MapStorageService()
    {
        try
        {
            _storagePath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AlternateRealityDungeon",
                "maps");
            
            if (!Directory.Exists(_storagePath))
            {
                Directory.CreateDirectory(_storagePath);
            }
        }
        catch (Exception ex)
        {
            // Fallback to temp directory if LocalApplicationData fails
            Console.WriteLine($"Failed to create storage path: {ex.Message}");
            _storagePath = Path.Combine(Path.GetTempPath(), "AlternateRealityDungeon", "maps");
            try
            {
                Directory.CreateDirectory(_storagePath);
            }
            catch
            {
                // Last resort - just use temp folder
                _storagePath = Path.GetTempPath();
            }
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
    }

    public class MapCollection
    {
        public MapData? DefaultMap { get; set; }
        public List<MapData> SavedMaps { get; set; } = new();
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
            }
            catch
            {
                _cachedMaps = new MapCollection();
            }
        }
        else
        {
            _cachedMaps = new MapCollection();
        }

        return _cachedMaps;
    }

    public async Task SaveMapCollectionAsync(MapCollection collection)
    {
        _cachedMaps = collection;
        var filePath = GetStorageFilePath();
        var json = JsonSerializer.Serialize(collection, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(filePath, json);
    }

    public async Task<MapData?> GetDefaultMapAsync()
    {
        var collection = await LoadMapCollectionAsync();
        return collection.DefaultMap;
    }

    public async Task SetDefaultMapAsync(MapData map)
    {
        var collection = await LoadMapCollectionAsync();
        collection.DefaultMap = map;
        await SaveMapCollectionAsync(collection);
    }

    public async Task<List<MapData>> GetSavedMapsAsync()
    {
        var collection = await LoadMapCollectionAsync();
        return collection.SavedMaps;
    }

    public async Task<MapData?> GetMapByIdAsync(string? mapId)
    {
        if (string.IsNullOrEmpty(mapId)) return null;
        
        var collection = await LoadMapCollectionAsync();
        
        // Check if it's the default map
        if (collection.DefaultMap?.Id == mapId)
        {
            return collection.DefaultMap;
        }
        
        // Check saved maps
        return collection.SavedMaps.FirstOrDefault(m => m?.Id == mapId);
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
            await SaveMapCollectionAsync(collection);
        }
    }

    // Generate a procedural map (fallback when no default exists)
    public MapData GenerateProceduralMap()
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
            Levels = new int[NumLevels][][]
        };

        var random = new Random();

        for (int level = 0; level < NumLevels; level++)
        {
            map.Levels[level] = new int[MapHeight][];
            for (int y = 0; y < MapHeight; y++)
            {
                map.Levels[level][y] = new int[MapWidth];
                for (int x = 0; x < MapWidth; x++)
                {
                    map.Levels[level][y][x] = 1; // Wall
                }
            }

            // Generate rooms
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
                    // Carve room
                    for (int ry = y; ry < y + h && ry < MapHeight - 1; ry++)
                    {
                        for (int rx = x; rx < x + w && rx < MapWidth - 1; rx++)
                        {
                            if (rx > 0 && ry > 0)
                                map.Levels[level][ry][rx] = 0; // Floor
                        }
                    }
                    rooms.Add((x, y, w, h, x + w / 2, y + h / 2));
                }
            }

            // Connect rooms with corridors
            for (int i = 1; i < rooms.Count; i++)
            {
                CarveCorridor(map.Levels[level], rooms[i - 1].cx, rooms[i - 1].cy, rooms[i].cx, rooms[i].cy, random);
            }
            if (rooms.Count > 2)
            {
                CarveCorridor(map.Levels[level], rooms[^1].cx, rooms[^1].cy, rooms[0].cx, rooms[0].cy, random);
            }

            // Ensure player start is open on level 0
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
                            map.Levels[level][py][px] = 0; // Floor
                        }
                    }
                }

                // Connect to nearest room
                if (rooms.Count > 0)
                {
                    var nearest = rooms.OrderBy(r =>
                        Math.Abs(r.cx - map.PlayerStartX) + Math.Abs(r.cy - map.PlayerStartY)).First();
                    CarveCorridor(map.Levels[level], map.PlayerStartX, map.PlayerStartY, nearest.cx, nearest.cy, random);
                }
            }

            // Place stairs (except on last level for down, first level for up)
            if (level < NumLevels - 1)
            {
                // Place 2 stairs down
                PlaceStairs(map, level, rooms, 2, true, random); // 2 = STAIRS_DOWN
            }
            if (level > 0)
            {
                // Stairs up are placed by the level below
            }
        }

        return map;
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

    private void PlaceStairs(MapData map, int level, List<(int x, int y, int w, int h, int cx, int cy)> rooms, int stairType, bool isDown, Random random)
    {
        var usedPositions = new List<(int x, int y)>();

        for (int stairNum = 0; stairNum < 2; stairNum++)
        {
            int attempts = 0;
            (int x, int y, int w, int h, int cx, int cy) stairRoom;

            do
            {
                stairRoom = rooms[random.Next(rooms.Count)];
                attempts++;
            } while (usedPositions.Any(p => Math.Abs(p.x - stairRoom.cx) < 8 && Math.Abs(p.y - stairRoom.cy) < 8) && attempts < 20);

            int stairX = stairRoom.cx;
            int stairY = stairRoom.cy;

            if (map.Levels[level][stairY][stairX] == 0) // Is floor
            {
                map.Levels[level][stairY][stairX] = 2; // STAIRS_DOWN
                usedPositions.Add((stairX, stairY));

                // Create corresponding stairs up on next level
                if (level + 1 < NumLevels)
                {
                    map.Levels[level + 1][stairY][stairX] = 3; // STAIRS_UP

                    // Ensure area around stairs is walkable
                    for (int dy = -1; dy <= 1; dy++)
                    {
                        for (int dx = -1; dx <= 1; dx++)
                        {
                            int nx = stairX + dx;
                            int ny = stairY + dy;
                            if (nx > 0 && nx < MapWidth - 1 && ny > 0 && ny < MapHeight - 1)
                            {
                                if (map.Levels[level][ny][nx] == 1) // Wall
                                    map.Levels[level][ny][nx] = 0;
                                if (map.Levels[level + 1][ny][nx] == 1)
                                    map.Levels[level + 1][ny][nx] = 0;
                            }
                        }
                    }
                }
            }
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
        catch
        {
            return null;
        }
    }
}
