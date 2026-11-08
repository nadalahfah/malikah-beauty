from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
import io

app = FastAPI()

# WAJIB: Izinkan Vercel (frontend) mengakses Render (backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Ganti dengan URL Vercel kamu nanti saat production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend Malikah Beauty is Running!"}

@app.post("/analyze")
async def analyze_skin(file: UploadFile = File(...)):
    # 1. Baca gambar
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    img_array = np.array(image)
    
    # 2. LOGIKA ML (Sementara kita tiru logika CIELAB kamu di Python)
    # Ambil rata-rata warna tengah gambar
    h, w, _ = img_array.shape
    center_pixels = img_array[int(h*0.3):int(h*0.7), int(w*0.3):int(w*0.7)]
    avg_color = np.mean(center_pixels, axis=(0, 1))
    r, g, b = avg_color

    # Logika sederhana menentukan undertone
    if r > b + 10:
        undertone = "Warm"
        personal_color = "Warm Spring"
        palette = ["#F4C2A1", "#E8A87C", "#C9A27E", "#A67C52", "#FDE3C8"]
    elif b > r + 10:
        undertone = "Cool"
        personal_color = "Cool Winter"
        palette = ["#E3E8F2", "#B8C4D4", "#8B9DC3", "#5A6B7E", "#F5F7FA"]
    else:
        undertone = "Neutral"
        personal_color = "Soft Autumn"
        palette = ["#D4C5C5", "#B8B0A8", "#E8E0D8", "#C9B8A8", "#F2EDE0"]

    # 3. Kembalikan JSON ke Frontend
    return {
        "success": True,
        "undertone": undertone,
        "personalColor": personal_color,
        "paletteColors": palette,
        "pigmen": {
            "rgb": f"rgb({int(r)}, {int(g)}, {int(b)})",
            "red": round((r/(r+g+b))*100, 1),
            "green": round((g/(r+g+b))*100, 1),
            "blue": round((b/(r+g+b))*100, 1)
        }
    }