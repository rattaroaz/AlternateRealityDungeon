namespace AlternateRealityDungeon.Tests;

public class GameLoggerTests
{
    public GameLoggerTests()
    {
        TestSupport.ConfigureIsolatedLogger();
    }

    [Fact]
    public void LogInfo_WritesCategoryAndMessage()
    {
        GameLogger.LogInfo("TestCat", "hello logger", new { value = 42 });

        var contents = GameLogger.GetLogContents();
        Assert.Contains("[INFO]", contents);
        Assert.Contains("[TestCat]", contents);
        Assert.Contains("hello logger", contents);
        Assert.Contains("\"value\":42", contents);
    }

    [Fact]
    public void LogError_IncludesExceptionDetails()
    {
        GameLogger.LogError("Boom", "it broke", new InvalidOperationException("nope"));

        var contents = GameLogger.GetLogContents();
        Assert.Contains("[ERROR]", contents);
        Assert.Contains("it broke", contents);
        Assert.Contains("nope", contents);
        Assert.Contains("InvalidOperationException", contents);
    }

    [Fact]
    public void Configure_UsesProvidedPath()
    {
        Assert.True(File.Exists(GameLogger.LogFilePath));
        Assert.Contains("logs.txt", GameLogger.LogFilePath);
    }
}
