AlternateRealityDungeon
===================

A 3D dungeon crawler game built with .NET MAUI Blazor and Three.js. Explore procedurally generated dungeons, battle monsters, level up your character, and master the primary/secondary weapon system.

GAME OVERVIEW
=============

AlternateRealityDungeon is a classic dungeon crawler where you explore a multi-level dungeon filled with monsters, treasures, and challenges. The game features a unique leveling system where experience requirements double with each level, and a tactical weapon system where you equip primary weapons for attack and secondary weapons for defense.

FEATURES
========

Core Gameplay
-------------
- 3D dungeon exploration with procedurally generated levels
- Real-time combat with monsters
- Experience-based leveling system (doubles XP requirements per level)
- Inventory management system
- Save/load game functionality

Character Progression
---------------------
- Start with randomized stats (Stamina, Charisma, Strength, Intelligence, Wisdom, Skill, Speed)
- Level up at 1000 XP, then 2000, 4000, 8000, etc.
- Each level gain: +3-6 points to all stats (capped at 99)
- Base stats track permanent progression, current stats include equipment bonuses

Weapon System
-------------
- Primary weapons: Used for attack damage
- Secondary weapons: Used only for defense
- Two-handed weapons (bows, spears, staffs, hammers, large swords): Require both hands
- Skill penalty: Using a secondary weapon with a two-handed primary reduces skill by 50%

Equipment & Items
-----------------
- Weapons: Swords, bows, daggers, axes, maces, spears, hammers, staffs, crossbows, shields
- Armor: Various clothing items for defense
- Consumables: Food, torches, water flasks
- Compass and timepiece (always equipped)

Combat
------
- Turn-based battles with multiple action choices
- Attack, defend, flee, and use items during combat
- Monster encounters trigger randomly while exploring
- Stats determine attack, defense, skill, and speed in battles

DUNGEON DESIGN
==============

The dungeon consists of multiple levels (floors) with:
- Procedurally generated layouts
- Different monster types per level
- Treasure chests and ground items
- Stairs connecting levels
- Walls, floors, and interactive elements

MONSTERS
========

Monsters scale with dungeon level and include:
- Weak: Giant Rat, Cave Bat, Slime, Goblin, Skeleton, Giant Spider, Zombie, Kobold, Giant Centipede, Ghoul
- Moderate: Various stronger variants
- Boss monsters and special encounters

GETTING STARTED
===============

Prerequisites
-------------
- .NET 7.0 or later
- Visual Studio 2022 or compatible IDE

Installation
------------
1. Clone the repository
2. Open AlternateRealityDungeon.sln in Visual Studio
3. Build and run the project

Controls
--------

Movement
--------
- WASD: Move forward/backward/strafe
- Mouse: Look around (mouse look disabled, use discrete turns)
- Space: Jump
- Z: Crouch
- Shift: Sprint (while moving forward)

Game Interface
--------------
- I: Toggle inventory display
- U: Use items mode
- G: Get items from ground
- L: Lose/discard items mode
- Q: Quick save (with position)

Inventory Management
--------------------
- Use (U) mode: Browse inventory, select items to use
- When using weapons: Choose Primary (P) or Secondary (S) slot
- Primary weapons: Attack-focused
- Secondary weapons: Defense-focused only
- Two-handed weapons show penalty warning

Combat
------
- 1-6: Select battle actions (attack, defend, special moves, flee, etc.)
- During battle, choose from available combat options
- Manage HP with food/water items

Weapon Equip System
-------------------
When using a weapon:
1. Press U to enter Use mode
2. Select the weapon
3. Choose equip slot:
   - P: Primary (attack bonus)
   - S: Secondary (defense bonus only)
   - E: Cancel

Two-handed weapons (bows, spears, staffs, hammers, large swords) will show a warning and apply 50% skill reduction when used with a secondary weapon.

GAME PROGRESSION
================

Leveling System
---------------
- Start at level 0
- Reach level 1 at 1000 XP
- Each subsequent level requires double the previous XP
- Level 2: 2000 XP, Level 3: 4000 XP, Level 4: 8000 XP, etc.
- Level up grants +3-6 points to all base stats
- Stats cap at 99 (equipment can temporarily exceed this)

Stat Maximums
-------------
- Base stats: Hard cap at 99
- Current stats: Can exceed 99 with equipment
- If equipment pushes stat over 99, it stays capped until equipment is removed

FILE STRUCTURE
==============

Root Directory
--------------
- AlternateRealityDungeon.csproj: Main project file
- PlayerState.cs: Game state and player data models
- Items.cs: Item definitions and stats
- Monsters.cs: Monster definitions and stats
- SaveGameService.cs: Save/load functionality
- weapons.txt: Weapon stat data
- monsters.txt: Monster data
- todo.txt: Development notes

wwwroot/
--------
- index.html: Main HTML page
- app.css: Styling
- js/game.js: Core game logic
- js/mapeditor.js: Level editor (if applicable)

TECHNICAL DETAILS
=================

Built With
----------
- .NET MAUI Blazor: Cross-platform UI framework
- Three.js: 3D graphics and rendering
- C#: Backend logic and data models
- JavaScript: Game engine and UI interactions

Architecture
------------
- Blazor WebView for UI rendering
- JavaScript game engine handling 3D graphics and gameplay
- C# backend for game state management and persistence
- JSON-based save system

Performance
-----------
- WebGL-accelerated 3D rendering
- Efficient dungeon generation
- Real-time combat calculations
- Persistent game state management

DEVELOPMENT STATUS
==================

Current Features (✓)
---------------------
✓ Character creation with randomized stats
✓ 3D dungeon exploration
✓ Monster encounters and combat
✓ Leveling system (doubling XP requirements)
✓ Inventory management
✓ Primary/secondary weapon system with two-handed penalties
✓ Save/load game functionality

Planned Features (todo.txt)
--------------------------
- Enhanced dungeon design
- More monster varieties
- Expanded equipment system
- Advanced combat options
- Improved encounter randomness

CREDITS
=======

Developed as a demonstration of .NET MAUI Blazor and Three.js integration for dungeon crawler gameplay.

For questions or contributions, please refer to the project repository.
