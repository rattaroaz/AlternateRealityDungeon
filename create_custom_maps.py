#!/usr/bin/env python3
"""
Generate 4 custom hand-crafted dungeon levels for Alternate Reality Dungeon.
Each level has intentional design with guilds, shops, inns, smiths, and bosses.
"""

import json
import uuid
from datetime import datetime

# Map constants
MAP_WIDTH = 65
MAP_HEIGHT = 65
NUM_LEVELS = 4

# Tile types
FLOOR = 0
WALL = 1
STAIRS_DOWN = 2
STAIRS_UP = 3
SPECIAL_ROOM_N = 5  # Guild - North entrance
SPECIAL_ROOM_E = 6  # Shop - East entrance
SPECIAL_ROOM_S = 7  # Inn - South entrance
SPECIAL_ROOM_W = 8  # Smith - West entrance

def create_empty_level():
    """Create an empty 65x65 level filled with floor tiles."""
    return [[FLOOR for _ in range(MAP_WIDTH)] for _ in range(MAP_HEIGHT)]

def create_empty_walls():
    """Create empty edge-based wall arrays."""
    h_walls = [[False for _ in range(MAP_WIDTH)] for _ in range(MAP_HEIGHT + 1)]
    v_walls = [[False for _ in range(MAP_WIDTH + 1)] for _ in range(MAP_HEIGHT)]
    
    # Add perimeter walls
    for x in range(MAP_WIDTH):
        h_walls[0][x] = True
        h_walls[MAP_HEIGHT][x] = True
    for y in range(MAP_HEIGHT):
        v_walls[y][0] = True
        v_walls[y][MAP_WIDTH] = True
    
    return h_walls, v_walls

def create_empty_doors():
    """Create empty edge-based door arrays."""
    h_doors = [[0 for _ in range(MAP_WIDTH)] for _ in range(MAP_HEIGHT + 1)]
    v_doors = [[0 for _ in range(MAP_WIDTH + 1)] for _ in range(MAP_HEIGHT)]
    return h_doors, v_doors

def add_room(level, h_walls, v_walls, x, y, w, h, add_walls=True):
    """Add a rectangular room to the map."""
    # Clear floor
    for ry in range(y, min(y + h, MAP_HEIGHT)):
        for rx in range(x, min(x + w, MAP_WIDTH)):
            level[ry][rx] = FLOOR
    
    if add_walls:
        # Add horizontal walls (top and bottom)
        for rx in range(x, min(x + w, MAP_WIDTH)):
            if y > 0:
                h_walls[y][rx] = True
            if y + h <= MAP_HEIGHT:
                h_walls[y + h][rx] = True
        
        # Add vertical walls (left and right)
        for ry in range(y, min(y + h, MAP_HEIGHT)):
            if x > 0:
                v_walls[ry][x] = True
            if x + w <= MAP_WIDTH:
                v_walls[ry][x + w] = True

def add_corridor(level, h_walls, v_walls, x1, y1, x2, y2):
    """Add a corridor between two points."""
    # Horizontal first, then vertical
    x, y = x1, y1
    
    # Move horizontally
    while x != x2:
        level[y][x] = FLOOR
        if x < x2:
            x += 1
        else:
            x -= 1
    
    # Move vertically
    while y != y2:
        level[y][x] = FLOOR
        if y < y2:
            y += 1
        else:
            y -= 1
    
    level[y][x] = FLOOR

def add_door(h_walls, v_walls, h_doors, v_doors, x, y, direction, door_type=1):
    """Add a door at the specified location."""
    if direction == 'N':
        h_walls[y][x] = False
        h_doors[y][x] = door_type
    elif direction == 'S':
        h_walls[y + 1][x] = False
        h_doors[y + 1][x] = door_type
    elif direction == 'W':
        v_walls[y][x] = False
        v_doors[y][x] = door_type
    elif direction == 'E':
        v_walls[y][x + 1] = False
        v_doors[y][x + 1] = door_type

