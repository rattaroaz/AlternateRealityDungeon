using AlternateRealityDungeon.Services;

namespace AlternateRealityDungeon.Tests;

public class MapValidationTests
{
    [Fact]
    public void ValidateStairs_ReportsUnmatchedDownStairs()
    {
        var map = new MapStorageService.MapData
        {
            Width = 4,
            Height = 4,
            NumLevels = 2,
            PlayerStartX = 1,
            PlayerStartY = 1,
            Levels = new int[2][][]
        };

        map.Levels[0] = CreateFloor(4, 4);
        map.Levels[1] = CreateFloor(4, 4);
        map.Levels[0][1][1] = MapValidation.StairsDown;

        var errors = MapValidation.ValidateStairs(map);
        Assert.Contains(errors, e => e.Contains("no matching stairs UP"));
    }

    [Fact]
    public void ValidateStructure_RejectsNullMap()
    {
        var errors = MapValidation.ValidateStructure(null!);
        Assert.Contains(errors, e => e.Contains("null"));
    }

    [Fact]
    public void FindServices_ReturnsFirstOfEachType()
    {
        var level = CreateFloor(5, 5);
        level[1][2] = MapValidation.Guild;
        level[3][4] = MapValidation.Shop;

        var found = MapValidation.FindServices(level);
        Assert.Equal((2, 1), found["Guild"]);
        Assert.Equal((4, 3), found["Shop"]);
        Assert.False(found.ContainsKey("Inn"));
    }

    private static int[][] CreateFloor(int width, int height)
    {
        var rows = new int[height][];
        for (int y = 0; y < height; y++)
            rows[y] = new int[width];
        return rows;
    }
}
