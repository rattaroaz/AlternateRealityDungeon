#!/usr/bin/env python3
"""
Validate the generated dungeon maps and show statistics.
"""

import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def validate_map():
    with open('Data/Maps/map_collection.json', 'r') as f:
        data = json.load(f)
    
    map_data = data['DefaultMap']
    
    print("=" * 60)
    print("CUSTOM DUNGEON MAP VALIDATION")
    print("=" * 60)
    print(f"\nMap Name: {map_data['Name']}")
    print(f"Map ID: {map_data['Id']}")
    print(f"Dimensions: {map_data['Width']}x{map_data['Height']}")
    print(f"Number of Levels: {map_data['NumLevels']}")
    print(f"Player Start: ({map_data['PlayerStartX']}, {map_data['PlayerStartY']})")
    
    # Tile type names
    tile_names = {
        0: "Floor",
        1: "Wall",
        2: "Stairs Down",
        3: "Stairs Up",
        5: "Guild (North entrance)",
        6: "Shop (East entrance)",
        7: "Inn (South entrance)",
        8: "Smith (West entrance)"
    }
    
    # Validate each level
    for level_idx, level in enumerate(map_data['Levels']):
        print(f"\n{'-' * 60}")
        print(f"LEVEL {level_idx + 1}")
        print(f"{'-' * 60}")
        
        # Count tile types
        tile_counts = {}
        special_rooms = []
        
        for y, row in enumerate(level):
            for x, tile in enumerate(row):
                tile_counts[tile] = tile_counts.get(tile, 0) + 1
                if tile in [5, 6, 7, 8]:  # Special rooms
                    special_rooms.append((tile, x, y))
        
        print("\nTile Statistics:")
        for tile_type in sorted(tile_counts.keys()):
            name = tile_names.get(tile_type, f"Unknown ({tile_type})")
            count = tile_counts[tile_type]
            total_tiles = len(level) * len(level[0])
            percent = (count / total_tiles) * 100
            print(f"  {name:30s}: {count:5d} ({percent:5.2f}%)")
        
        # Check for required elements
        print("\nSpecial Rooms Found:")
        has_guild = any(r[0] == 5 for r in special_rooms)
        has_shop = any(r[0] == 6 for r in special_rooms)
        has_inn = any(r[0] == 7 for r in special_rooms)
        has_smith = any(r[0] == 8 for r in special_rooms)
        
        for room_tile, x, y in special_rooms:
            room_name = tile_names[room_tile]
            print(f"  ✓ {room_name:30s} at ({x:2d}, {y:2d})")
        
        if not has_guild:
            print("  ✗ WARNING: No Guild found!")
        if not has_shop:
            print("  ✗ WARNING: No Shop found!")
        if not has_inn:
            print("  ✗ WARNING: No Inn found!")
        if not has_smith:
            print("  ✗ WARNING: No Smith found!")
        
        # Check stairs
        has_stairs_down = 2 in tile_counts
        has_stairs_up = 3 in tile_counts
        
        print("\nStairs:")
        if has_stairs_up:
            stairs_up_count = tile_counts[3]
            print(f"  ✓ Stairs Up: {stairs_up_count}")
        else:
            if level_idx > 0:
                print("  ✗ WARNING: No stairs up on level above ground!")
        
        if has_stairs_down:
            stairs_down_count = tile_counts[2]
            print(f"  ✓ Stairs Down: {stairs_down_count}")
        else:
            if level_idx < len(map_data['Levels']) - 1:
                print("  ✗ WARNING: No stairs down on non-final level!")
            else:
                print("  ✓ Final level - no stairs down (correct)")
    
    # Validate edge-based walls
    print(f"\n{'-' * 60}")
    print("EDGE-BASED WALLS VALIDATION")
    print(f"{'-' * 60}")
    
    h_walls = map_data['HWalls']
    v_walls = map_data['VWalls']
    h_doors = map_data['HDoors']
    v_doors = map_data['VDoors']
    
    print(f"\nHorizontal Walls: {len(h_walls)} levels")
    for i, level_walls in enumerate(h_walls):
        wall_count = sum(sum(1 for w in row if w) for row in level_walls)
        print(f"  Level {i+1}: {wall_count} horizontal walls")
    
    print(f"\nVertical Walls: {len(v_walls)} levels")
    for i, level_walls in enumerate(v_walls):
        wall_count = sum(sum(1 for w in row if w) for row in level_walls)
        print(f"  Level {i+1}: {wall_count} vertical walls")
    
    print(f"\nHorizontal Doors: {len(h_doors)} levels")
    for i, level_doors in enumerate(h_doors):
        door_count = sum(sum(1 for d in row if d > 0) for row in level_doors)
        print(f"  Level {i+1}: {door_count} horizontal doors")
    
    print(f"\nVertical Doors: {len(v_doors)} levels")
    for i, level_doors in enumerate(v_doors):
        door_count = sum(sum(1 for d in row if d > 0) for row in level_doors)
        print(f"  Level {i+1}: {door_count} vertical doors")
    
    print("\n" + "=" * 60)
    print("VALIDATION COMPLETE")
    print("=" * 60)

    errors = []
    if map_data.get('Width') != 65 or map_data.get('Height') != 65:
        errors.append("Unexpected map dimensions.")
    if map_data.get('NumLevels') != 4:
        errors.append("Expected 4 levels.")
    if not map_data.get('Levels'):
        errors.append("Default map has no levels.")

    if errors:
        print("\n✗ Map structure failed:")
        for error in errors:
            print(f"  - {error}")
        return False

    print("\n✓ Map structure is valid and ready to use!")
    return True

if __name__ == "__main__":
    sys.exit(0 if validate_map() else 1)