def create_level_1():
    """
    Level 1: Goblin Warrens
    Beginner-friendly with central hub and clear paths to all services.
    """
    level = create_empty_level()
    h_walls, v_walls = create_empty_walls()
    h_doors, v_doors = create_empty_doors()
    
    # Central hub (starting area)
    add_room(level, h_walls, v_walls, 28, 28, 9, 9)
    
    # North: Guild Hall room
    add_room(level, h_walls, v_walls, 30, 18, 5, 5)
    add_corridor(level, h_walls, v_walls, 32, 28, 32, 22)
    
    # East: Shop room
    add_room(level, h_walls, v_walls, 40, 30, 5, 5)
    add_corridor(level, h_walls, v_walls, 37, 32, 40, 32)
    
    # South: Inn room
    add_room(level, h_walls, v_walls, 30, 40, 5, 5)
    add_corridor(level, h_walls, v_walls, 32, 37, 32, 40)
    
    # West: Smith room
    add_room(level, h_walls, v_walls, 20, 30, 5, 5)
    add_corridor(level, h_walls, v_walls, 28, 32, 25, 32)
    
    # Additional exploration areas
    add_room(level, h_walls, v_walls, 10, 10, 8, 6)
    add_corridor(level, h_walls, v_walls, 14, 16, 32, 28)
    
    add_room(level, h_walls, v_walls, 48, 15, 7, 6)
    add_corridor(level, h_walls, v_walls, 48, 18, 37, 32)
    
    add_room(level, h_walls, v_walls, 15, 48, 6, 7)
    add_corridor(level, h_walls, v_walls, 18, 48, 32, 37)
    
    # Boss arena (SE corner)
    add_room(level, h_walls, v_walls, 50, 50, 10, 10)
    add_corridor(level, h_walls, v_walls, 37, 35, 50, 55)
    
    # Stairs down (multiple locations)
    level[14][14] = STAIRS_DOWN
    level[52][18] = STAIRS_DOWN
    level[55][55] = STAIRS_DOWN  # In boss area
    
    # Place special room tiles (AFTER everything else so they don't get overwritten)
    # These are placed INSIDE the rooms, not on corridors
    level[20][32] = SPECIAL_ROOM_N  # Guild (inside the north room)
    add_door(h_walls, v_walls, h_doors, v_doors, 32, 22, 'S')
    
    level[32][42] = SPECIAL_ROOM_E  # Shop (inside the east room)
    add_door(h_walls, v_walls, h_doors, v_doors, 42, 32, 'W')
    
    level[42][32] = SPECIAL_ROOM_S  # Inn (inside the south room)
    add_door(h_walls, v_walls, h_doors, v_doors, 32, 42, 'N')
    
    level[32][22] = SPECIAL_ROOM_W  # Smith (inside the west room)
    add_door(h_walls, v_walls, h_doors, v_doors, 22, 32, 'E')
    
    return level, h_walls, v_walls, h_doors, v_doors

