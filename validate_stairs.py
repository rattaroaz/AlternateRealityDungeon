#!/usr/bin/env python3
"""
Validate stair synchronization between levels.
"""

import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def validate_stair_sync():
    with open('Data/Maps/map_collection.json', 'r') as f:
        data = json.load(f)
    
    map_data = data['DefaultMap']
    levels = map_data['Levels']
    
    print("=" * 70)
    print("STAIR SYNCHRONIZATION VALIDATION")
    print("=" * 70)
    
    # Collect all stairs on each level
    stairs_down_by_level = []
    stairs_up_by_level = []
    
    for level_idx, level in enumerate(levels):
        down = []
        up = []
        for y in range(len(level)):
            for x in range(len(level[y])):
                if level[y][x] == 2:  # STAIRS_DOWN
                    down.append((x, y))
                elif level[y][x] == 3:  # STAIRS_UP
                    up.append((x, y))
        stairs_down_by_level.append(sorted(down))
        stairs_up_by_level.append(sorted(up))
    
    # Check synchronization
    errors = []
    
    for level_idx in range(len(levels)):
        print(f"\nLevel {level_idx}:")
        print(f"  Stairs Down: {stairs_down_by_level[level_idx]}")
        print(f"  Stairs Up:   {stairs_up_by_level[level_idx]}")
        
        # Check stairs down sync with next level up
        if level_idx < len(levels) - 1:
            next_up = set(stairs_up_by_level[level_idx + 1])
            for pos in stairs_down_by_level[level_idx]:
                if pos not in next_up:
                    error = f"Level {level_idx} stairs DOWN at {pos} has no matching stairs UP on Level {level_idx + 1}"
                    print(f"  ❌ {error}")
                    errors.append(error)
                else:
                    print(f"  ✓ Stairs DOWN at {pos} matches Level {level_idx + 1} UP")
        
        # Check stairs up sync with previous level down
        if level_idx > 0:
            prev_down = set(stairs_down_by_level[level_idx - 1])
            for pos in stairs_up_by_level[level_idx]:
                if pos not in prev_down:
                    error = f"Level {level_idx} stairs UP at {pos} has no matching stairs DOWN on Level {level_idx - 1}"
                    print(f"  ❌ {error}")
                    errors.append(error)
                else:
                    print(f"  ✓ Stairs UP at {pos} matches Level {level_idx - 1} DOWN")
    
    print("\n" + "=" * 70)
    if errors:
        print(f"❌ FOUND {len(errors)} STAIR SYNC ERRORS:")
        for error in errors:
            print(f"  - {error}")
    else:
        print("✅ ALL STAIRS PROPERLY SYNCHRONIZED")
    print("=" * 70)
    
    return len(errors) == 0

if __name__ == "__main__":
    sys.exit(0 if validate_stair_sync() else 1)
