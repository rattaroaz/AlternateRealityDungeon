using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Components.WebView;
using Microsoft.JSInterop;

namespace AlternateRealityDungeon
{
    public partial class MainPage : ContentPage
    {
        public MainPage()
        {
            InitializeComponent();
            
            // Initialize logging
            GameLogger.LogInfo("App", "Application started");
            GameLogger.LogInfo("App", "MainPage initialized");
            GameLogger.LogInfo("App", "Monster encounters DISABLED for debugging");
            
            // Test logging system
            GameLogger.LogInfo("Test", "Logging system test started");
            GameLogger.LogStairTransition(0, 1, new { X = 32, Y = 32 }, new { X = 32, Y = 32 }, 2);
            GameLogger.LogMovementBlock(new { X = 128.0, Y = 128.0 }, "north", "Tile not walkable");
            GameLogger.LogWallClearing(32, 32, 1, 4);
            GameLogger.LogPlayerMovement("Test move", new { From = new { X = 32, Y = 32 }, To = new { X = 33, Y = 32 } });
            GameLogger.LogWarning("Test", "This is a warning message");
            GameLogger.LogError("Test", "This is an error message");
            GameLogger.LogInfo("Test", "Logging system test completed");
        }
        
        // Method to be called from JavaScript
        [JSInvokable]
        public void LogFromJavaScript(string message)
        {
            // Parse the message to determine log level and category
            if (message.StartsWith("[ERROR]"))
            {
                GameLogger.LogError("JavaScript", message.Substring(8));
            }
            else if (message.StartsWith("[WARNING]"))
            {
                GameLogger.LogWarning("JavaScript", message.Substring(10));
            }
            else if (message.StartsWith("[STAIR]"))
            {
                GameLogger.LogInfo("StairTransition", message.Substring(8));
            }
            else if (message.StartsWith("[MOVE]"))
            {
                GameLogger.LogPlayerMovement("Movement", message.Substring(7));
            }
            else
            {
                GameLogger.LogInfo("JavaScript", message);
            }
        }
    }
}
