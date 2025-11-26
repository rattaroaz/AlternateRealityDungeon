namespace AlternateRealityDungeon.Database
{
    public class GameDatabase
    {
        public string DatabasePath { get; }

        public GameDatabase(string databasePath)
        {
            DatabasePath = databasePath;
        }
    }
}
