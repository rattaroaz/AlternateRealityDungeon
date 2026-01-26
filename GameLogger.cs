using System;
using System.IO;
using System.Threading.Tasks;

namespace AlternateRealityDungeon
{
    public static class GameLogger
    {
        private static readonly string LogFilePath = "logs.txt";
        private static readonly object _lock = new object();
        
        static GameLogger()
        {
            // Initialize log file
            InitializeLogFile();
        }
        
        private static void InitializeLogFile()
        {
            try
            {
                // Clear existing log file on startup
                File.WriteAllText(LogFilePath, $"=== Game Log Started at {DateTime.Now:yyyy-MM-dd HH:mm:ss} ==={Environment.NewLine}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to initialize log file: {ex.Message}");
            }
        }
        
        public static void Log(string category, string message, object? context = null)
        {
            var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
            var logEntry = $"[{timestamp}] [{category}] {message}";
            
            if (context != null)
            {
                logEntry += $" | {context}";
            }
            
            logEntry += Environment.NewLine;
            
            // Write to file
            WriteToFile(logEntry);
            
            // Also write to console
            Console.WriteLine(logEntry.Trim());
        }
        
        public static void LogStairTransition(int fromLevel, int toLevel, object? fromTile, object? toTile, int stairType)
        {
            Log("StairTransition", "Level change via stairs", new { 
                fromLevel, 
                toLevel, 
                fromTile, 
                toTile, 
                stairType 
            });
        }
        
        public static void LogMovementBlock(object position, object direction, string reason)
        {
            Log("MovementBlock", "Player movement blocked", new { 
                position, 
                direction, 
                reason 
            });
        }
        
        public static void LogWallClearing(int tileX, int tileY, int level, int wallsCleared)
        {
            Log("WallClearing", "Walls cleared around tile", new { 
                tileX, 
                tileY, 
                level, 
                wallsCleared 
            });
        }
        
        public static void LogPlayerMovement(string action, object data)
        {
            Log("PlayerMovement", action, data);
        }
        
        public static void LogError(string category, string message, Exception? exception = null)
        {
            var context = exception != null ? new { error = exception.Message, stackTrace = exception.StackTrace } : null;
            Log("ERROR", $"[{category}] {message}", context);
        }
        
        public static void LogWarning(string category, string message, object? context = null)
        {
            Log("WARNING", $"[{category}] {message}", context);
        }
        
        public static void LogInfo(string category, string message, object? context = null)
        {
            Log("INFO", $"[{category}] {message}", context);
        }
        
        public static void LogDebug(string category, string message, object? context = null)
        {
            Log("DEBUG", $"[{category}] {message}", context);
        }
        
        private static void WriteToFile(string logEntry)
        {
            try
            {
                lock (_lock)
                {
                    File.AppendAllText(LogFilePath, logEntry);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to write to log file: {ex.Message}");
            }
        }
        
        public static void ClearLogs()
        {
            try
            {
                lock (_lock)
                {
                    File.WriteAllText(LogFilePath, $"=== Logs Cleared at {DateTime.Now:yyyy-MM-dd HH:mm:ss} ==={Environment.NewLine}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to clear log file: {ex.Message}");
            }
        }
        
        public static string GetLogContents()
        {
            try
            {
                if (File.Exists(LogFilePath))
                {
                    return File.ReadAllText(LogFilePath);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to read log file: {ex.Message}");
            }
            return string.Empty;
        }
    }
}
