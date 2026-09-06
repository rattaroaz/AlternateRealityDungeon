namespace AlternateRealityDungeon.Services;

public static class MapValidation
{
    public const int Floor = 0;
    public const int StairsDown = 2;
    public const int StairsUp = 3;
    public const int Guild = 5;
    public const int Shop = 6;
    public const int Inn = 7;
    public const int Smith = 8;

    public static List<string> ValidateStructure(MapStorageService.MapData map)
    {
        var errors = new List<string>();
        if (map == null)
        {
            errors.Add("Map is null.");
            return errors;
        }

        if (map.Width <= 0 || map.Height <= 0)
            errors.Add($"Invalid dimensions {map.Width}x{map.Height}.");

        if (map.NumLevels <= 0)
            errors.Add($"Invalid level count {map.NumLevels}.");

        if (map.Levels == null || map.Levels.Length != map.NumLevels)
        {
            errors.Add($"Expected {map.NumLevels} levels, found {map.Levels?.Length ?? 0}.");
            return errors;
        }

        if (map.PlayerStartX < 0 || map.PlayerStartX >= map.Width ||
            map.PlayerStartY < 0 || map.PlayerStartY >= map.Height)
        {
            errors.Add($"Player start ({map.PlayerStartX}, {map.PlayerStartY}) is outside the map.");
        }

        for (int level = 0; level < map.Levels.Length; level++)
        {
            if (map.Levels[level] == null || map.Levels[level].Length != map.Height)
            {
                errors.Add($"Level {level} height is {map.Levels[level]?.Length ?? 0}, expected {map.Height}.");
                continue;
            }

            for (int y = 0; y < map.Levels[level].Length; y++)
            {
                if (map.Levels[level][y] == null || map.Levels[level][y].Length != map.Width)
                    errors.Add($"Level {level} row {y} width is {map.Levels[level][y]?.Length ?? 0}, expected {map.Width}.");
            }
        }

        if (map.Levels[0] != null &&
            map.PlayerStartY >= 0 && map.PlayerStartY < map.Levels[0].Length &&
            map.Levels[0][map.PlayerStartY] != null &&
            map.PlayerStartX >= 0 && map.PlayerStartX < map.Levels[0][map.PlayerStartY].Length)
        {
            var startTile = map.Levels[0][map.PlayerStartY][map.PlayerStartX];
            if (startTile == 1)
                errors.Add($"Player start ({map.PlayerStartX}, {map.PlayerStartY}) is a solid wall tile.");
        }

        return errors;
    }

    public static List<string> ValidateStairs(MapStorageService.MapData map)
    {
        var errors = new List<string>();
        if (map?.Levels == null || map.Levels.Length == 0)
        {
            errors.Add("Map has no levels to validate stairs.");
            return errors;
        }

        var downByLevel = new List<HashSet<(int x, int y)>>();
        var upByLevel = new List<HashSet<(int x, int y)>>();

        for (int level = 0; level < map.Levels.Length; level++)
        {
            var down = new HashSet<(int x, int y)>();
            var up = new HashSet<(int x, int y)>();
            var rows = map.Levels[level];
            if (rows == null)
            {
                downByLevel.Add(down);
                upByLevel.Add(up);
                continue;
            }

            for (int y = 0; y < rows.Length; y++)
            {
                var row = rows[y];
                if (row == null) continue;
                for (int x = 0; x < row.Length; x++)
                {
                    if (row[x] == StairsDown) down.Add((x, y));
                    else if (row[x] == StairsUp) up.Add((x, y));
                }
            }

            downByLevel.Add(down);
            upByLevel.Add(up);
        }

        for (int level = 0; level < map.Levels.Length - 1; level++)
        {
            if (downByLevel[level].Count == 0)
                errors.Add($"Level {level} has no stairs down.");

            foreach (var pos in downByLevel[level])
            {
                if (!upByLevel[level + 1].Contains(pos))
                    errors.Add($"Level {level} stairs DOWN at ({pos.x}, {pos.y}) has no matching stairs UP on level {level + 1}.");
            }

            foreach (var pos in upByLevel[level + 1])
            {
                if (!downByLevel[level].Contains(pos))
                    errors.Add($"Level {level + 1} stairs UP at ({pos.x}, {pos.y}) has no matching stairs DOWN on level {level}.");
            }
        }

        if (downByLevel[^1].Count > 0)
            errors.Add($"Final level {map.Levels.Length - 1} should not have stairs down.");

        if (upByLevel[0].Count > 0)
            errors.Add("Level 0 should not have stairs up.");

        return errors;
    }

    public static Dictionary<string, (int x, int y)> FindServices(int[][] level)
    {
        var found = new Dictionary<string, (int x, int y)>();
        if (level == null) return found;

        var names = new Dictionary<int, string>
        {
            [Guild] = "Guild",
            [Shop] = "Shop",
            [Inn] = "Inn",
            [Smith] = "Smith"
        };

        for (int y = 0; y < level.Length; y++)
        {
            var row = level[y];
            if (row == null) continue;
            for (int x = 0; x < row.Length; x++)
            {
                if (names.TryGetValue(row[x], out var name) && !found.ContainsKey(name))
                    found[name] = (x, y);
            }
        }

        return found;
    }
}
