using AlternateRealityDungeon.Services;

namespace AlternateRealityDungeon.Tests;

public class MapGenerationTests
{
    public MapGenerationTests()
    {
        TestSupport.ConfigureIsolatedLogger();
    }

    [Fact]
    public void GenerateProceduralMap_DoesNotThrow()
    {
        var storage = new MapStorageService(TestSupport.CreateTempDirectory());
        var map = storage.GenerateProceduralMap();
        Assert.NotNull(map);
    }

    [Fact]
    public void GenerateProceduralMap_HasExpectedShape()
    {
        var storage = new MapStorageService(TestSupport.CreateTempDirectory());
        var map = storage.GenerateProceduralMap();

        Assert.Equal(65, map.Width);
        Assert.Equal(65, map.Height);
        Assert.Equal(4, map.NumLevels);
        Assert.Equal(4, map.Levels.Length);
        Assert.Equal(4, map.HWalls.Length);
        Assert.Equal(4, map.VWalls.Length);
        Assert.Equal(4, map.HDoors.Length);
        Assert.Equal(4, map.VDoors.Length);
        Assert.Empty(MapValidation.ValidateStructure(map));
    }

    [Fact]
    public void GenerateProceduralMap_StairsAreSynchronized()
    {
        var storage = new MapStorageService(TestSupport.CreateTempDirectory());
        var map = storage.GenerateProceduralMap();
        Assert.Empty(MapValidation.ValidateStairs(map));
    }

    [Fact]
    public void GenerateProceduralMap_IsStableAcrossRepeatedRuns()
    {
        var storage = new MapStorageService(TestSupport.CreateTempDirectory());
        for (int i = 0; i < 8; i++)
        {
            var map = storage.GenerateProceduralMap();
            Assert.Empty(MapValidation.ValidateStructure(map));
            Assert.Empty(MapValidation.ValidateStairs(map));
        }
    }

    [Fact]
    public void NormalizeWallDoorExclusivity_ClearsWallWhenDoorPresent()
    {
        var map = new MapStorageService.MapData
        {
            Width = 65,
            Height = 65,
            NumLevels = 4,
            HWalls = new bool[4][][],
            VWalls = new bool[4][][],
            HDoors = new int[4][][],
            VDoors = new int[4][][]
        };

        for (int level = 0; level < 4; level++)
        {
            map.HWalls[level] = new bool[66][];
            map.HDoors[level] = new int[66][];
            for (int y = 0; y <= 65; y++)
            {
                map.HWalls[level][y] = new bool[65];
                map.HDoors[level][y] = new int[65];
            }

            map.VWalls[level] = new bool[65][];
            map.VDoors[level] = new int[65][];
            for (int y = 0; y < 65; y++)
            {
                map.VWalls[level][y] = new bool[66];
                map.VDoors[level][y] = new int[66];
            }
        }

        map.HWalls[0][3][4] = true;
        map.HDoors[0][3][4] = 1;
        map.VWalls[0][5][6] = true;
        map.VDoors[0][5][6] = 2;

        MapStorageService.NormalizeWallDoorExclusivity(map);

        Assert.False(map.HWalls[0][3][4]);
        Assert.False(map.VWalls[0][5][6]);
        Assert.Equal(1, map.HDoors[0][3][4]);
        Assert.Equal(2, map.VDoors[0][5][6]);
    }

    [Fact]
    public void MapDataRoundTrip_PreservesNameAndStairs()
    {
        var storage = new MapStorageService(TestSupport.CreateTempDirectory());
        var original = storage.GenerateProceduralMap();
        original.Name = "Round Trip";

        var json = storage.MapDataToJson(original);
        var restored = storage.MapDataFromJson(json);

        Assert.NotNull(restored);
        Assert.Equal(original.Name, restored!.Name);
        Assert.Equal(original.PlayerStartX, restored.PlayerStartX);
        Assert.Empty(MapValidation.ValidateStairs(restored));
    }
}
