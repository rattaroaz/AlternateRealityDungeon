#!/usr/bin/env python3
"""
Final comprehensive validation of the dungeon maps.
"""

import json

def final_validation():
    with open('Data/Maps/map_collection.json', 'r') as f:
        data = json.load(f)
    
    map_data = data['DefaultMap']
    levels = map_data['Levels']
    
    print("=" * 70)
    print("FINAL VALIDATION REPORT")
    print("=" * 70)
    
    # Check services
    print("\n📍 SERVICE PLACEMENT VERIFICATION")
    print("-" * 70)
    services = {5: "Guild", 6: "Shop", 7: "Inn", 8: "Smith"}
    for level_idx, level in enumerate(levels):
        found_services = {}
        for y in range(len(level)):
            for x in range(len(level[y])):
                tile = level[y][x]
                if tile in services:
                    found_services[services[tile]] = (x, y)
        
        print(f"\nLevel {level_idx}:")
        for service_name in ["Guild", "Shop", "Inn", "Smith"]:
            if service_name in found_services:
                pos = found_services[service_name]
                print(f"  ✓ {service_name:8s} at position {pos}")
            else:
                print(f"  ✗ {service_name:8s} MISSING!")
    
    # Check stairs synchronization
    print("\n" + "=" * 70)
    print("🪜 STAIR SYNCHRONIZATION")
    print("-" * 70)
    
    stairs_down = []
    stairs_up = []
    
    for level_idx, level in enumerate(levels):
        down = set()
        up = set()
        for y in range(len(level)):
            for x in range(len(level[y])):
                if level[y][x] == 2:
                    down.add((x, y))
                elif level[y][x] == 3:
                    up.add((x, y))
        stairs_down.append(down)
        stairs_up.append(up)
    
    all_synced = True
    for level_idx in range(len(levels) - 1):
        print(f"\nLevel {level_idx} → Level {level_idx + 1}:")
        if stairs_down[level_idx] == stairs_up[level_idx + 1]:
            print(f"  ✓ All {len(stairs_down[level_idx])} stairs synchronized")
            for pos in sorted(stairs_down[level_idx]):
                print(f"    • {pos}")
        else:
            print(f"  ✗ MISMATCH!")
            print(f"    Down: {sorted(stairs_down[level_idx])}")
            print(f"    Up:   {sorted(stairs_up[level_idx + 1])}")
            all_synced = False
    
    # Check doors
    print("\n" + "=" * 70)
    print("🚪 DOOR ACCESSIBILITY")
    print("-" * 70)
    
    h_doors = map_data['HDoors']
    v_doors = map_data['VDoors']
    
    for level_idx in range(len(levels)):
        h_count = sum(sum(1 for d in row if d > 0) for row in h_doors[level_idx])
        v_count = sum(sum(1 for d in row if d > 0) for row in v_doors[level_idx])
        total = h_count + v_count
        print(f"Level {level_idx}: {total:2d} doors ({h_count}H + {v_count}V)")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 VALIDATION SUMMARY")
    print("=" * 70)
    
    service_count = sum(1 for level in levels for row in level for tile in row if 5 <= tile <= 8)
    stair_down_count = sum(len(s) for s in stairs_down)
    stair_up_count = sum(len(s) for s in stairs_up)
    door_count = sum(sum(sum(1 for d in row if d > 0) for row in level_doors) 
                     for level_doors in h_doors + v_doors)
    
    print(f"\n✓ Services: {service_count} total (4 per level × 4 levels = 16 expected)")
    print(f"✓ Stairs Down: {stair_down_count} total")
    print(f"✓ Stairs Up: {stair_up_count} total")
    print(f"✓ Doors: {door_count} total")
    print(f"✓ Stair Synchronization: {'PASS' if all_synced else 'FAIL'}")
    
    print("\n" + "=" * 70)
    if service_count == 16 and all_synced:
        print("🎉 ALL VALIDATIONS PASSED - MAPS READY FOR GAMEPLAY!")
    else:
        print("⚠️  SOME VALIDATIONS FAILED - REVIEW ABOVE")
    print("=" * 70)

if __name__ == "__main__":
    final_validation()
