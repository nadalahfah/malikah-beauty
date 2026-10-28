import { useState, useEffect, useRef } from "react";
import "./App.css";
import logoImage from "./assets/logo.png";
import dashboardImage from "./assets/fotodashboard.png";

// Import data katalog langsung dari folder public
import katalogDataRaw from "../public/katalog_produk.json";

const navItems = [
  { id: "dashboard", icon: "⌂", label: "Dashboard" },
  { id: "scan", icon: "◎", label: "Face Scan" },
  { id: "history", icon: "▤", label: "Riwayat Analisis" },
];

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [katalogProduk, setKatalogProduk] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [scanTab, setScanTab] = useState("camera");
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);

  const [historyData, setHistoryData] = useState([]);
  const [searchHistory, setSearchHistory] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua status");
  const [selectedHistory, setSelectedHistory] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const savedData = localStorage.getItem("malikah_analysis_db");
    if (savedData) {
      try { setHistoryData(JSON.parse(savedData)); } catch (e) {}
    }
  }, []);

  // Simpan ke database local storage dengan penanganan kuota memori
  const saveToDatabase = (newRecord) => {
    try {
      const updatedHistory = [newRecord, ...historyData];
      setHistoryData(updatedHistory);
      localStorage.setItem("malikah_analysis_db", JSON.stringify(updatedHistory));
    } catch (e) {
      console.warn("localStorage penuh, menghapus riwayat lama untuk memberi ruang...");
      const trimmedHistory = [newRecord, ...historyData.slice(0, 3)];
      setHistoryData(trimmedHistory);
      try {
        localStorage.setItem("malikah_analysis_db", JSON.stringify(trimmedHistory));
      } catch (err) {
        console.error("Gagal menyimpan ke localStorage:", err);
      }
    }
  };

  const clearDatabase = () => {
    localStorage.removeItem("malikah_analysis_db");
    setHistoryData([]);
    setSelectedHistory(null);
    alert("Database riwayat berhasil dibersihkan!");
  };

  useEffect(() => {
    if (Array.isArray(katalogDataRaw) && katalogDataRaw.length > 0) {
      setKatalogProduk(katalogDataRaw);
    } else {
      fetch("/katalog_produk.json")
        .then((res) => res.json())
        .then((data) => setKatalogProduk(data))
        .catch((err) => console.error("Error load JSON:", err));
    }
  }, []);

  async function startCamera() {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 150);
    } catch (err) {
      setCameraError(err);
      setIsCameraActive(false);
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }

  // Konversi RGB ke CIELAB
  function rgbToLab(r, g, b) {
    let rN = r / 255, gN = g / 255, bN = b / 255;
    rN = rN > 0.04045 ? Math.pow((rN + 0.055) / 1.055, 2.4) : rN / 12.92;
    gN = gN > 0.04045 ? Math.pow((gN + 0.055) / 1.055, 2.4) : gN / 12.92;
    bN = bN > 0.04045 ? Math.pow((bN + 0.055) / 1.055, 2.4) : bN / 12.92;

    let x = (rN * 0.4124 + gN * 0.3576 + bN * 0.1805) * 100;
    let y = (rN * 0.2126 + gN * 0.7152 + bN * 0.0722) * 100;
    let z = (rN * 0.0193 + gN * 0.1192 + bN * 0.9505) * 100;

    x /= 95.047; y /= 100.000; z /= 108.883;
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

    return {
      L: Math.round((116 * y) - 16),
      a: Math.round(500 * (x - y)),
      b: Math.round(200 * (y - z))
    };
  }

  // Hitung Jarak Warna CIELAB Delta E (Euclidean Distance)
  function calculateDeltaE(lab1, lab2) {
    const dL = lab1.L - (lab2.lab_L || lab2.L || 0);
    const dA = lab1.a - (lab2.lab_A || lab2.a || 0);
    const dB = lab1.b - (lab2.lab_B || lab2.b || 0);
    return Math.sqrt(dL * dL + dA * dA + dB * dB);
  }

  function processColorAnalysis(imageSrc) {
    setIsAnalyzing(true);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const centerX = Math.floor(img.width / 2);
      const centerY = Math.floor(img.height / 2);
      const imgData = ctx.getImageData(centerX - 5, centerY - 5, 10, 10).data;

      let totalR = 0, totalG = 0, totalB = 0, count = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        totalR += imgData[i];
        totalG += imgData[i + 1];
        totalB += imgData[i + 2];
        count++;
      }

      const avgR = Math.round(totalR / count);
      const avgG = Math.round(totalG / count);
      const avgB = Math.round(totalB / count);

      const sumRGB = avgR + avgG + avgB || 1;
      const pctRed = ((avgR / sumRGB) * 100).toFixed(1);
      const pctGreen = ((avgG / sumRGB) * 100).toFixed(1);
      const pctBlue = ((avgB / sumRGB) * 100).toFixed(1);

      const lab = rgbToLab(avgR, avgG, avgB);
      let undertone = "Neutral";
      let personalColor = "Soft Autumn";
      let paletteColors = ["#D4C5C5", "#B8B0A8", "#E8E0D8", "#C9B8A8", "#F2EDE0"];

      if (lab.b > 14 && lab.a > 5) {
        undertone = "Warm";
        personalColor = "Warm Spring";
        paletteColors = ["#F4C2A1", "#E8A87C", "#C9A27E", "#A67C52", "#FDE3C8"];
      } else if (lab.b < 10) {
        undertone = "Cool";
        personalColor = "Cool Winter";
        paletteColors = ["#E3E8F2", "#B8C4D4", "#8B9DC3", "#5A6B7E", "#F5F7FA"];
      }

      const listData = katalogProduk.length > 0 ? katalogProduk : (Array.isArray(katalogDataRaw) ? katalogDataRaw : []);

      // 1. Hitung Delta E & urutkan dari jarak terkecil
      const productsWithDeltaE = listData.map((item) => ({
        ...item,
        deltaE: calculateDeltaE(lab, item)
      })).sort((a, b) => a.deltaE - b.deltaE);

      // 2. Variasi Merek (Grouped Sampling)
      const brandMap = new Map();
      productsWithDeltaE.forEach((p) => {
        const brandKey = p.brand || p.merek || "Lainnya";
        if (!brandMap.has(brandKey)) {
          brandMap.set(brandKey, p);
        }
      });

      let recommendedProducts = Array.from(brandMap.values()).slice(0, 5);

      if (recommendedProducts.length < 5) {
        const existingIds = new Set(recommendedProducts.map((p) => p.shade_code_name || p.product_name));
        for (const p of productsWithDeltaE) {
          if (!existingIds.has(p.shade_code_name || p.product_name)) {
            recommendedProducts.push(p);
            existingIds.add(p.shade_code_name || p.product_name);
          }
          if (recommendedProducts.length >= 5) break;
        }
      }

      const now = new Date();
      const dateFormatted = now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      const timeFormatted = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const nameToSave = customerName.trim() || "Pelanggan Anonim";

      const newRecord = {
        id: Date.now(),
        name: nameToSave,
        dateTime: `${dateFormatted} · ${timeFormatted}`,
        status: "Berhasil",
        result: `Undertone: ${undertone} — Palet: ${personalColor}`,
        undertone: undertone,
        personalColor: personalColor,
        paletteColors: paletteColors,
        pigmen: { red: pctRed, green: pctGreen, blue: pctBlue, rgb: `rgb(${avgR}, ${avgG}, ${avgB})` },
        cielab: lab,
        recommendedProducts: recommendedProducts,
        capturedImage: imageSrc
      };

      saveToDatabase(newRecord);
      setIsAnalyzing(false);
      setSelectedHistory(newRecord);
      setActivePage("reports");
    };
  }

  function capturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // Kompresi resolusi agar tidak boros memori
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Simpan sebagai JPEG ringan (kualitas 0.5)
      const imageData = canvas.toDataURL("image/jpeg", 0.5);
      stopCamera();
      processColorAnalysis(imageData);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadPreview(URL.createObjectURL(file));
  }

  function analyzeUploadedFile() {
    if (uploadPreview) processColorAnalysis(uploadPreview);
  }

  const todayLocale = new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const filteredHistory = historyData.filter((item) => {
    return (searchHistory === "" || item.name.toLowerCase().includes(searchHistory.toLowerCase())) &&
      (filterDate === "" || item.dateTime.includes(filterDate)) &&
      (filterStatus === "Semua status" || item.status === filterStatus);
  });

  return (
    <div className="app-layout">
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <aside className="sidebar">
        <div className="brand"><img src={logoImage} alt="Logo" className="brand-logo" /></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${activePage === item.id ? "active" : ""}`} onClick={() => setActivePage(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left"><h1>Selamat datang, <em>Malika!</em></h1></div>
          <div className="topbar-right"><div className="today-label">{todayLocale}</div></div>
        </header>

        <div className="page-content">
          {activePage === "dashboard" && (
            <section className="hero-card">
              <div className="hero-copy">
                <h2>Temukan warna terbaik untuk setiap <em>versi dirimu.</em></h2>
                <button className="primary-button" onClick={() => setActivePage("scan")}>Mulai Face Scan →</button>
              </div>
              <div className="hero-image"><img src={dashboardImage} alt="Dashboard" className="hero-img" /></div>
            </section>
          )}

          {activePage === "scan" && (
            <section className="scan-page">
              <div className="scan-header">
                <h1>Mulai Analisis Personal Color</h1>
                <p>Analisis komposisi pigmen warna kulit & pencocokan katalog produk.</p>
              </div>

              <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
                <label style={{ fontWeight: "600", fontSize: "14px", display: "block", marginBottom: "6px" }}>Nama Pelanggan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Nadia Aulia"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                />
              </div>

              <div className="scan-tabs">
                <button className={`scan-tab ${scanTab === "camera" ? "active" : ""}`} onClick={() => setScanTab("camera")}>Ambil Foto</button>
                <button className={`scan-tab ${scanTab === "upload" ? "active" : ""}`} onClick={() => setScanTab("upload")}>Unggah Foto</button>
              </div>

              {scanTab === "camera" ? (
                isCameraActive ? (
                  <div>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxWidth: "480px", height: "320px", borderRadius: "12px", objectFit: "cover", filter: `brightness(${brightness}%) contrast(${contrast}%)` }} />
                    <div style={{ marginTop: "10px", maxWidth: "480px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold" }}>Kecerahan: {brightness}%</label>
                      <input type="range" min="70" max="150" value={brightness} onChange={(e) => setBrightness(e.target.value)} style={{ width: "100%" }} />
                    </div>
                    <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                      <button className="primary-button" onClick={capturePhoto} disabled={isAnalyzing}>{isAnalyzing ? "Menganalisis..." : "📸 Ambil Foto & Analisis"}</button>
                      <button className="scan-start-button" onClick={stopCamera} style={{ backgroundColor: "#888" }}>Hentikan Kamera</button>
                    </div>
                  </div>
                ) : (
                  <button className="scan-start-button" onClick={startCamera}>Mulai Kamera</button>
                )
              ) : (
                <div style={{ padding: "20px", border: "2px dashed #ccc", borderRadius: "12px", textAlign: "center" }}>
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  {uploadPreview && (
                    <div style={{ marginTop: "15px" }}>
                      <img src={uploadPreview} alt="Preview" style={{ maxWidth: "250px", borderRadius: "8px" }} /><br />
                      <button className="primary-button" onClick={analyzeUploadedFile} style={{ marginTop: "10px" }} disabled={isAnalyzing}>{isAnalyzing ? "Menganalisis..." : "🔍 Analisis Foto Unggahan"}</button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {activePage === "history" && (
            <section className="history-page">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Daftar Riwayat Analisis</h1>
                <button onClick={clearDatabase} style={{ backgroundColor: "#ff4d4d", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer" }}>
                  🗑️ Bersihkan Riwayat Lama
                </button>
              </div>

              <div className="history-table-card" style={{ marginTop: "15px" }}>
                <table className="history-table" style={{ width: "100%" }}>
                  <thead>
                    <tr><th>Nama Pelanggan</th><th>Tanggal</th><th>Status</th><th>Hasil Undertone</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.dateTime}</td>
                        <td><span className="status-badge success">{item.status}</span></td>
                        <td>{item.result}</td>
                        <td><button className="detail-button" onClick={() => { setSelectedHistory(item); setActivePage("reports"); }}>Lihat Detail →</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activePage === "reports" && selectedHistory && (
            <section className="report-detail-page">
              <button className="report-back-btn" onClick={() => setActivePage("history")}>← Kembali ke Riwayat Analisis</button>
              <div className="report-detail-header" style={{ marginTop: "15px" }}>
                <h1>Hasil Analisis Personal Color & Ekstraksi Kulit</h1>
                <p>Pelanggan: <strong>{selectedHistory.name}</strong> • {selectedHistory.dateTime}</p>
              </div>

              <div style={{ display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
                <div>
                  <h3>Foto Sampel:</h3>
                  <img src={selectedHistory.capturedImage} alt="Foto" style={{ width: "220px", borderRadius: "12px", border: "2px solid #e3a8a8" }} />
                  
                  {selectedHistory.pigmen && (
                    <div style={{ marginTop: "15px", backgroundColor: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #eee", width: "220px" }}>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Komposisi Pigmen Kulit:</h4>
                      <p style={{ margin: "4px 0", fontSize: "12px" }}>🔴 Pigmen Merah (R): <strong>{selectedHistory.pigmen.red}%</strong></p>
                      <p style={{ margin: "4px 0", fontSize: "12px" }}>🟢 Pigmen Hijau (G): <strong>{selectedHistory.pigmen.green}%</strong></p>
                      <p style={{ margin: "4px 0", fontSize: "12px" }}>🔵 Pigmen Biru (B): <strong>{selectedHistory.pigmen.blue}%</strong></p>
                      <hr style={{ border: "none", borderTop: "1px dashed #ccc", margin: "8px 0" }} />
                      <p style={{ margin: "4px 0", fontSize: "12px" }}><strong>CIELAB:</strong> L*={selectedHistory.cielab?.L}, a*={selectedHistory.cielab?.a}, b*={selectedHistory.cielab?.b}</p>
                    </div>
                  )}
                </div>

                <div className="report-card" style={{ flex: 1, minWidth: "300px" }}>
                  <div className="personal-color-name" style={{ fontSize: "22px", fontWeight: "bold" }}>{selectedHistory.personalColor}</div>
                  <div className="undertone-chip" style={{ marginTop: "5px" }}>Undertone: {selectedHistory.undertone}</div>

                  <h4 style={{ marginTop: "15px" }}>Rekomendasi Palet Warna Pakaian/Makeup:</h4>
                  <div className="palette-row" style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    {selectedHistory.paletteColors.map((c, i) => (
                      <div key={i} style={{ backgroundColor: c, width: "35px", height: "35px", borderRadius: "50%", border: "1px solid #ccc" }} />
                    ))}
                  </div>

                  <h4 style={{ marginTop: "20px" }}>Rekomendasi Produk Katalog Lengkap (Sesuai $\Delta E$ CIELAB):</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                    {selectedHistory.recommendedProducts.map((p, idx) => {
                      const brand = p.brand || p.merek || "-";
                      const product = p.product_name || p.nama_produk || "-";
                      const shadeName = p.shade_code_name || p.nama_shade || p.kode_shade || "-";
                      const skintone = p.skintone_category || p.kategori_skintone || "-";
                      const skintype = p.skin_type_recommendation || p.rekomendasi_jenis_kulit || "-";
                      const undertone = p.undertone_category || p.kategori_undertone || "-";
                      const deltaEValue = p.deltaE ? p.deltaE.toFixed(2) : null;

                      return (
                        <div key={idx} style={{ padding: "12px", backgroundColor: "#fafafa", borderRadius: "8px", borderLeft: "4px solid #e3a8a8" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: "bold", fontSize: "15px", color: "#333" }}>
                              {brand} - {product}
                            </div>
                            {deltaEValue && (
                              <span style={{ fontSize: "11px", backgroundColor: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                                Match Score ($\Delta E$): {deltaEValue}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "12px", color: "#555", marginTop: "6px" }}>
                            <span>💄 <strong>Shade:</strong> {shadeName}</span> • 
                            <span> 🎨 <strong>Skintone:</strong> {skintone}</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                            <span>✨ <strong>Skin Type:</strong> {skintype}</span> • 
                            <span> ☀️ <strong>Undertone Category:</strong> {undertone}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;