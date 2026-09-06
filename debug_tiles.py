#!/usr/bin/env python3
"""Debug script to check specific tile positions."""
import json

with open('Data/Maps/map_collection.json', 'r') as f:
    data = json.load(f)

map_data = data['DefaultMap']
levels = map_data['Levels']

# Check Level 1
print("Level 1 - Looking for special rooms:")
print(f"  Position [22][32] should be GUILD (5): actual value = {levels[0][22][32]}")
print(f"  Position [32][39] should be SHOP (6): actual value = {levels[0][32][39]}")
print(f"  Position [40][32] should be INN (7): actual value = {levels[0][40][32]}")
print(f"  Position [32][25] should be SMITH (8): actual value = {levels[0][32][25]}")

# Scan for any special rooms on Level 1
print("\nScanning Level 1 for all special room tiles (5-8):")
for y in range(65):
    for x in range(65):
        tile = levels[0][y][x]
        if tile >= 5 and tile <= 8:
            print(f"  Found tile {tile} at position [{y}][{x}]")