def create_level_2():
    """
    Level 2: Ancient Crypt
    More maze-like with multiple paths and dead ends.
    """
    level = create_empty_level()
    h_walls, v_walls = create_empty_walls()
    h_doors, v_doors = create_empty_doors()
    
    # Central crypt chamber
    add_room(level, h_walls, v_walls, 25, 25, 15, 15)
    
    # North wing: Guild room
    add_room(level, h_walls, v_walls, 30, 10, 6, 6)
    add_corridor(level, h_walls, v_walls, 32, 25, 32, 15)
    
    # East wing: Shop room
    add_room(level, h_walls, v_walls, 48, 28, 6, 6)
    add_corridor(level, h_walls, v_walls, 40, 32, 48, 32)
    
    # South wing: Inn room
    add_room(level, h_walls, v_walls, 28, 48, 6, 6)
    add_corridor(level, h_walls, v_walls, 32, 40, 32, 48)
    
    # West wing: Smith room
    add_room(level, h_walls, v_walls, 12, 30, 6, 6)
    add_corridor(level, h_walls, v_walls, 25, 32, 18, 32)
    
    # Maze sections
    add_room(level, h_walls, v_walls, 8, 8, 5, 5)
    add_corridor(level, h_walls, v_walls, 10, 13, 30, 25)
    
    add_room(level, h_walls, v_walls, 52, 10, 5, 5)
    add_corridor(level, h_walls, v_walls, 54, 15, 40, 28)
    
    add_room(level, h_walls, v_walls, 10, 50, 5, 5)
    add_corridor(level, h_walls, v_walls, 12, 50, 28, 40)
    
    # Dead ends for exploration
    add_room(level, h_walls, v_walls, 5, 25, 4, 4)
    add_corridor(level, h_walls, v_walls, 7, 27, 12, 32)
    
    # Boss arena (NE corner)
    add_room(level, h_walls, v_walls, 55, 5, 8, 8)
    add_corridor(level, h_walls, v_walls, 54, 10, 48, 28)
    
    # Place special room tiles (AFTER corridors)
    level[14][32] = SPECIAL_ROOM_N  # Guild
    add_door(h_walls, v_walls, h_doors, v_doors, 32, 14, 'S')
    
    level[31][47] = SPECIAL_ROOM_E  # Shop
    add_door(h_walls, v_walls, h_doors, v_doors, 47, 31, 'W')
    
    level[47][31] = SPECIAL_ROOM_S  # Inn
    add_door(h_walls, v_walls, h_doors, v_doors, 31, 47, 'N')
    
    level[33][18] = SPECIAL_ROOM_W  # Smith
    add_door(h_walls, v_walls, h_doors, v_doors, 18, 33, 'E')
    
    # Add doors to boss arena
    add_door(h_walls, v_walls, h_doors, v_doors, 55, 8, 'W')
    
    # Stairs - MUST BE PLACED LAST to avoid being overwritten
    # Stairs up from level 1
    level[14][14] = STAIRS_UP
    level[52][18] = STAIRS_UP
    level[55][55] = STAIRS_UP
    
    # Stairs down to level 3
    level[10][10] = STAIRS_DOWN
    level[58][8] = STAIRS_DOWN
    level[52][14] = STAIRS_DOWN  # Position (14, 52) which is [52][14]
    
    return level, h_walls, v_walls, h_doors, v_doors

def create_level_3():
    """
    Level 3: Dragon's Den
    Complex layout with loops, chokepoints, and treasure areas.
    """
    level = create_empty_level()
    h_walls, v_walls = create_empty_walls()
    h_doors, v_doors = create_empty_doors()
    
    # Main cavern system (irregular shape)
    add_room(level, h_walls, v_walls, 20, 20, 25, 25)
    
    # Northwest: Guild room (on a platform)
    add_room(level, h_walls, v_walls, 15, 8, 5, 5)
    add_corridor(level, h_walls, v_walls, 17, 13, 20, 20)
    
    # Northeast: Shop room
    add_room(level, h_walls, v_walls, 50, 12, 5, 5)
    add_corridor(level, h_walls, v_walls, 45, 32, 52, 17)
    
    # Southwest: Inn room
    add_room(level, h_walls, v_walls, 12, 50, 5, 5)
    add_corridor(level, h_walls, v_walls, 20, 45, 14, 50)
    
    # Southeast: Smith room
    add_room(level, h_walls, v_walls, 48, 48, 5, 5)
    add_corridor(level, h_walls, v_walls, 45, 45, 48, 50)
    
    # Treasure pockets
    add_room(level, h_walls, v_walls, 8, 28, 4, 4)
    add_corridor(level, h_walls, v_walls, 10, 30, 20, 32)
    
    add_room(level, h_walls, v_walls, 55, 28, 4, 4)
    add_corridor(level, h_walls, v_walls, 45, 32, 55, 30)
    
    # Loop corridor (north)
    add_corridor(level, h_walls, v_walls, 25, 20, 25, 10)
    add_corridor(level, h_walls, v_walls, 25, 10, 40, 10)
    add_corridor(level, h_walls, v_walls, 40, 10, 40, 20)
    
    # Loop corridor (south)
    add_corridor(level, h_walls, v_walls, 25, 45, 25, 55)
    add_corridor(level, h_walls, v_walls, 25, 55, 40, 55)
    add_corridor(level, h_walls, v_walls, 40, 55, 40, 45)
    
    # Boss arena (massive dragon lair)
    add_room(level, h_walls, v_walls, 28, 28, 12, 12)
    
    # Place special room tiles (AFTER corridors)
    level[13][17] = SPECIAL_ROOM_N  # Guild
    add_door(h_walls, v_walls, h_doors, v_doors, 17, 13, 'S')
    
    level[14][49] = SPECIAL_ROOM_E  # Shop
    add_door(h_walls, v_walls, h_doors, v_doors, 49, 14, 'W')
    
    level[50][14] = SPECIAL_ROOM_S  # Inn
    add_door(h_walls, v_walls, h_doors, v_doors, 14, 50, 'N')
    
    level[50][53] = SPECIAL_ROOM_W  # Smith
    add_door(h_walls, v_walls, h_doors, v_doors, 53, 50, 'E')
    
    # Add doors to treasure pockets
    add_door(h_walls, v_walls, h_doors, v_doors, 10, 28, 'E')
    add_door(h_walls, v_walls, h_doors, v_doors, 55, 30, 'W')
    
    # Stairs - MUST BE PLACED LAST to avoid being overwritten
    # Stairs up from level 2
    level[10][10] = STAIRS_UP
    level[58][8] = STAIRS_UP
    level[52][14] = STAIRS_UP  # FIX: Should be at (14, 52) which is [52][14]
    
    # Stairs down to level 4
    level[17][17] = STAIRS_DOWN
    level[33][33] = STAIRS_DOWN
    level[14][52] = STAIRS_DOWN  # Position (52, 14) which is [14][52]
    
    return level, h_walls, v_walls, h_doors, v_doors

