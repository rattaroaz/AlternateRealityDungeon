using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace AlternateRealityDungeon
{
    public class GameSave
    {
        public GameState State { get; set; } = new GameState();
        public CameraState Camera { get; set; } = new CameraState();
        public DateTime SavedAt { get; set; }
        public string? MapId { get; set; } // ID of the map used for this save
        public int[][]? MapLevels { get; set; } // Embedded map data for persistence
        public int MapPlayerStartX { get; set; } = 32;
        public int MapPlayerStartY { get; set; } = 32;
    }

    public class SaveSlotInfo
    {
        public int Slot { get; set; }
        public bool HasSave { get; set; }
        public DateTime? SavedAt { get; set; }
    }

    public class SaveGameService
    {
        private readonly string _saveDirectory;
        private readonly JsonSerializerOptions _jsonOptions;

        public int SlotCount => 10;

        public SaveGameService()
        {
            var appDirectory = AppContext.BaseDirectory;
            _saveDirectory = Path.Combine(appDirectory, "Database");
            Directory.CreateDirectory(_saveDirectory);

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                WriteIndented = true
            };
        }

        private string GetSlotPath(int slot)
        {
            return Path.Combine(_saveDirectory, $"slot{slot}.json");
        }

        private void ValidateSlot(int slot)
        {
            if (slot < 1 || slot > SlotCount)
            {
                throw new ArgumentOutOfRangeException(nameof(slot));
            }
        }

        public async Task SaveAsync(int slot, GameState state, CameraState camera, 
            string? mapId = null, int[][][]? mapLevels = null, int mapPlayerStartX = 32, int mapPlayerStartY = 32)
        {
            ValidateSlot(slot);

            var save = new GameSave
            {
                State = state,
                Camera = camera,
                SavedAt = DateTime.UtcNow,
                MapId = mapId,
                MapPlayerStartX = mapPlayerStartX,
                MapPlayerStartY = mapPlayerStartY
            };
            
            // Flatten the 3D map array to 2D for storage (level * height rows, width columns)
            if (mapLevels != null && mapLevels.Length > 0)
            {
                var flatLevels = new List<int[]>();
                foreach (var level in mapLevels)
                {
                    if (level != null)
                    {
                        foreach (var row in level)
                        {
                            flatLevels.Add(row ?? Array.Empty<int>());
                        }
                    }
                }
                save.MapLevels = flatLevels.ToArray();
            }

            var json = JsonSerializer.Serialize(save, _jsonOptions);
            var path = GetSlotPath(slot);
            await File.WriteAllTextAsync(path, json);
        }

        public async Task<GameSave?> LoadAsync(int slot)
        {
            ValidateSlot(slot);

            var path = GetSlotPath(slot);
            if (!File.Exists(path))
            {
                return null;
            }

            var json = await File.ReadAllTextAsync(path);
            if (string.IsNullOrWhiteSpace(json))
            {
                return null;
            }

            return JsonSerializer.Deserialize<GameSave>(json, _jsonOptions);
        }

        public Task<IReadOnlyList<SaveSlotInfo>> GetSlotInfosAsync()
        {
            var list = new List<SaveSlotInfo>();

            for (var slot = 1; slot <= SlotCount; slot++)
            {
                var path = GetSlotPath(slot);
                if (File.Exists(path))
                {
                    var time = File.GetLastWriteTimeUtc(path);
                    list.Add(new SaveSlotInfo
                    {
                        Slot = slot,
                        HasSave = true,
                        SavedAt = time
                    });
                }
                else
                {
                    list.Add(new SaveSlotInfo
                    {
                        Slot = slot,
                        HasSave = false,
                        SavedAt = null
                    });
                }
            }

            return Task.FromResult<IReadOnlyList<SaveSlotInfo>>(list);
        }
    }
}
