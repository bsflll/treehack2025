import moondream as md
from PIL import Image
import os
import gzip
import requests
from io import BytesIO
from flask import Flask, request, jsonify, render_template

app = Flask(__name__, 
    template_folder='templates',  # Set the template folder
    static_folder='static'        # Set the static folder for any static assets
)

def initialize_model():
    # Initialize with local model path
    if not os.path.exists("md_0.5b.int4.mf"):
        # Download model file if needed
        if not os.path.exists("md_0.5b.int4.mf.gz"):
            print("Downloading model file...")
            url = "https://huggingface.co/vikhyatk/moondream2/resolve/9dddae84d54db4ac56fe37817aeaeb502ed083e2/moondream-0_5b-int4.mf.gz"
            response = requests.get(url)
            with open("md_0.5b.int4.mf.gz", "wb") as f:
                f.write(response.content)
        
        # Decompress .gz file
        print("Decompressing model file...")
        with gzip.open("md_0.5b.int4.mf.gz", "rb") as f_in:
            with open("md_0.5b.int4.mf", "wb") as f_out:
                f_out.write(f_in.read())

    return md.vl(model="md_0.5b.int4.mf")

def process_image_url(url):
    try:
        # Download image from URL
        print("Downloading image...")
        response = requests.get(url)
        image = Image.open(BytesIO(response.content))
        
        # Process image
        print("Processing image...")
        encoded_image = model.encode_image(image)
        
        # Generate caption and answer
        caption = model.caption(encoded_image)["caption"]
        print("Caption:", caption)
        answer = model.query(encoded_image, "What's in this image?")["answer"]
        print("Answer:", answer)
        
        return {
            "success": True,
            "caption": caption,
            "description": answer
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.route('/')
def home():
    # Change from send_static_file to render_template
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_image():
    data = request.get_json()
    image_url = data.get('image_url')
    if not image_url:
        return jsonify({"success": False, "error": "No image URL provided"})
    
    return jsonify(process_image_url(image_url))

# Initialize model globally
model = initialize_model()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5020)
