import os
import urllib.request
import urllib.parse
import time

os.makedirs("images", exist_ok=True)

svg_files = [f for f in os.listdir("images") if f.endswith('.svg')]

for svg_file in svg_files:
    name = svg_file[:-4].replace('_', ' ')  # remove .svg, replace _ with space
    prompt = f"fantasy {name.lower()} monster"
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
    try:
        with urllib.request.urlopen(url) as response:
            image_data = response.read()
        png_file = svg_file.replace('.svg', '.png')
        with open(f"images/{png_file}", "wb") as f:
            f.write(image_data)
        print(f"Generated {name}")
    except Exception as e:
        print(f"Failed {name}: {e}")
    time.sleep(10)  # delay to avoid rate limit
