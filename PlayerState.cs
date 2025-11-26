namespace AlternateRealityDungeon
{
    public class PlayerStats
    {
        public string Name { get; set; } = "Adventurer";
        public int Stamina { get; set; }
        public int Charisma { get; set; }
        public int Strength { get; set; }
        public int Intelligence { get; set; }
        public int Wisdom { get; set; }
        public int Skill { get; set; }
        public int Speed { get; set; }
    }

    public class CameraState
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double Z { get; set; }
        public double Yaw { get; set; }
    }

    public class PlayerState
    {
        public PlayerStats? Stats { get; private set; }

        public CameraState? LastCameraState { get; private set; }

        public bool HasStats => Stats != null;

        public void SetStats(PlayerStats stats)
        {
            Stats = stats;
        }

        public void SetCameraState(CameraState cameraState)
        {
            LastCameraState = cameraState;
        }

        public void ClearCameraState()
        {
            LastCameraState = null;
        }
    }
}
