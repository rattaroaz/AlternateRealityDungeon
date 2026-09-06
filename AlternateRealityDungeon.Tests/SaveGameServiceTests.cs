namespace AlternateRealityDungeon.Tests;

public class SaveGameServiceTests
{
    public SaveGameServiceTests()
    {
        TestSupport.ConfigureIsolatedLogger();
    }

    [Fact]
    public async Task SaveAndLoad_RoundTripsPlayerState()
    {
        var service = new SaveGameService();
        var state = new GameState
        {
            Name = "Tester",
            Level = 3,
            Hitpoints = 42,
            Gold = 250
        };
        var camera = new CameraState { X = 1, Y = 2, Z = 3, Yaw = 0.5 };

        await service.SaveAsync(2, state, camera, "map-1");
        var loaded = await service.LoadAsync(2);

        Assert.NotNull(loaded);
        Assert.Equal("Tester", loaded!.State.Name);
        Assert.Equal(3, loaded.State.Level);
        Assert.Equal(42, loaded.State.Hitpoints);
        Assert.Equal("map-1", loaded.MapId);
        Assert.Equal(1, loaded.Camera.X);
    }

    [Fact]
    public async Task LoadAsync_ReturnsNullForEmptySlot()
    {
        var service = new SaveGameService();
        var loaded = await service.LoadAsync(9);
        Assert.Null(loaded);
    }

    [Fact]
    public async Task SaveAsync_RejectsInvalidSlot()
    {
        var service = new SaveGameService();
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            service.SaveAsync(0, new GameState(), new CameraState()));
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            service.SaveAsync(11, new GameState(), new CameraState()));
    }

    [Fact]
    public async Task GetSlotInfosAsync_ReportsTenSlots()
    {
        var service = new SaveGameService();
        var slots = await service.GetSlotInfosAsync();
        Assert.Equal(10, slots.Count);
        Assert.Equal(Enumerable.Range(1, 10), slots.Select(s => s.Slot));
    }
}
