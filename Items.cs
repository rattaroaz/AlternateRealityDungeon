namespace AlternateRealityDungeon
{
    public enum DamageGrade
    {
        None,
        Low,
        Medium,
        High,
        Excellent,
        Godlike
    }

    public enum ItemType
    {
        General,  // e.g., tools like Compass, Timepiece
        Clothing,
        Weapon
    }

    public class Item
    {
        public string Name { get; set; }
        public ItemType Type { get; set; }
        public string Slot { get; set; }  // e.g., for clothing: "Head", "Arms", etc.
        // Weapon-specific properties
        public Dictionary<string, DamageGrade> DamageTypes { get; set; } = new Dictionary<string, DamageGrade>();
        public int Condition { get; set; }  // 0-100
        public int ValueInSilver { get; set; }
        public int AttackValue { get; set; }  // 1-100
        public int DefenseValue { get; set; }  // 1-100
        // Add more properties later if needed, e.g., public int Value { get; set; }

        public Item(string name, ItemType type, string slot = "", int condition = 0, int valueInSilver = 0, int attackValue = 0, int defenseValue = 0)
        {
            Name = name;
            Type = type;
            Slot = slot;
            Condition = condition;
            ValueInSilver = valueInSilver;
            AttackValue = attackValue;
            DefenseValue = defenseValue;
        }
    }

    public static class Items
    {
        // General items (existing ones)
        public static readonly List<Item> GeneralItems = new()
        {
            new Item("Compass", ItemType.General),
            new Item("Timepiece", ItemType.General),
            new Item("Food Packet", ItemType.General),
            new Item("Water Flask", ItemType.General),
            new Item("Unlit Torch", ItemType.General),
            new Item("Lit Torch", ItemType.General),
            new Item("Burnt Stick", ItemType.General),
            new Item("Keys", ItemType.General),
            new Item("Crystals", ItemType.General),
            new Item("Gems", ItemType.General),
            new Item("Jewels", ItemType.General),
            new Item("Gold", ItemType.General),
            new Item("Silver", ItemType.General),
            new Item("Copper", ItemType.General)
        };

        // Clothing items
        public static readonly List<Item> ClothingItems = new()
        {
            new Item("Woolen Hat", ItemType.Clothing, "Head"),
            new Item("Leather Helm", ItemType.Clothing, "Head"),
            new Item("Gloves", ItemType.Clothing, "Arms"),
            new Item("Sleeves", ItemType.Clothing, "Arms"),
            new Item("Leather Armor", ItemType.Clothing, "Chest"),
            new Item("Cloak", ItemType.Clothing, "Chest"),
            new Item("Pants", ItemType.Clothing, "Legs"),
            new Item("Leggings", ItemType.Clothing, "Legs"),
            new Item("Leather Boots", ItemType.Clothing, "Feet"),
            new Item("Shoes", ItemType.Clothing, "Feet")
        };

        // Weapon items
        public static readonly List<Item> WeaponItems = new()
        {
            // Standard Weapons (10)
            new Item("Sword", ItemType.Weapon, condition: 80, valueInSilver: 100, attackValue: 70, defenseValue: 10)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "blunt", DamageGrade.Medium } }
            },
            new Item("Bow", ItemType.Weapon, condition: 70, valueInSilver: 50, attackValue: 60, defenseValue: 5)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Low } }
            },
            new Item("Dagger", ItemType.Weapon, condition: 90, valueInSilver: 75, attackValue: 50, defenseValue: 5)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent } }
            },
            new Item("Axe", ItemType.Weapon, condition: 75, valueInSilver: 120, attackValue: 80, defenseValue: 15)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "blunt", DamageGrade.High } }
            },
            new Item("Mace", ItemType.Weapon, condition: 85, valueInSilver: 90, attackValue: 65, defenseValue: 20)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Excellent } }
            },
            new Item("Spear", ItemType.Weapon, condition: 80, valueInSilver: 110, attackValue: 75, defenseValue: 25)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium }, { "earth", DamageGrade.Low } }
            },
            new Item("Hammer", ItemType.Weapon, condition: 70, valueInSilver: 130, attackValue: 85, defenseValue: 10)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.High }, { "earth", DamageGrade.Medium } }
            },
            new Item("Staff", ItemType.Weapon, condition: 95, valueInSilver: 60, attackValue: 40, defenseValue: 30)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Low }, { "magic", DamageGrade.Medium } }
            },
            new Item("Crossbow", ItemType.Weapon, condition: 65, valueInSilver: 140, attackValue: 70, defenseValue: 5)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium } }
            },
            new Item("Shield", ItemType.Weapon, condition: 90, valueInSilver: 80, attackValue: 20, defenseValue: 50)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Low } }
            },
            // Magical Weapons (30)
            new Item("Flame Sword", ItemType.Weapon, condition: 95, valueInSilver: 500, attackValue: 90, defenseValue: 15)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "fire", DamageGrade.Godlike } }
            },
            new Item("Ice Dagger", ItemType.Weapon, condition: 100, valueInSilver: 600, attackValue: 65, defenseValue: 10)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "cold", DamageGrade.Godlike } }
            },
            new Item("Thunder Axe", ItemType.Weapon, condition: 85, valueInSilver: 550, attackValue: 95, defenseValue: 20)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "air", DamageGrade.Godlike } }
            },
            new Item("Earth Mace", ItemType.Weapon, condition: 90, valueInSilver: 480, attackValue: 80, defenseValue: 25)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Godlike }, { "earth", DamageGrade.Excellent } }
            },
            new Item("Water Spear", ItemType.Weapon, condition: 88, valueInSilver: 520, attackValue: 85, defenseValue: 30)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "water", DamageGrade.Godlike } }
            },
            new Item("Light Hammer", ItemType.Weapon, condition: 92, valueInSilver: 580, attackValue: 88, defenseValue: 15)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Excellent }, { "good", DamageGrade.Godlike } }
            },
            new Item("Shadow Staff", ItemType.Weapon, condition: 100, valueInSilver: 650, attackValue: 50, defenseValue: 35)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike }, { "evil", DamageGrade.Excellent } }
            },
            new Item("Phoenix Bow", ItemType.Weapon, condition: 85, valueInSilver: 620, attackValue: 75, defenseValue: 10)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium }, { "fire", DamageGrade.Excellent }, { "air", DamageGrade.High } }
            },
            new Item("Frost Crossbow", ItemType.Weapon, condition: 80, valueInSilver: 600, attackValue: 80, defenseValue: 5)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "cold", DamageGrade.Excellent } }
            },
            new Item("Holy Shield", ItemType.Weapon, condition: 100, valueInSilver: 700, attackValue: 30, defenseValue: 80)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "good", DamageGrade.Godlike }, { "blunt", DamageGrade.Medium } }
            },
            new Item("Dragon Blade", ItemType.Weapon, condition: 95, valueInSilver: 800, attackValue: 100, defenseValue: 20)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Godlike }, { "fire", DamageGrade.Excellent }, { "power", DamageGrade.High } }
            },
            new Item("Void Dagger", ItemType.Weapon, condition: 90, valueInSilver: 750, attackValue: 70, defenseValue: 15)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "evil", DamageGrade.Godlike }, { "magic", DamageGrade.High } }
            },
            new Item("Storm Axe", ItemType.Weapon, condition: 87, valueInSilver: 680, attackValue: 92, defenseValue: 18)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "air", DamageGrade.Godlike }, { "water", DamageGrade.Medium } }
            },
            new Item("Crystal Mace", ItemType.Weapon, condition: 93, valueInSilver: 720, attackValue: 85, defenseValue: 28)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Excellent }, { "magic", DamageGrade.Godlike }, { "earth", DamageGrade.High } }
            },
            new Item("Serpent Spear", ItemType.Weapon, condition: 89, valueInSilver: 650, attackValue: 88, defenseValue: 32)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "poison", DamageGrade.Godlike }, { "earth", DamageGrade.Medium } }  // Note: poison not in original list, assuming it's allowed
            },
            new Item("Celestial Hammer", ItemType.Weapon, condition: 96, valueInSilver: 780, attackValue: 90, defenseValue: 22)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Godlike }, { "good", DamageGrade.Excellent }, { "power", DamageGrade.High } }
            },
            new Item("Necrotic Staff", ItemType.Weapon, condition: 98, valueInSilver: 850, attackValue: 55, defenseValue: 40)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike }, { "evil", DamageGrade.Excellent }, { "cold", DamageGrade.High } }
            },
            new Item("Inferno Bow", ItemType.Weapon, condition: 84, valueInSilver: 730, attackValue: 78, defenseValue: 12)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium }, { "fire", DamageGrade.Godlike }, { "air", DamageGrade.Excellent } }
            },
            new Item("Glacier Crossbow", ItemType.Weapon, condition: 82, valueInSilver: 710, attackValue: 83, defenseValue: 8)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "cold", DamageGrade.Godlike }, { "water", DamageGrade.Excellent } }
            },
            new Item("Divine Shield", ItemType.Weapon, condition: 100, valueInSilver: 900, attackValue: 35, defenseValue: 90)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "good", DamageGrade.Godlike }, { "magic", DamageGrade.Excellent }, { "blunt", DamageGrade.Medium } }
            },
            new Item("Abyssal Blade", ItemType.Weapon, condition: 94, valueInSilver: 950, attackValue: 98, defenseValue: 18)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Godlike }, { "evil", DamageGrade.Excellent }, { "power", DamageGrade.High } }
            },
            new Item("Tempest Dagger", ItemType.Weapon, condition: 91, valueInSilver: 800, attackValue: 72, defenseValue: 16)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "air", DamageGrade.Godlike }, { "water", DamageGrade.High } }
            },
            new Item("Volcanic Axe", ItemType.Weapon, condition: 86, valueInSilver: 760, attackValue: 96, defenseValue: 19)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "fire", DamageGrade.Godlike }, { "earth", DamageGrade.Excellent } }
            },
            new Item("Mystic Mace", ItemType.Weapon, condition: 95, valueInSilver: 820, attackValue: 87, defenseValue: 29)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Godlike }, { "magic", DamageGrade.Excellent }, { "power", DamageGrade.High } }
            },
            new Item("Tidal Spear", ItemType.Weapon, condition: 88, valueInSilver: 740, attackValue: 89, defenseValue: 33)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "water", DamageGrade.Godlike }, { "cold", DamageGrade.Medium } }
            },
            new Item("Radiant Hammer", ItemType.Weapon, condition: 97, valueInSilver: 880, attackValue: 91, defenseValue: 23)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Excellent }, { "good", DamageGrade.Godlike }, { "fire", DamageGrade.High } }
            },
            new Item("Cursed Staff", ItemType.Weapon, condition: 99, valueInSilver: 920, attackValue: 58, defenseValue: 42)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike }, { "evil", DamageGrade.Excellent }, { "cold", DamageGrade.High } }
            },
            new Item("Ethereal Bow", ItemType.Weapon, condition: 83, valueInSilver: 790, attackValue: 79, defenseValue: 13)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Low }, { "magic", DamageGrade.Godlike }, { "air", DamageGrade.Excellent } }
            },
            new Item("Soul Crossbow", ItemType.Weapon, condition: 81, valueInSilver: 770, attackValue: 84, defenseValue: 9)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium }, { "evil", DamageGrade.Godlike }, { "power", DamageGrade.Excellent } }
            },
            new Item("Guardian Shield", ItemType.Weapon, condition: 100, valueInSilver: 1000, attackValue: 40, defenseValue: 95)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "good", DamageGrade.Godlike }, { "earth", DamageGrade.Excellent }, { "blunt", DamageGrade.High } }
            },
            new Item("Chaos Blade", ItemType.Weapon, condition: 93, valueInSilver: 1100, attackValue: 99, defenseValue: 17)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Godlike }, { "magic", DamageGrade.Excellent }, { "power", DamageGrade.Godlike } }
            },
            new Item("Eternal Dagger", ItemType.Weapon, condition: 100, valueInSilver: 1200, attackValue: 74, defenseValue: 17)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "good", DamageGrade.Godlike }, { "cold", DamageGrade.High } }
            }
        };

        // Optional: Combined list for all items
        public static readonly List<Item> AllItems = GeneralItems
            .Concat(ClothingItems)
            .Concat(WeaponItems)
            .ToList();

        // Helper method to get items by type
        public static List<Item> GetItemsByType(ItemType type)
        {
            return type switch
            {
                ItemType.General => GeneralItems,
                ItemType.Clothing => ClothingItems,
                ItemType.Weapon => WeaponItems,
                _ => new List<Item>()
            };
        }
    }
}
