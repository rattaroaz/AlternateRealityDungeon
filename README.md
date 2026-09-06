# Alternate Reality: The Dungeon

A complete 3D dungeon crawler inspired by the classic 1980s Atari Alternate Reality series. Built with .NET MAUI Blazor and Three.js, featuring guild systems, dynamic encounters, challenging bosses, and deep RPG mechanics.

## 🎮 Game Overview

Explore a deadly 4-level dungeon filled with monsters, treasures, and mysteries. Join guilds for special abilities, rest at inns, upgrade equipment at smiths, and face powerful bosses on your quest to defeat The Dark One and escape the depths.

## ✨ Complete Feature Set

### Core Gameplay
- **3D First-Person Exploration** - Navigate procedurally generated dungeons with Three.js rendering
- **Dynamic Combat System** - Real-time monster encounters with tactical battle options
- **Challenging Progression** - Exponential XP requirements (1000, 2000, 4000, 8000...)
- **Gold Economy** - Earn, spend, and manage resources across shops, inns, and services
- **Save/Load System** - Persistent game state with full progress tracking

### Guild System (NEW!)
Join one of 5 guilds, each with unique benefits and progression paths:

- **Warriors Guild** - Strength bonuses, combat benefits, smith discounts
- **Mages Guild** - Intelligence/Wisdom boosts, magic item discounts, scrolls
- **Thieves Guild** - Skill/Speed increases, stealing, backstab, shadow step
- **Clerics Guild** - Wisdom bonuses, healing, turn undead, resurrection
- **Rangers Guild** - Speed/Skill bonuses, ambush avoidance, tracking, double shot

Each guild has 5 ranks with increasing benefits and quest requirements.

### Special Locations
- **Guilds** (North entrance) - Join, rank up, complete quests
- **Shops** (East entrance) - Buy weapons, potions, supplies
- **Inns** (South entrance) - Rest and heal with risk/reward choices:
  - Poor Room (cheap, risky)
  - Common Room (affordable, moderate risk)
  - Private Room (safe, expensive)
  - Luxury Suite (full heal + XP bonus)
- **Smiths** (West entrance) - Buy armor, repair equipment, upgrade weapons, forge items

### Boss Encounters (NEW!)
Face unique named bosses on each dungeon level:
- **Orc Warlord** (Level 1) - Rage ability, war cry
- **Necromancer** (Level 2) - Life drain, summon skeleton, dark bolt
- **Dragon Wyrmling** (Level 3) - Fire breath, wing buffet, tail swipe
- **The Dark One** (Level 4) - Shadow strike, darkness, teleport - THE FINAL BOSS

### Combat System
- **6 Battle Actions**:
  1. Attack - Standard strike
  2. Charge - Higher damage, lower accuracy
  3. Aimed Attack - Better accuracy and damage, slower
  4. Transact - Use Charisma to avoid combat
  5. Switch Weapon - Swap primary/secondary mid-battle
  6. Run - Flee (Speed-based success)
- **Balanced Encounters** - 2-8% chance per second, reduced by Speed stat
- **Resource Management** - HP, gold, and equipment condition matter

### Character Progression
- **7 Core Stats** - Stamina, Charisma, Strength, Intelligence, Wisdom, Skill, Speed
- **Level Scaling** - +3-6 points to all stats per level (cap 255)
- **Guild Bonuses** - Additional stat increases based on guild and rank
- **Equipment Effects** - Weapons, armor, and clothing modify combat stats

### Weapon System
- **Primary Weapon** - Used for attack damage
- **Secondary Weapon** - Provides defense only
- **Two-Handed Penalty** - Using a shield with a two-handed weapon reduces skill by 50%
- **40+ Weapons** - Swords, axes, bows, staffs, hammers, shields, and magical variants

### Equipment & Items
- **60 Clothing Items** - Magical effects like stealth, speed, regeneration
- **60 Armor Pieces** - Physical defense + magical properties
- **Potions** - Healing (20/50/100 HP), stat buffs, antidotes
- **Consumables** - Food, water, torches, tools

### Win/Lose Conditions (NEW!)
- **Victory** - Defeat The Dark One on Level 4, view final stats screen
- **Death** - Permanent unless you're a max-rank Cleric (resurrection ability)
- **Progress Tracking** - Monsters defeated, bosses slain, deepest floor reached

## 🎯 Controls

### Movement
- **WASD / Arrow Keys** - Move forward/backward, turn left/right
- **Enter** - Use stairs to change levels
- **Space** - Jump (in special rooms: exit)
- **Z** - Crouch

### Interface
- **I** - Toggle inventory
- **U** - Use items (potions, equipment)
- **G** - Get items from ground
- **L** - Lose/drop items
- **P** - Pause
- **Q** - Quick save

### Special Rooms
- **1-9 Keys** - Select options in guilds, shops, inns, smiths
- **Space** - Exit special room