def create_level_4():
    """
    Level 4: Dark Sanctum
    Final level with long approach to The Dark One's throne room.
    """
    level = create_empty_level()
    h_walls, v_walls = create_empty_walls()
    h_doors, v_doors = create_empty_doors()
    
    # Starting area (southwest corner)
    add_room(level, h_walls, v_walls, 8, 48, 12, 10)
    
    # Services near entrance (last chance to prepare)
    # Guild room (North)
    add_room(level, h_walls, v_walls, 12, 38, 5, 5)
    add_corridor(level, h_walls, v_walls, 14, 48, 14, 42)
    
    # Shop room (East)
    add_room(level, h_walls, v_walls, 22, 52, 5, 5)
    add_corridor(level, h_walls, v_walls, 20, 52, 22, 52)
    
    # Inn room (South)
    add_room(level, h_walls, v_walls, 10, 60, 5, 3)
    add_corridor(level, h_walls, v_walls, 12, 58, 12, 60)
    
    # Smith room (West)
    add_room(level, h_walls, v_walls, 2, 52, 4, 5)
    add_corridor(level, h_walls, v_walls, 6, 52, 8, 52)
    
    # Long winding path to throne room
    add_corridor(level, h_walls, v_walls, 20, 52, 30, 52)
    add_room(level, h_walls, v_walls, 30, 48, 8, 8)
    add_corridor(level, h_walls, v_walls, 34, 48, 34, 35)
    add_room(level, h_walls, v_walls, 30, 30, 8, 8)
    add_corridor(level, h_walls, v_walls, 38, 34, 48, 34)
    add_room(level, h_walls, v_walls, 48, 30, 8, 8)
    add_corridor(level, h_walls, v_walls, 52, 30, 52, 20)
    add_room(level, h_walls, v_walls, 48, 15, 8, 8)
    add_corridor(level, h_walls, v_walls, 48, 19, 38, 19)
    add_room(level, h_walls, v_walls, 34, 15, 8, 8)
    add_corridor(level, h_walls, v_walls, 34, 15, 34, 8)
    
    # The Dark One's Throne Room (massive final arena)
    add_room(level, h_walls, v_walls, 24, 2, 18, 10)
    
    # Side chambers along the way (optional exploration)
    add_room(level, h_walls, v_walls, 42, 42, 5, 5)
    add_corridor(level, h_walls, v_walls, 38, 50, 44, 42)
    
    add_room(level, h_walls, v_walls, 25, 42, 4, 4)
    add_corridor(level, h_walls, v_walls, 27, 46, 30, 48)
    
    add_room(level, h_walls, v_walls, 58, 24, 4, 4)
    add_corridor(level, h_walls, v_walls, 56, 34, 58, 26)
    
    # Place special room tiles (AFTER corridors)
    level[43][14] = SPECIAL_ROOM_N  # Guild
    add_door(h_walls, v_walls, h_doors, v_doors, 14, 43, 'S')
    
    level[54][21] = SPECIAL_ROOM_E  # Shop
    add_door(h_walls, v_walls, h_doors, v_doors, 21, 54, 'W')
    
    level[60][12] = SPECIAL_ROOM_S  # Inn
    add_door(h_walls, v_walls, h_doors, v_doors, 12, 60, 'N')
    
    level[54][6] = SPECIAL_ROOM_W  # Smith
    add_door(h_walls, v_walls, h_doors, v_doors, 6, 54, 'E')
    
    # Add doors to side chambers
    add_door(h_walls, v_walls, h_doors, v_doors, 44, 42, 'N')
    add_door(h_walls, v_walls, h_doors, v_doors, 27, 42, 'S')
    add_door(h_walls, v_walls, h_doors, v_doors, 58, 26, 'W')
    
    # Add door to throne room
    add_door(h_walls, v_walls, h_doors, v_doors, 33, 11, 'S')
    
    # Stairs - MUST BE PLACED LAST to avoid being overwritten
    # Stairs up from level 3
    level[17][17] = STAIRS_UP
    level[33][33] = STAIRS_UP
    level[14][52] = STAIRS_UP  # Position (52, 14) which is [14][52]
    
    # No stairs down - this is the final level!
    
    return level, h_walls, v_walls, h_doors, v_doors

