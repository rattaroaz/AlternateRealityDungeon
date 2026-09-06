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
            
            GameLogger.LogInfo("App", "Application started", new { logFile = GameLogger.LogFilePath });
            GameLogger.LogInfo("App", "MainPage initialized");
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
