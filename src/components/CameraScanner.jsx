import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import Human from "@vladmandic/human";

const humanConfig = {
  backend: "webgl",
  modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models",
  face: { 
    enabled: true, 
    detector: { rotation: true }, 
    mesh: { enabled: true },
    iris: { enabled: false }
  },
  body: { enabled: false },
  hand: { enabled: false }
};

export default function CameraScanner({ onCaptureComplete, onClose }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [human, setHuman] = useState(null);
  const [guideMessage, setGuideMessage] = useState("Memuat AI Biometrik...");
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const initHuman = async () => {
      try {
        const instance = new Human(humanConfig);
        await instance.load();
        await instance.warmup();
        setHuman(instance);
        setGuideMessage("Posisikan wajah tepat di dalam oval");
      } catch (e) {
        setGuideMessage("Gagal memuat modul AI Biometrik");
      }
    };
    initHuman();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const detectFrame = async () => {
      if (human && webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const result = await human.detect(video);
        const canvas = canvasRef.current;

        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (result.face && result.face.length > 0) {
            const face = result.face[0];
            const box = face.box; // [x, y, width, height]
            const boxWidth = box[2];

            // Hitung Titik Tengah Wajah Pengguna
            const faceCenterX = box[0] + box[2] / 2;
            const faceCenterY = box[1] + box[3] / 2;

            // Hitung Titik Tengah Canvas Kamera
            const canvasCenterX = canvas.width / 2;
            const canvasCenterY = canvas.height / 2;

            // Toleransi Geser Off-Center
            const offsetX = Math.abs(faceCenterX - canvasCenterX);
            const offsetY = Math.abs(faceCenterY - canvasCenterY);

            // 1. Gambar Jaring 3D Mesh Halus (Soft & Transparan, Tanpa Bintik & Tanpa Garis Bibir Tebal)
            if (face.mesh && face.mesh.length > 0 && face.triangulation) {
              const mesh = face.mesh;
              ctx.strokeStyle = "rgba(0, 255, 204, 0.12)"; // Sangat transparan & halus
              ctx.lineWidth = 0.6;

              const triangles = face.triangulation;
              for (let i = 0; i < triangles.length; i += 3) {
                const p1 = mesh[triangles[i]];
                const p2 = mesh[triangles[i + 1]];
                const p3 = mesh[triangles[i + 2]];

                if (p1 && p2 && p3) {
                  ctx.beginPath();
                  ctx.moveTo(p1[0], p1[1]);
                  ctx.lineTo(p2[0], p2[1]);
                  ctx.lineTo(p3[0], p3[1]);
                  ctx.closePath();
                  ctx.stroke();
                }
              }
            }

            // 2. VALIDASI REAL-TIME PRESI (X, Y & Jarak)
            const MAX_ALLOWED_OFFSET_X = 65;
            const MAX_ALLOWED_OFFSET_Y = 65;

            if (offsetX > MAX_ALLOWED_OFFSET_X || offsetY > MAX_ALLOWED_OFFSET_Y) {
              setGuideMessage("⚠️ Geser wajah ke TENGAH target oval");
              setIsFaceValid(false);
            } else if (boxWidth < 230) {
              setGuideMessage("⚠️ Maju sedikit lebih dekat");
              setIsFaceValid(false);
            } else if (boxWidth > 380) {
              setGuideMessage("⚠️ Mundur sedikit dari kamera");
              setIsFaceValid(false);
            } else {
              setGuideMessage("🟢 Posisi Sempurna & AI Siap Analisis");
              setIsFaceValid(true);
            }
          } else {
            setGuideMessage("Posisikan wajah tepat di dalam frame");
            setIsFaceValid(false);
          }
        }
      }

      if (active) {
        animFrameRef.current = requestAnimationFrame(detectFrame);
      }
    };

    if (human) {
      detectFrame();
    }

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [human]);

  const capturePhoto = () => {
    if (webcamRef.current && isFaceValid) {
      setIsScanning(true);
      setGuideMessage("⚡ AI Memindai Skintone & Tone Bibir...");

      setTimeout(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setIsScanning(false);
        onCaptureComplete(imageSrc);
      }, 1200);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "500px", margin: "0 auto" }}>
      <div style={{ position: "relative", width: "100%", height: "380px", borderRadius: "16px", overflow: "hidden", backgroundColor: "#000" }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Canvas Dynamic Jaring AI (Soft) */}
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
        />

        {/* Target Oval Frame Guide (Dinamis: Hijau = Pas, Merah = Geser/Miring) */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: "220px", height: "290px", 
          border: `3px dashed ${isFaceValid ? "#4caf50" : "#f44336"}`,
          borderRadius: "50%", pointerEvents: "none", zIndex: 5,
          transition: "border-color 0.2s ease-in-out"
        }} />

        {/* Laser Scanner Effect saat tombol ditekan */}
        {isScanning && (
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "4px",
            backgroundColor: "#00ffcc", boxShadow: "0 0 15px #00ffcc",
            animation: "scanAnim 1.2s infinite ease-in-out", zIndex: 6
          }} />
        )}

        {/* Status Guide Badge */}
        <div style={{
          position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: isFaceValid ? "rgba(46, 125, 50, 0.95)" : "rgba(198, 40, 40, 0.95)",
          color: "#fff", padding: "8px 18px", borderRadius: "24px", fontSize: "13px", fontWeight: "bold",
          textAlign: "center", maxWidth: "85%", zIndex: 10, transition: "background-color 0.2s"
        }}>
          {guideMessage}
        </div>
      </div>

      <p style={{ fontSize: "12px", color: "#666", marginTop: "8px", textAlign: "center" }}>
        💡 <i>Pastikan bibir & wajah berada di ruang terang tanpa bayangan.</i>
      </p>

      <div style={{ marginTop: "10px", display: "flex", gap: "10px", width: "100%" }}>
        <button
          className="primary-button"
          onClick={capturePhoto}
          disabled={!isFaceValid || isScanning}
          style={{ 
            flex: 1, 
            backgroundColor: isFaceValid ? "#e3a8a8" : "#ccc", 
            cursor: isFaceValid ? "pointer" : "not-allowed",
            transition: "background-color 0.2s" 
          }}
        >
          {isScanning ? "⏳ Memproses ML..." : "📸 Ambil Foto & Analisis (AI)"}
        </button>
        <button className="scan-start-button" onClick={onClose} style={{ backgroundColor: "#888" }}>
          Batal
        </button>
      </div>

      <style>{`
        @keyframes scanAnim {
          0% { top: 0%; }
          50% { top: 95%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}