namespace AlternateRealityDungeon
{
    public class PlayerStats
    {
        public int Strength { get; set; }
        public int Stamina { get; set; }
        public int Agility { get; set; }
        public int Constitution { get; set; }
        public int Intelligence { get; set; }
        public int Wisdom { get; set; }
        public int Experience { get; set; }
        public int Speed { get; set; }
    }

    public class PlayerState
    {
        public PlayerStats? Stats { get; private set; }

        public bool HasStats => Stats != null;

        public void SetStats(PlayerStats stats)
        {
            Stats = stats;
        }
    }
}
