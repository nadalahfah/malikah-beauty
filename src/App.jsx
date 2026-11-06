import { useState, useEffect } from "react";
import "./App.css";
import logoImage from "./assets/logo.png";
import dashboardImage from "./assets/fotodashboard.png";
import katalogDataRaw from "../public/katalog_produk.json";

// Import modul terpisah
import CameraScanner from "./components/CameraScanner";
import { analyzeSkinColor } from "./utils/colorAnalysis";

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
  const [historyData, setHistoryData] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  useEffect(() => {
    const savedData = localStorage.getItem("malikah_analysis_db");
    if (savedData) {
      try { setHistoryData(JSON.parse(savedData)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(katalogDataRaw) && katalogDataRaw.length > 0) {
      setKatalogProduk(katalogDataRaw);
    }
  }, []);

  const saveToDatabase = (newRecord) => {
    try {
      const updatedHistory = [newRecord, ...historyData];
      setHistoryData(updatedHistory);
      localStorage.setItem("malikah_analysis_db", JSON.stringify(updatedHistory));
    } catch (e) {
      const trimmedHistory = [newRecord, ...historyData.slice(0, 3)];
      setHistoryData(trimmedHistory);
      try {
        localStorage.setItem("malikah_analysis_db", JSON.stringify(trimmedHistory));
      } catch (err) {}
    }
  };

  const handleCaptureComplete = ({ imageData, ctx, width, height }) => {
    // Jalankan analisis ML dari file terpisah
    const analysisResult = analyzeSkinColor(imageData, ctx, width, height, katalogProduk, customerName);
    saveToDatabase(analysisResult);
    setIsCameraActive(false);
    setSelectedHistory(analysisResult);
    setActivePage("reports");
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

              {isCameraActive ? (
                <CameraScanner
                  onCaptureComplete={handleCaptureComplete}
                  onClose={() => setIsCameraActive(false)}
                />
              ) : (
                <button className="scan-start-button" onClick={() => setIsCameraActive(true)}>Mulai Kamera Cerdas</button>
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
                  {historyData.map((item) => (
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
            </section>
          )}

          {activePage === "reports" && selectedHistory && (
            <section className="report-detail-page">
              <button className="report-back-btn" onClick={() => setActivePage("history")}>← Kembali ke Riwayat</button>
              <h2>Hasil Analisis Personal Color</h2>
              <p>Pelanggan: <strong>{selectedHistory.name}</strong> • {selectedHistory.dateTime}</p>

              <div style={{ display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
                <div>
                  <img src={selectedHistory.capturedImage} alt="Foto" style={{ width: "220px", borderRadius: "12px", border: "2px solid #e3a8a8" }} />
                  <div style={{ marginTop: "15px", backgroundColor: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #eee", width: "220px" }}>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>🔴 Merah (R): <strong>{selectedHistory.pigmen.red}%</strong></p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>🟢 Hijau (G): <strong>{selectedHistory.pigmen.green}%</strong></p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>🔵 Biru (B): <strong>{selectedHistory.pigmen.blue}%</strong></p>
                    <hr style={{ border: "none", borderTop: "1px dashed #ccc", margin: "8px 0" }} />
                    <p style={{ margin: "4px 0", fontSize: "12px" }}><strong>CIELAB:</strong> L*={selectedHistory.cielab?.L}, a*={selectedHistory.cielab?.a}, b*={selectedHistory.cielab?.b}</p>
                  </div>
                </div>

                <div className="report-card" style={{ flex: 1, minWidth: "300px" }}>
                  <div style={{ fontSize: "22px", fontWeight: "bold" }}>{selectedHistory.personalColor}</div>
                  <div className="undertone-chip" style={{ marginTop: "5px" }}>Undertone: {selectedHistory.undertone}</div>

                  <h4 style={{ marginTop: "20px" }}>Rekomendasi Produk Katalog Lengkap (Sesuai ΔE CIELAB):</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                    {selectedHistory.recommendedProducts.map((p, idx) => (
                      <div key={idx} style={{ padding: "12px", backgroundColor: "#fafafa", borderRadius: "8px", borderLeft: "4px solid #e3a8a8" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: "bold", fontSize: "15px" }}>{p.brand} - {p.product_name}</div>
                          {p.deltaE && <span style={{ fontSize: "11px", backgroundColor: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: "4px" }}>Match Score (ΔE): {p.deltaE.toFixed(2)}</span>}
                        </div>
                        <div style={{ fontSize: "12px", color: "#555", marginTop: "6px" }}>
                          <span>💄 <strong>Shade:</strong> {p.shade_code_name}</span> • <span> 🎨 <strong>Skintone:</strong> {p.skintone_category}</span>
                        </div>
                      </div>
                    ))}
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