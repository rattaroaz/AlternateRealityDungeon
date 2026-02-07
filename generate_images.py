import os

monster_names = [
    "Giant Rat",
    "Cave Bat",
    "Slime",
    "Goblin",
    "Skeleton",
    "Giant Spider",
    "Zombie",
    "Kobold",
    "Giant Centipede",
    "Ghoul",
    "Orc Warrior",
    "Hobgoblin",
    "Harpy",
    "Wererat",
    "Shadow",
    "Wight",
    "Ogre",
    "Gargoyle",
    "Wraith",
    "Troll",
    "Minotaur",
    "Basilisk",
    "Manticore",
    "Medusa",
    "Vampire",
    "Stone Golem",
    "Chimera",
    "Hydra",
    "Beholder",
    "Death Knight",
    "Fire Elemental",
    "Ice Elemental",
    "Earth Elemental",
    "Air Elemental",
    "Lich",
    "Demon",
    "Dragon Wyrmling",
    "Mind Flayer",
    "Nightmare",
    "Iron Golem",
    "Archmage",
    "Balor",
    "Vampire Lord",
    "Storm Giant",
    "Pit Fiend",
    "Ancient Dragon",
    "Archlich",
    "Titan",
    "Demon Lord",
    "The Dark One"
]

os.makedirs("images", exist_ok=True)

for name in monster_names:
    svg_content = f'''<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
<rect width="300" height="100" fill="white"/>
<text x="10" y="60" font-size="24" fill="black">{name}</text>
</svg>'''
    filename = name.replace(" ", "_") + ".svg"
    with open(f"images/{filename}", "w") as f:
        f.write(svg_content)
