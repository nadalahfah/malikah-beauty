import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import Human from "@vladmandic/human";

const humanConfig = {
  backend: "webgl",
  modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models",
  face: { enabled: true, detector: { rotation: true }, mesh: { enabled: true } },
  body: { enabled: false },
  hand: { enabled: false }
};

export default function CameraScanner({ onCaptureComplete, onClose }) {
  const webcamRef = useRef(null);
  const [human, setHuman] = useState(null);
  const [guideMessage, setGuideMessage] = useState("Memuat AI Pendeteksi Wajah...");
  const [isFaceValid, setIsFaceValid] = useState(false);

  useEffect(() => {
    const initHuman = async () => {
      try {
        const instance = new Human(humanConfig);
        await instance.load();
        await instance.warmup();
        setHuman(instance);
        setGuideMessage("Posisikan wajah di dalam frame");
      } catch (e) {
        setGuideMessage("Gagal memuat model AI wajah");
      }
    };
    initHuman();
  }, []);

  useEffect(() => {
    let interval;
    if (human && webcamRef.current) {
      interval = setInterval(async () => {
        if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
          const video = webcamRef.current.video;
          const result = await human.detect(video);
          
          if (result.face && result.face.length > 0) {
            const face = result.face[0];
            const boxWidth = face.box[2];

            if (boxWidth < 140) {
              setGuideMessage("Maju sedikit ke kamera");
              setIsFaceValid(false);
            } else if (boxWidth > 300) {
              setGuideMessage("Mundur sedikit dari kamera");
              setIsFaceValid(false);
            } else {
              setGuideMessage("Posisi Wajah Sempurna! Silakan Ambil Foto");
              setIsFaceValid(true);
            }
          } else {
            setGuideMessage("Posisikan wajah tepat di tengah frame");
            setIsFaceValid(false);
          }
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [human]);

  const capturePhoto = () => {
    if (webcamRef.current && isFaceValid) {
      const imageSrc = webcamRef.current.getScreenshot();
      onCaptureComplete(imageSrc);
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

        <div style={{
          position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: isFaceValid ? "rgba(46, 125, 50, 0.9)" : "rgba(198, 40, 40, 0.9)",
          color: "#fff", padding: "8px 18px", borderRadius: "24px", fontSize: "13px", fontWeight: "bold",
          textAlign: "center", maxWidth: "85%"
        }}>
          {guideMessage}
        </div>
      </div>

      <div style={{ marginTop: "15px", display: "flex", gap: "10px", width: "100%" }}>
        <button
          className="primary-button"
          onClick={capturePhoto}
          disabled={!isFaceValid}
          style={{ flex: 1, backgroundColor: isFaceValid ? "#e3a8a8" : "#ccc", cursor: isFaceValid ? "pointer" : "not-allowed" }}
        >
          📸 Ambil Foto & Analisis (AI)
        </button>
        <button className="scan-start-button" onClick={onClose} style={{ backgroundColor: "#888" }}>
          Batal
        </button>
      </div>
    </div>
  );
}