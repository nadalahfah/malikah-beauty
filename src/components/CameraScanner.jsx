import { useState, useEffect, useRef } from "react";

export default function CameraScanner({ onCaptureComplete, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [faceGuideStatus, setFaceGuideStatus] = useState("position_first");
  const [faceGuideMessage, setFaceGuideMessage] = useState("Posisikan wajah di dalam frame");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStepText, setScanStepText] = useState("");
  const [faceBrightness, setFaceBrightness] = useState(0);
  const [showScreenFlash, setShowScreenFlash] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startSmartCameraAnalysis();
        };
      }
    } catch (err) {
      alert("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
      if (onClose) onClose();
    }
  }

  function stopCamera() {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }

  function startSmartCameraAnalysis() {
    const analyzeFrame = () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 160;
        tempCanvas.height = 120;
        const ctx = tempCanvas.getContext("2d");
        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

        const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
        
        // 1. Hitung Pencahayaan Area Wajah (Tengah Frame)
        let centerLuminanceSum = 0;
        let centerSampleCount = 0;
        const startX = Math.floor(tempCanvas.width * 0.3);
        const endX = Math.floor(tempCanvas.width * 0.7);
        const startY = Math.floor(tempCanvas.height * 0.15);
        const endY = Math.floor(tempCanvas.height * 0.65);

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * tempCanvas.width + x) * 4;
            const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2];
            centerLuminanceSum += (r * 0.299 + g * 0.587 + b * 0.114);
            centerSampleCount++;
          }
        }

        const avgFaceLuminance = Math.round(centerLuminanceSum / (centerSampleCount || 1));
        setFaceBrightness(avgFaceLuminance);

        // Auto Ring-Light jika cahaya di wajah < 95
        if (avgFaceLuminance < 95) {
          setShowScreenFlash(true);
        } else {
          setShowScreenFlash(false);
        }

        // 2. Deteksi Area Wajah dengan MENGABAIKAN AREA BAWAH (Baju/Dada)
        let minY = tempCanvas.height, maxY = 0;
        const maxAllowedY = Math.floor(tempCanvas.height * 0.78); // Area di bawah Y > 78% diabaikan agar baju tidak terhitung

        for (let y = 0; y < maxAllowedY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * tempCanvas.width + x) * 4;
            const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2];

            // Cek piksel kulit
            if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        const faceHeight = maxY > minY ? maxY - minY : 0;
        const faceHeightRatio = faceHeight / tempCanvas.height;

        // 3. Evaluasi Logika Posisi Bebas Gangguan Baju
        if (avgFaceLuminance < 70) {
          setFaceGuideStatus("too_dark");
          setFaceGuideMessage("Cahaya kurang terang, berpindahlah ke tempat lebih terang");
        } else if (faceHeightRatio > 0.62) {
          setFaceGuideStatus("too_close");
          setFaceGuideMessage("Mundur sedikit dari kamera");
        } else if (faceHeightRatio < 0.25) {
          setFaceGuideStatus("too_far");
          setFaceGuideMessage("Maju sedikit mendekati kamera");
        } else {
          setFaceGuideStatus("good");
          setFaceGuideMessage("Posisi & Pencahayaan Pas! Silakan Ambil Foto");
        }
      }
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };
    analyzeFrame();
  }

  async function triggerMultiRegionScan() {
    if (faceGuideStatus !== "good") {
      alert("Posisikan wajah & pencahayaan sesuai petunjuk terlebih dahulu.");
      return;
    }

    setIsAnalyzing(true);
    const steps = [
      "Pemindaian area dahi...",
      "Pemindaian T-Zone selesai...",
      "Pemindaian bawah mata selesai...",
      "Pemindaian garis rambut selesai...",
      "Pemindaian warna kulit selesai..."
    ];

    for (let step of steps) {
      setScanStepText(step);
      await new Promise((res) => setTimeout(res, 450));
    }

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg", 0.6);
      stopCamera();
      
      onCaptureComplete({ imageData, ctx, width: canvas.width, height: canvas.height });
    }
  }

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "520px", margin: "0 auto" }}>
      
      {/* Ring-Light Overlay saat cahaya kurang */}
      {showScreenFlash && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          pointerEvents: "none",
          zIndex: 999,
          boxShadow: "inset 0 0 100px rgba(255, 255, 255, 1)"
        }} />
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      <div style={{ position: "relative", width: "100%", height: "400px", borderRadius: "16px", overflow: "hidden", backgroundColor: "#000", zIndex: 1000 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Frame Pembatas Wajah */}
        <div style={{
          position: "absolute",
          top: "10%", left: "14%", right: "14%", bottom: "12%",
          border: faceGuideStatus === "good" ? "3px dashed #4caf50" : "3px dashed #ef5350",
          borderRadius: "20px",
          boxShadow: faceGuideStatus === "good" ? "0 0 20px rgba(76, 175, 80, 0.6)" : "0 0 20px rgba(239, 83, 80, 0.6)",
          pointerEvents: "none",
          transition: "all 0.3s ease"
        }}>
          <div style={{
            width: "100%", height: "100%",
            backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }} />
        </div>

        {/* Teks Instruksi di Atas Frame */}
        <div style={{
          position: "absolute",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: faceGuideStatus === "good" ? "rgba(46, 125, 50, 0.9)" : "rgba(198, 40, 40, 0.9)",
          color: "#fff",
          padding: "8px 18px",
          borderRadius: "24px",
          fontSize: "13px",
          fontWeight: "600",
          textAlign: "center",
          maxWidth: "85%",
          backdropFilter: "blur(4px)"
        }}>
          {isAnalyzing ? scanStepText : faceGuideMessage}
        </div>

        {/* Indikator Cahaya & Ring Light Status */}
        <div style={{
          position: "absolute", bottom: "14px", left: "16px",
          backgroundColor: "rgba(0,0,0,0.65)", color: "#fff",
          padding: "4px 10px", borderRadius: "12px", fontSize: "11px"
        }}>
          Cahaya Wajah: {faceBrightness} / 255 {showScreenFlash && "💡 (Ring-Light Aktif)"}
        </div>
      </div>

      <div style={{ marginTop: "15px", display: "flex", gap: "10px", width: "100%", zIndex: 1000 }}>
        <button
          className="primary-button"
          onClick={triggerMultiRegionScan}
          disabled={isAnalyzing || faceGuideStatus !== "good"}
          style={{
            flex: 1,
            backgroundColor: faceGuideStatus === "good" ? "#e3a8a8" : "#ccc",
            cursor: faceGuideStatus === "good" ? "pointer" : "not-allowed",
            opacity: faceGuideStatus === "good" ? 1 : 0.7
          }}
        >
          {isAnalyzing ? "Memindai Area Wajah..." : "📸 Ambil Foto & Analisis"}
        </button>
        <button className="scan-start-button" onClick={() => { stopCamera(); onClose(); }} style={{ backgroundColor: "#888" }}>
          Batal
        </button>
      </div>
    </div>
  );
}