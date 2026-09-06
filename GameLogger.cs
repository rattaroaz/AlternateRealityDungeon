using System.Text.Json;

namespace AlternateRealityDungeon
{
    public static class GameLogger
    {
        private static readonly object Lock = new();
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            WriteIndented = false,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        private static string _logFilePath = ResolveDefaultLogPath();
        private static bool _sessionStarted;

        public static string LogFilePath
        {
            get
            {
                EnsureSessionStarted();
                return _logFilePath;
            }
        }

        public static void Configure(string logFilePath)
        {
            if (string.IsNullOrWhiteSpace(logFilePath))
                throw new ArgumentException("Log file path is required.", nameof(logFilePath));

            lock (Lock)
            {
                _logFilePath = logFilePath;
                _sessionStarted = false;
            }

            EnsureSessionStarted();
        }

        public static void Log(string category, string message, object? context = null)
        {
            var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
            var logEntry = $"[{timestamp}] [{category}] {message}";

            if (context != null)
            {
                logEntry += $" | {FormatContext(context)}";
            }

            logEntry += Environment.NewLine;
            WriteToFile(logEntry);
            Console.WriteLine(logEntry.Trim());
        }

        public static void LogStairTransition(int fromLevel, int toLevel, object? fromTile, object? toTile, int stairType)
        {
            Log("StairTransition", "Level change via stairs", new
            {
                fromLevel,
                toLevel,
                fromTile,
                toTile,
                stairType
            });
        }

        public static void LogMovementBlock(object position, object direction, string reason)
        {
            Log("MovementBlock", "Player movement blocked", new
            {
                position,
                direction,
                reason
            });
        }

        public static void LogWallClearing(int tileX, int tileY, int level, int wallsCleared)
        {
            Log("WallClearing", "Walls cleared around tile", new
            {
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
            object? context = exception == null
                ? null
                : new { error = exception.Message, exceptionType = exception.GetType().Name, stackTrace = exception.StackTrace };
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

        public static void ClearLogs()
        {
            try
            {
                lock (Lock)
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(_logFilePath)!);
                    File.WriteAllText(_logFilePath, $"=== Logs Cleared at {DateTime.Now:yyyy-MM-dd HH:mm:ss} ==={Environment.NewLine}");
                    _sessionStarted = true;
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
                lock (Lock)
                {
                    if (File.Exists(_logFilePath))
                    {
                        return File.ReadAllText(_logFilePath);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to read log file: {ex.Message}");
            }

            return string.Empty;
        }

        private static void EnsureSessionStarted()
        {
            lock (Lock)
            {
                if (_sessionStarted)
                    return;

                try
                {
                    var directory = Path.GetDirectoryName(_logFilePath);
                    if (!string.IsNullOrEmpty(directory))
                        Directory.CreateDirectory(directory);

                    File.AppendAllText(_logFilePath, $"=== Game Log Session {DateTime.Now:yyyy-MM-dd HH:mm:ss} ==={Environment.NewLine}");
                    _sessionStarted = true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to initialize log file: {ex.Message}");
                    _sessionStarted = true;
                }
            }
        }

        private static void WriteToFile(string logEntry)
        {
            try
            {
                EnsureSessionStarted();
                lock (Lock)
                {
                    File.AppendAllText(_logFilePath, logEntry);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to write to log file: {ex.Message}");
            }
        }

        private static string FormatContext(object context)
        {
            if (context is string text)
                return text;

            try
            {
                return JsonSerializer.Serialize(context, JsonOptions);
            }
            catch
            {
                return context.ToString() ?? string.Empty;
            }
        }

        private static string ResolveDefaultLogPath()
        {
            var dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AlternateRealityDungeon");
            return Path.Combine(dir, "logs.txt");
        }
    }
}
