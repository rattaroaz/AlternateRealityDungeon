namespace AlternateRealityDungeon
{
    public class Monster
    {
        public string Name { get; set; }
        public int Level { get; set; }
        public int Hitpoints { get; set; }
        public int Attack { get; set; }
        public int Defense { get; set; }
        public int ExperienceReward { get; set; }
        public int GoldDrop { get; set; }
        public Dictionary<string, DamageGrade> DamageTypes { get; set; } = new Dictionary<string, DamageGrade>();
        public Dictionary<string, DamageGrade> Resistances { get; set; } = new Dictionary<string, DamageGrade>();

        public Monster(string name, int level, int hitpoints, int attack, int defense, int experienceReward, int goldDrop)
        {
            Name = name;
            Level = level;
            Hitpoints = hitpoints;
            Attack = attack;
            Defense = defense;
            ExperienceReward = experienceReward;
            GoldDrop = goldDrop;
        }
    }

    public static class Monsters
    {
        // Weak Monsters (Level 1-10)
        public static readonly List<Monster> WeakMonsters = new()
        {
            new Monster("Giant Rat", 1, 8, 5, 2, 10, 2)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Low } }
            },
            new Monster("Cave Bat", 1, 6, 4, 1, 8, 1)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Low } }
            },
            new Monster("Slime", 2, 12, 6, 3, 15, 3)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Low } },
                Resistances = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Medium } }
            },
            new Monster("Goblin", 2, 15, 8, 4, 20, 5)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium } }
            },
            new Monster("Skeleton", 3, 18, 10, 5, 25, 8)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.High } }
            },
            new Monster("Giant Spider", 3, 20, 12, 4, 30, 10)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium }, { "poison", DamageGrade.Medium } }
            },
            new Monster("Zombie", 4, 25, 10, 8, 35, 12)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Medium } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.High }, { "evil", DamageGrade.Medium } }
            },
            new Monster("Kobold", 4, 22, 14, 6, 40, 15)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium } }
            },
            new Monster("Giant Centipede", 5, 28, 16, 7, 45, 18)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Low }, { "poison", DamageGrade.High } }
            },
            new Monster("Ghoul", 5, 32, 18, 10, 55, 22)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Medium }, { "cold", DamageGrade.Low } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.High } }
            }
        };

        // Moderate Monsters (Level 6-15)
        public static readonly List<Monster> ModerateMonsters = new()
        {
            new Monster("Orc Warrior", 6, 40, 22, 12, 70, 30)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "blunt", DamageGrade.Medium } }
            },
            new Monster("Hobgoblin", 6, 38, 20, 14, 65, 28)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High } }
            },
            new Monster("Harpy", 7, 35, 24, 10, 80, 35)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "air", DamageGrade.Medium } }
            },
            new Monster("Wererat", 7, 42, 26, 15, 85, 40)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High } },
                Resistances = new Dictionary<string, DamageGrade> { { "poison", DamageGrade.Medium } }
            },
            new Monster("Shadow", 8, 45, 28, 8, 95, 45)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.High }, { "evil", DamageGrade.Medium } },
                Resistances = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "blunt", DamageGrade.High } }
            },
            new Monster("Wight", 8, 50, 30, 18, 100, 50)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.High }, { "evil", DamageGrade.High } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.Excellent } }
            },
            new Monster("Ogre", 9, 65, 35, 20, 120, 60)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Excellent } }
            },
            new Monster("Gargoyle", 9, 55, 32, 25, 115, 55)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "earth", DamageGrade.Medium } },
                Resistances = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "blunt", DamageGrade.Medium } }
            },
            new Monster("Wraith", 10, 60, 38, 15, 140, 70)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.Excellent }, { "evil", DamageGrade.High } },
                Resistances = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "blunt", DamageGrade.Excellent } }
            },
            new Monster("Troll", 10, 80, 40, 22, 150, 75)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "blunt", DamageGrade.High } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.Medium } }
            }
        };

        // Strong Monsters (Level 11-20)
        public static readonly List<Monster> StrongMonsters = new()
        {
            new Monster("Minotaur", 11, 90, 45, 28, 180, 90)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "blunt", DamageGrade.Excellent } }
            },
            new Monster("Basilisk", 12, 85, 48, 30, 200, 100)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "poison", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "poison", DamageGrade.Godlike } }
            },
            new Monster("Manticore", 12, 95, 50, 26, 210, 105)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "poison", DamageGrade.High } }
            },
            new Monster("Medusa", 13, 88, 52, 24, 230, 115)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.High }, { "magic", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "poison", DamageGrade.Excellent } }
            },
            new Monster("Vampire", 14, 100, 55, 32, 260, 130)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "evil", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.Excellent }, { "evil", DamageGrade.Godlike } }
            },
            new Monster("Stone Golem", 15, 120, 58, 45, 280, 140)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Godlike }, { "earth", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Godlike }, { "fire", DamageGrade.High } }
            },
            new Monster("Chimera", 16, 130, 62, 35, 320, 160)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Excellent }, { "fire", DamageGrade.Excellent } }
            },
            new Monster("Hydra", 17, 150, 65, 38, 360, 180)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Godlike }, { "poison", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "water", DamageGrade.Godlike } }
            },
            new Monster("Beholder", 18, 140, 70, 30, 400, 200)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike }, { "evil", DamageGrade.High } },
                Resistances = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Excellent } }
            },
            new Monster("Death Knight", 20, 160, 75, 50, 500, 250)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Godlike }, { "cold", DamageGrade.Excellent }, { "evil", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike } }
            }
        };

        // Elite Monsters (Level 21-35)
        public static readonly List<Monster> EliteMonsters = new()
        {
            new Monster("Fire Elemental", 21, 170, 78, 40, 550, 275)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "cold", DamageGrade.None } }
            },
            new Monster("Ice Elemental", 21, 170, 78, 40, 550, 275)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.Godlike }, { "fire", DamageGrade.None } }
            },
            new Monster("Earth Elemental", 22, 200, 80, 55, 600, 300)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Godlike }, { "earth", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Godlike }, { "earth", DamageGrade.Godlike } }
            },
            new Monster("Air Elemental", 22, 150, 85, 35, 600, 300)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "air", DamageGrade.Godlike }, { "sharp", DamageGrade.High } },
                Resistances = new Dictionary<string, DamageGrade> { { "air", DamageGrade.Godlike }, { "sharp", DamageGrade.Excellent } }
            },
            new Monster("Lich", 25, 180, 88, 45, 750, 375)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike }, { "cold", DamageGrade.Excellent }, { "evil", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike }, { "magic", DamageGrade.Excellent } }
            },
            new Monster("Demon", 28, 220, 92, 50, 900, 450)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike }, { "good", DamageGrade.None } }
            },
            new Monster("Dragon Wyrmling", 30, 250, 95, 55, 1000, 500)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "sharp", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "sharp", DamageGrade.High } }
            },
            new Monster("Mind Flayer", 32, 200, 98, 48, 1100, 550)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike }, { "evil", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Excellent } }
            },
            new Monster("Nightmare", 33, 230, 100, 52, 1200, 600)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Excellent }, { "evil", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Excellent }, { "evil", DamageGrade.Godlike } }
            },
            new Monster("Iron Golem", 35, 300, 105, 70, 1400, 700)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Godlike }, { "blunt", DamageGrade.Excellent }, { "fire", DamageGrade.Excellent } }
            }
        };

        // Boss Monsters (Level 36-50)
        public static readonly List<Monster> BossMonsters = new()
        {
            new Monster("Archmage", 36, 280, 110, 55, 1600, 800)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike }, { "fire", DamageGrade.Excellent }, { "cold", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike } }
            },
            new Monster("Balor", 38, 350, 115, 60, 1800, 900)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "sharp", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike } }
            },
            new Monster("Vampire Lord", 40, 320, 120, 65, 2000, 1000)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "sharp", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike }, { "cold", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "cold", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike }, { "good", DamageGrade.None } }
            },
            new Monster("Storm Giant", 42, 400, 125, 70, 2200, 1100)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Godlike }, { "air", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "air", DamageGrade.Godlike } }
            },
            new Monster("Pit Fiend", 44, 420, 130, 75, 2500, 1250)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike }, { "sharp", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike }, { "magic", DamageGrade.Excellent } }
            },
            new Monster("Ancient Dragon", 46, 500, 140, 80, 3000, 1500)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "sharp", DamageGrade.Godlike }, { "magic", DamageGrade.Excellent } },
                Resistances = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "sharp", DamageGrade.Excellent }, { "magic", DamageGrade.High } }
            },
            new Monster("Archlich", 47, 450, 145, 70, 3200, 1600)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike }, { "cold", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Godlike }, { "cold", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike } }
            },
            new Monster("Titan", 48, 550, 150, 85, 3500, 1750)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "blunt", DamageGrade.Godlike }, { "power", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "magic", DamageGrade.Excellent }, { "power", DamageGrade.Excellent } }
            },
            new Monster("Demon Lord", 49, 600, 155, 80, 4000, 2000)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike }, { "magic", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "fire", DamageGrade.Godlike }, { "evil", DamageGrade.Godlike }, { "magic", DamageGrade.Excellent } }
            },
            new Monster("The Dark One", 50, 666, 166, 90, 5000, 2500)
            {
                DamageTypes = new Dictionary<string, DamageGrade> { { "evil", DamageGrade.Godlike }, { "magic", DamageGrade.Godlike }, { "power", DamageGrade.Godlike } },
                Resistances = new Dictionary<string, DamageGrade> { { "evil", DamageGrade.Godlike }, { "magic", DamageGrade.Godlike }, { "good", DamageGrade.None } }
            }
        };

        // Combined list of all monsters
        public static readonly List<Monster> AllMonsters = WeakMonsters
            .Concat(ModerateMonsters)
            .Concat(StrongMonsters)
            .Concat(EliteMonsters)
            .Concat(BossMonsters)
            .ToList();

        // Helper method to get monsters by level range
        public static List<Monster> GetMonstersByLevelRange(int minLevel, int maxLevel)
        {
            return AllMonsters.Where(m => m.Level >= minLevel && m.Level <= maxLevel).ToList();
        }

        // Helper method to get a random monster for a given level
        public static Monster? GetRandomMonsterForLevel(int level, int variance = 2)
        {
            var candidates = AllMonsters.Where(m => m.Level >= level - variance && m.Level <= level + variance).ToList();
            if (candidates.Count == 0) return null;
            return candidates[new Random().Next(candidates.Count)];
        }
    }
}