def create_custom_map():
    """Create the complete 4-level custom dungeon map."""
    levels = []
    all_h_walls = []
    all_v_walls = []
    all_h_doors = []
    all_v_doors = []
    
    # Create each level
    print("Creating Level 1: Goblin Warrens...")
    level1, hw1, vw1, hd1, vd1 = create_level_1()
    levels.append(level1)
    all_h_walls.append(hw1)
    all_v_walls.append(vw1)
    all_h_doors.append(hd1)
    all_v_doors.append(vd1)
    
    print("Creating Level 2: Ancient Crypt...")
    level2, hw2, vw2, hd2, vd2 = create_level_2()
    levels.append(level2)
    all_h_walls.append(hw2)
    all_v_walls.append(vw2)
    all_h_doors.append(hd2)
    all_v_doors.append(vd2)
    
    print("Creating Level 3: Dragon's Den...")
    level3, hw3, vw3, hd3, vd3 = create_level_3()
    levels.append(level3)
    all_h_walls.append(hw3)
    all_v_walls.append(vw3)
    all_h_doors.append(hd3)
    all_v_doors.append(vd3)
    
    print("Creating Level 4: Dark Sanctum...")
    level4, hw4, vw4, hd4, vd4 = create_level_4()
    levels.append(level4)
    all_h_walls.append(hw4)
    all_v_walls.append(vw4)
    all_h_doors.append(hd4)
    all_v_doors.append(vd4)
    
    # Create map data structure
    map_data = {
        "Id": str(uuid.uuid4()),
        "Name": "Custom Hand-Crafted Dungeon",
        "CreatedAt": datetime.utcnow().isoformat() + "Z",
        "Width": MAP_WIDTH,
        "Height": MAP_HEIGHT,
        "NumLevels": NUM_LEVELS,
        "PlayerStartX": 32,
        "PlayerStartY": 32,
        "Levels": levels,
        "HWalls": all_h_walls,
        "VWalls": all_v_walls,
        "HDoors": all_h_doors,
        "VDoors": all_v_doors
    }
    
    # Wrap in collection
    collection = {
        "DefaultMap": map_data,
        "SavedMaps": []
    }
    
    return collection

def main():
    print("Generating custom hand-crafted dungeon levels...")
    collection = create_custom_map()
    
    output_file = "Data/Maps/map_collection.json"
    print(f"Writing to {output_file}...")
    
    with open(output_file, 'w') as f:
        json.dump(collection, f, indent=2)
    
    print(f"✓ Successfully created 4-level custom dungeon!")
    print(f"  Level 1: Goblin Warrens (beginner-friendly hub)")
    print(f"  Level 2: Ancient Crypt (maze-like)")
    print(f"  Level 3: Dragon's Den (complex with loops)")
    print(f"  Level 4: Dark Sanctum (final challenge)")
    print(f"\nMap saved to {output_file}")

if __name__ == "__main__":
    main()
