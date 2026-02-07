import urllib.request
import urllib.parse
import os

prompt = "fantasy giant rat monster"
encoded_prompt = urllib.parse.quote(prompt)
url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
with urllib.request.urlopen(url) as response:
    image_data = response.read()
os.makedirs("images", exist_ok=True)
with open("images/Giant_Rat.png", "wb") as f:
    f.write(image_data)
