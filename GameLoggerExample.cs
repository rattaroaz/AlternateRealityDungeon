// Example usage of GameLogger in your game code
// Add this to your game logic where you handle stair transitions and movement

namespace AlternateRealityDungeon
{
    public partial class GameLogic
    {
        // Example: Log when player goes down stairs
        public void OnPlayerUseStairsDown(int currentLevel, int newLevel, int playerX, int playerY)
        {
            GameLogger.LogStairTransition(
                currentLevel, 
                newLevel, 
                new { X = playerX, Y = playerY }, 
                new { X = playerX, Y = playerY }, 
                2 // STAIRS_DOWN
            );
            
            GameLogger.LogInfo("Game", $"Player moved from level {currentLevel} to {newLevel}");
        }
        
        // Example: Log when player movement is blocked
        public void OnPlayerMovementBlocked(int x, int y, string direction, string reason)
        {
            GameLogger.LogMovementBlock(
                new { X = x, Y = y },
                direction,
                reason
            );
        }
        
        // Example: Log when walls are cleared around stairs
        public void OnWallsClearedAroundStairs(int tileX, int tileY, int level, int wallsCleared)
        {
            GameLogger.LogWallClearing(tileX, tileY, level, wallsCleared);
            GameLogger.LogDebug("Game", $"Cleared {wallsCleared} walls around stairs at ({tileX}, {tileY}) on level {level}");
        }
        
        // Example: Log player movement
        public void OnPlayerMoved(string action, int fromX, int fromY, int toX, int toY)
        {
            GameLogger.LogPlayerMovement(action, new 
            { 
                From = new { X = fromX, Y = fromY }, 
                To = new { X = toX, Y = toY } 
            });
        }
        
        // Example: Log errors
        public void OnGameError(string operation, Exception ex)
        {
            GameLogger.LogError(operation, "An error occurred", ex);
        }
        
        // Example: General info logging
        public void OnGameEvent(string eventName, object details)
        {
            GameLogger.LogInfo("Game", eventName, details);
        }
    }
}
