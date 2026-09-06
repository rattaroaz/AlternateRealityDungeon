using System.Text.Json;
using AlternateRealityDungeon.Services;

namespace AlternateRealityDungeon.Tests;

public class DefaultMapTests
{
    private static MapStorageService.MapCollection LoadCollection()
    {
        var path = TestSupport.FindRepoPath(Path.Combine("Data", "Maps", "map_collection.json"));
        var json = File.ReadAllText(path);
        var collection = JsonSerializer.Deserialize<MapStorageService.MapCollection>(json);
        Assert.NotNull(collection);
        return collection!;
    }

    [Fact]
    public void DefaultMap_ExistsAndHasValidStructure()
    {
        var collection = LoadCollection();
        Assert.NotNull(collection.DefaultMap);
        Assert.Equal("Custom Hand-Crafted Dungeon", collection.DefaultMap!.Name);
        Assert.Empty(MapValidation.ValidateStructure(collection.DefaultMap));
    }

    [Fact]
    public void DefaultMap_StairsAreSynchronized()
    {
        var collection = LoadCollection();
        Assert.Empty(MapValidation.ValidateStairs(collection.DefaultMap!));
    }

    [Fact]
    public void DefaultMap_EachLevelHasAllServices()
    {
        var collection = LoadCollection();
        var levels = collection.DefaultMap!.Levels;
        string[] required = ["Guild", "Shop", "Inn", "Smith"];

        for (int level = 0; level < levels.Length; level++)
        {
            var found = MapValidation.FindServices(levels[level]);
            foreach (var service in required)
            {
                Assert.True(found.ContainsKey(service), $"Level {level} is missing {service}.");
            }
        }
    }

    [Fact]
    public void SavedMaps_HaveValidStructureWhenPresent()
    {
        var collection = LoadCollection();
        foreach (var map in collection.SavedMaps.Where(m => m != null))
        {
            Assert.Empty(MapValidation.ValidateStructure(map));
        }
    }
}