### Combat
- **1-6 Keys** - Choose battle action

## 🚀 Getting Started

### Prerequisites
- .NET 10.0 SDK
- Visual Studio 2022 or compatible IDE
- Windows, macOS, iOS, or Android device

### Installation
```bash
git clone https://github.com/rattaroaz/AlternateRealityDungeon.git
cd AlternateRealityDungeon
dotnet restore
dotnet run --framework net10.0-windows10.0.19041.0
```

### First Steps
1. **Create Character** - Stats are randomized (8-20 each)
2. **Read Tutorial** - Displayed on first launch
3. **Explore Level 1** - Find guild, inn, shop, smith
4. **Join a Guild** - Costs 100 gold + stat requirement
5. **Fight Monsters** - Gain XP and gold
6. **Defeat Bosses** - Progress to deeper levels
7. **Survive** - Escape or die trying!

## 🎲 Gameplay Tips

### Survival Strategies
- **Join a Guild Early** - Stat bonuses make early game easier
- **Balance Risk/Reward** - Cheap inn rooms are risky but affordable
- **Save Often** - Use Q for quick save before dangerous areas
- **Upgrade Equipment** - Visit smiths regularly
- **Watch Your HP** - Buy healing potions before deep runs

### Guild Recommendations
- **New Players**: Fighters (straightforward combat bonuses)
- **High Intelligence**: Mages (magic discounts, powerful late game)
- **High Skill/Speed**: Thieves (versatility, great mobility)
- **High Wisdom**: Clerics (healing, resurrection at max rank)
- **Balanced Stats**: Rangers (good all-around bonuses)

### Combat Tips
- **Use Aimed Attack** on strong enemies (30% hit bonus)
- **Charge** for burst damage when ahead
- **Transact** if Charisma is high (avoid damage)
- **Run Early** if severely outmatched
- **Switch Weapons** to avoid two-handed penalty

## 📊 Game Statistics

- **4 Dungeon Levels** - Increasing difficulty
- **50+ Monster Types** - From rats to ancient dragons
- **4 Named Bosses** - Unique abilities and loot
- **5 Guilds** - 25 ranks total across all guilds
- **120 Equipment Items** - Weapons, armor, clothing
- **4 Special Room Types** - Guild, shop, inn, smith
- **Exponential Progression** - Up to level 20+ achievable

## 🏗️ Technical Details

### Architecture
- **Frontend**: .NET MAUI Blazor (cross-platform UI)
- **Graphics**: Three.js (WebGL 3D rendering)
- **State**: C# models with JSON persistence
- **Logic**: JavaScript game engine with event-driven combat

### File Structure
```
AlternateRealityDungeon/
├── wwwroot/
│   ├── js/
│   │   ├── game.js          # Core game engine (3800+ lines)
│   │   └── mapeditor.js     # Level editor
│   ├── index.html
│   └── app.css
├── PlayerState.cs           # Game state models
├── Items.cs                 # 40+ weapons with stats
├── Monsters.cs              # 50+ monsters with abilities
├── SaveGameService.cs       # Persistence layer
└── *.csproj                # MAUI project configuration
```

## 🎨 Game Design

### Inspiration
Based on the 1980s Alternate Reality series, focusing on:
- **Atmosphere** - Dark dungeons, mysterious encounters
- **Challenge** - Meaningful risk/reward decisions
- **Progression** - Character growth through guilds and levels
- **Exploration** - Discovering secrets and special locations

### Difficulty Balance
- **Early Game**: Forgiving, guild bonuses help
- **Mid Game**: Resource management becomes critical
- **Late Game**: Boss fights require strategy and preparation
- **Final Boss**: Epic challenge requiring optimal build

## 🐛 Known Issues

None currently - game is feature-complete and fully playable!

## 🔮 Future Enhancements

Potential additions (not currently planned):
- More dungeon levels (5-10)
- Additional guilds (Paladins, Assassins)
- Crafting system expansion
- Multiplayer co-op mode
- Custom dungeon editor

## 📝 Changelog

### Version 1.0 (Current)
- ✅ Complete guild system with 5 guilds
- ✅ Inn rest mechanics with risks
- ✅ Shop and smith services
- ✅ Boss encounters on all 4 levels
- ✅ Balanced random encounters
- ✅ Win/lose conditions
- ✅ Tutorial and onboarding
- ✅ Gold economy
- ✅ Full save/load support

## 🤝 Contributing

This is a demonstration project, but issues and PRs are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and open a PR

## 📜 License

This project is provided as-is for educational and entertainment purposes.

## 🙏 Credits

- **Original Concept**: Alternate Reality series by Datasoft (1980s)
- **Development**: MAUI Blazor + Three.js integration
- **Game Design**: Classic dungeon crawler mechanics with modern enhancements

---

**Enjoy your adventure in the dungeon! May fortune favor the brave.**
