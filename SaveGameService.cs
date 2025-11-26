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
        public PlayerStats Stats { get; set; } = new PlayerStats();
        public CameraState Camera { get; set; } = new CameraState();
        public DateTime SavedAt { get; set; }
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
            var root = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            _saveDirectory = Path.Combine(root, "AlternateRealityDungeon", "Saves");
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

        public async Task SaveAsync(int slot, PlayerStats stats, CameraState camera)
        {
            ValidateSlot(slot);

            var save = new GameSave
            {
                Stats = stats,
                Camera = camera,
                SavedAt = DateTime.UtcNow
            };

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
