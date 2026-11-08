import { useState, useEffect } from "react";
import "./App.css";
import logoImage from "./assets/logo.png";
import dashboardImage from "./assets/fotodashboard.png";
import katalogDataRaw from "../public/katalog_produk.json";

// Import modul terpisah
import CameraScanner from "./components/CameraScanner";
import { supabase } from "./utils/supabaseClient";
import { rgbToLab, calculateDeltaE } from "./utils/colorAnalysis";

const navItems = [
  { id: "dashboard", icon: "⌂", label: "Dashboard" },
  { id: "scan", icon: "◎", label: "Face Scan" },
  { id: "history", icon: "▤", label: "Riwayat Analisis" },
];

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [katalogProduk, setKatalogProduk] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  // Ambil Riwayat dari Supabase saat pertama kali dimuat
  useEffect(() => {
    fetchHistoryFromSupabase();
  }, []);

  const fetchHistoryFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted = data.map((item) => ({
          id: item.id,
          name: item.customer_name || "Pelanggan Anonim",
          dateTime: new Date(item.created_at).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "Berhasil",
          result: `Undertone: ${item.undertone} — Palet: ${item.personal_color}`,
          undertone: item.undertone,
          personalColor: item.personal_color,
          skintone: item.skintone,
          recommendedProducts: item.recommended_products || [],
        }));
        setHistoryData(formatted);
      }
    } catch (err) {
      console.warn("Gagal memuat riwayat Supabase, memuat dari LocalStorage:", err);
      const savedData = localStorage.getItem("malikah_analysis_db");
      if (savedData) {
        try { setHistoryData(JSON.parse(savedData)); } catch (e) {}
      }
    }
  };

  useEffect(() => {
    if (Array.isArray(katalogDataRaw) && katalogDataRaw.length > 0) {
      setKatalogProduk(katalogDataRaw);
    }
  }, []);

  // Handler Utama Pengolahan Foto via API Hugging Face & Supabase
  const handleCaptureComplete = async (imageBase64) => {
    setIsCameraActive(false);
    setIsAnalyzing(true);
    setLoadingStatusText("Membangunkan AI Server (Hugging Face)... Mohon tunggu sebentar.");

    // Rotasi Teks UX selama Cold Start
    const statusInterval = setInterval(() => {
      setLoadingStatusText((prev) => {
        if (prev.includes("Membangunkan")) return "Memuat model Machine Learning warna kulit...";
        if (prev.includes("Memuat")) return "Menganalisis pigmen & undertone wajah...";
        return "Mengekstrak rekomendasi katalog produk...";
      });
    }, 12000);

    // Timeout Controller 90 Detik untuk menangani Cold Start
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch("https://Kepik-09-malikah-beauty-ml.hf.space/analyze-skintone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(statusInterval);

      const data = await response.json();

      if (data.status === "success" || data.undertone) {
        const rgb = data.rgb || [180, 140, 120];
        const lab = rgbToLab(rgb[0], rgb[1], rgb[2]);

        // Hitung Pencocokan Produk Katalog berbasis ΔE CIELAB
        const listData = katalogProduk.length > 0 ? katalogProduk : (Array.isArray(katalogDataRaw) ? katalogDataRaw : []);
        const productsWithDeltaE = listData.map((item) => ({
          ...item,
          deltaE: calculateDeltaE(lab, item)
        })).sort((a, b) => a.deltaE - b.deltaE);

        const brandMap = new Map();
        productsWithDeltaE.forEach((p) => {
          const brandKey = p.brand || p.merek || "Lainnya";
          if (!brandMap.has(brandKey)) brandMap.set(brandKey, p);
        });

        let recommendedProducts = Array.from(brandMap.values()).slice(0, 5);

        const nameToSave = customerName.trim() || "Pelanggan Anonim";
        const nowFormatted = new Date().toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const newRecord = {
          id: Date.now(),
          name: nameToSave,
          dateTime: nowFormatted,
          status: "Berhasil",
          result: `Undertone: ${data.undertone} — Palet: ${data.personal_color}`,
          undertone: data.undertone,
          personalColor: data.personal_color,
          skintone: data.skintone,
          paletteColors: data.undertone === "Warm" 
            ? ["#F4C2A1", "#E8A87C", "#C9A27E", "#A67C52", "#FDE3C8"]
            : ["#E3E8F2", "#B8C4D4", "#8B9DC3", "#5A6B7E", "#F5F7FA"],
          pigmen: {
            red: ((rgb[0] / (rgb[0] + rgb[1] + rgb[2])) * 100).toFixed(1),
            green: ((rgb[1] / (rgb[0] + rgb[1] + rgb[2])) * 100).toFixed(1),
            blue: ((rgb[2] / (rgb[0] + rgb[1] + rgb[2])) * 100).toFixed(1),
          },
          cielab: lab,
          recommendedProducts: recommendedProducts,
          capturedImage: imageBase64
        };

        // Simpan Data Teks ke Supabase
        try {
          await supabase.from("analysis_history").insert([
            {
              customer_name: nameToSave,
              undertone: data.undertone,
              skintone: data.skintone,
              personal_color: data.personal_color,
              recommended_products: recommendedProducts
            }
          ]);
          fetchHistoryFromSupabase();
        } catch (dbErr) {
          console.warn("Gagal simpan ke Supabase, simpan ke LocalStorage:", dbErr);
          const updated = [newRecord, ...historyData];
          setHistoryData(updated);
          localStorage.setItem("malikah_analysis_db", JSON.stringify(updated.slice(0, 5)));
        }

        setSelectedHistory(newRecord);
        setActivePage("reports");
      } else {
        alert("Gagal mendapatkan respon valid dari server Machine Learning.");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      clearInterval(statusInterval);
      if (err.name === 'AbortError') {
        alert("Waktu koneksi AI habis (Timeout 90s). Silakan coba klik analisis sekali lagi.");
      } else {
        alert("Gagal terhubung ke server Hugging Face ML. Pastikan Space dalam status Running.");
      }
    } finally {
      setIsAnalyzing(false);
      setLoadingStatusText("");
    }
  };

  return (
    <div className="app-layout">
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
              <h1>Mulai Analisis Personal Color</h1>
              <p style={{ color: "#666", marginBottom: "15px" }}>Analisis AI ML (KMeans & CNN) terintegrasi Hugging Face Spaces.</p>

              <div style={{ marginBottom: "15px", maxWidth: "400px" }}>
                <label style={{ fontWeight: "600", fontSize: "14px", display: "block", marginBottom: "6px" }}>Nama Pelanggan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Nadia Aulia"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                />
              </div>

              {isAnalyzing ? (
                <div style={{ textAlign: "center", padding: "40px 20px", backgroundColor: "#fff", borderRadius: "16px", maxWidth: "500px", margin: "0 auto", border: "1px solid #eee" }}>
                  <div className="spinner" style={{ fontSize: "32px", marginBottom: "15px" }}>⏳</div>
                  <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>Proses Analisis Machine Learning</h3>
                  <p style={{ fontSize: "13px", color: "#666", lineHeight: "1.5" }}>{loadingStatusText}</p>
                </div>
              ) : isCameraActive ? (
                <CameraScanner
                  onCaptureComplete={handleCaptureComplete}
                  onClose={() => setIsCameraActive(false)}
                />
              ) : (
                <button className="scan-start-button" onClick={() => setIsCameraActive(true)}>Mulai Kamera Cerdas (AI)</button>
              )}
            </section>
          )}

          {activePage === "history" && (
            <section className="history-page">
              <h1>Daftar Riwayat Analisis</h1>
              <table className="history-table" style={{ width: "100%", marginTop: "15px" }}>
                <thead>
                  <tr><th>Nama Pelanggan</th><th>Tanggal</th><th>Status</th><th>Hasil</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {historyData.length > 0 ? (
                    historyData.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.dateTime}</td>
                        <td><span className="status-badge success">{item.status}</span></td>
                        <td>{item.result}</td>
                        <td><button className="detail-button" onClick={() => { setSelectedHistory(item); setActivePage("reports"); }}>Lihat Detail →</button></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#888" }}>Belum ada riwayat analisis.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {activePage === "reports" && selectedHistory && (
            <section className="report-detail-page">
              <button className="report-back-btn" onClick={() => setActivePage("history")}>← Kembali ke Riwayat</button>
              <h2>Hasil Analisis Personal Color (Machine Learning)</h2>
              <p>Pelanggan: <strong>{selectedHistory.name}</strong> • {selectedHistory.dateTime}</p>

              <div style={{ display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
                <div>
                  {selectedHistory.capturedImage ? (
                    <img src={selectedHistory.capturedImage} alt="Foto" style={{ width: "220px", borderRadius: "12px", border: "2px solid #e3a8a8" }} />
                  ) : (
                    <div style={{ width: "220px", height: "180px", borderRadius: "12px", backgroundColor: "#eee", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>Foto disimpan aman di Client</div>
                  )}

                  {selectedHistory.pigmen && (
                    <div style={{ marginTop: "15px", backgroundColor: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #eee", width: "220px" }}>
                      <p style={{ margin: "4px 0", fontSize: "12px" }}>🔴 Merah (R): <strong>{selectedHistory.pigmen.red}%</strong></p>
                      <p style={{ margin: "4px 0", fontSize: "12px" }}>🟢 Hijau (G): <strong>{selectedHistory.pigmen.green}%</strong></p>
                      <p style={{ margin: "4px 0", fontSize: "12px" }}>🔵 Biru (B): <strong>{selectedHistory.pigmen.blue}%</strong></p>
                      {selectedHistory.cielab && (
                        <>
                          <hr style={{ border: "none", borderTop: "1px dashed #ccc", margin: "8px 0" }} />
                          <p style={{ margin: "4px 0", fontSize: "12px" }}><strong>CIELAB:</strong> L*={selectedHistory.cielab.L}, a*={selectedHistory.cielab.a}, b*={selectedHistory.cielab.b}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="report-card" style={{ flex: 1, minWidth: "300px" }}>
                  <div style={{ fontSize: "22px", fontWeight: "bold" }}>{selectedHistory.personalColor}</div>
                  <div className="undertone-chip" style={{ marginTop: "5px" }}>Undertone: {selectedHistory.undertone} ({selectedHistory.skintone || "Medium"})</div>

                  <h4 style={{ marginTop: "20px" }}>Rekomendasi Produk Katalog Lengkap (Sesuai ΔE CIELAB):</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                    {selectedHistory.recommendedProducts && selectedHistory.recommendedProducts.length > 0 ? (
                      selectedHistory.recommendedProducts.map((p, idx) => (
                        <div key={idx} style={{ padding: "12px", backgroundColor: "#fafafa", borderRadius: "8px", borderLeft: "4px solid #e3a8a8" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: "bold", fontSize: "15px" }}>{p.brand || p.merek} - {p.product_name || p.nama_produk}</div>
                            {p.deltaE && <span style={{ fontSize: "11px", backgroundColor: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: "4px" }}>Match Score (ΔE): {p.deltaE.toFixed(2)}</span>}
                          </div>
                          <div style={{ fontSize: "12px", color: "#555", marginTop: "6px" }}>
                            <span>💄 <strong>Shade:</strong> {p.shade_code_name || p.kode_shade}</span> • <span> 🎨 <strong>Skintone:</strong> {p.skintone_category || p.kategori_skintone}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "13px", color: "#888" }}>Rekomendasi produk belum tersedia untuk analisis ini.</p>
                    )}
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