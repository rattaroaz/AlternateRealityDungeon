namespace AlternateRealityDungeon.Database
{
    public class GameDatabase(string databasePath)
    {
        public string DatabasePath { get; } = databasePath;
    }
}
