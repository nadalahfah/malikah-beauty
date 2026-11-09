import { useState, useEffect } from "react";
import "./App.css";
import logoImage from "./assets/logo.png";
import dashboardImage from "./assets/fotodashboard.png";
import katalogProduk from "./katalog_produk.json";
import CameraScanner from "./components/CameraScanner";
import HistoryList from "./components/HistoryList";
import { supabase } from "./utils/supabaseClient";
import { createSkinTonePredictor } from '@avatune/skin-tone-predictor';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

const navItems = [
  { id: "dashboard", icon: "⌂", label: "Dashboard" },
  { id: "scan", icon: "◎", label: "Face Scan" },
  { id: "history", icon: "▤", label: "Riwayat Analisis" },
];

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictor, setPredictor] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelLoadAttempt, setModelLoadAttempt] = useState(0);
  const [modelError, setModelError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  const recommendedProducts = analysisResult
    ? katalogProduk.filter((product) => {
        const category = product.skintone_category?.toLowerCase() || "";
        const predictedTone = analysisResult.tone.toLowerCase();
        return new RegExp(`\\b${predictedTone}\\b`).test(category);
      })
    : [];

  useEffect(() => {
    let isCurrent = true;

    const loadPredictor = async () => {
      setIsModelLoading(true);
      setModelError("");
      setPredictor(null);

      try {
        const backendReady = await tf.setBackend("webgl");
        if (!backendReady) {
          throw new Error("Backend TensorFlow.js WebGL tidak tersedia di perangkat ini.");
        }
        await tf.ready();
        const model = createSkinTonePredictor('/models');
        await model.loadModel();
        if (isCurrent) setPredictor(model);
      } catch (error) {
        console.error("Gagal memuat model skin tone:", error);
        if (isCurrent) {
          setModelError("Model AI gagal dimuat. Pastikan model tersedia di folder public/models lalu coba lagi.");
        }
      } finally {
        if (isCurrent) setIsModelLoading(false);
      }
    };

    loadPredictor();
    return () => {
      isCurrent = false;
    };
  }, [modelLoadAttempt]);

  const handleCaptureComplete = async (imageSrc) => {
    setIsCameraActive(false);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError("");
    let tensor;
    let predictionSucceeded = false;

    try {
      if (!predictor) throw new Error("Model AI belum siap.");

      const imgElement = new Image();
      await new Promise((resolve, reject) => {
        imgElement.onload = resolve;
        imgElement.onerror = () => reject(new Error("Foto gagal dimuat untuk dianalisis."));
        imgElement.src = imageSrc;
      });

      tensor = tf.browser.fromPixels(imgElement).div(255);
      const result = await predictor.predict(tensor);
      predictionSucceeded = true;
      setAnalysisResult({
        tone: result.tone,
        confidence: result.confidence,
      });

      try {
        const { error } = await supabase.from("skin_tone_logs").insert({
          predicted_tone: result.tone,
          confidence_score: result.confidence,
        });
        if (error) throw error;
      } catch (error) {
        console.error("Gagal menyimpan hasil ke tabel skin_tone_logs:", error);
        throw error;
      }
    } catch (error) {
      console.error("Gagal memproses analisis skin tone:", error);
      setAnalysisError(
        predictionSucceeded
          ? "Hasil analisis tersedia, tetapi gagal disimpan ke Riwayat Analisis."
          : "Analisis skin tone gagal. Silakan coba kembali."
      );
    } finally {
      tensor?.dispose();
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand"><img src={logoImage} alt="Logo" className="brand-logo" /></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
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
          {activeTab === "dashboard" && (
            <section className="hero-card">
              <div className="hero-copy">
                <h2>Temukan warna terbaik untuk setiap <em>versi dirimu.</em></h2>
                <button className="primary-button" onClick={() => setActiveTab("scan")}>Mulai Face Scan →</button>
              </div>
              <div className="hero-image"><img src={dashboardImage} alt="Dashboard" className="hero-img" /></div>
            </section>
          )}

          {activeTab === "scan" && (
            <section className="scan-page">
              <h1>Mulai Analisis Personal Color</h1>
              <p className="scan-description">Analisis tone kulit dijalankan langsung di browser Anda.</p>

              {isModelLoading ? (
                <p className="scan-model-status" role="status">Memuat AI...</p>
              ) : modelError ? (
                <div className="scan-error" role="alert">
                  <p>{modelError}</p>
                  <button className="scan-retry-button" onClick={() => setModelLoadAttempt((attempt) => attempt + 1)}>
                    Coba muat ulang
                  </button>
                </div>
              ) : isAnalyzing ? (
                <p className="scan-model-status" role="status">Menganalisis gambar...</p>
              ) : isCameraActive ? (
                <CameraScanner
                  onCaptureComplete={handleCaptureComplete}
                  onClose={() => setIsCameraActive(false)}
                />
              ) : (
                <>
                  {analysisError && <p className="scan-error" role="alert">{analysisError}</p>}
                  {analysisResult && (
                    <>
                      <div className="scan-result" aria-live="polite">
                        <p className="scan-result-label">HASIL ANALISIS</p>
                        <h2>Tone Kulit: <span>{analysisResult.tone}</span></h2>
                        <p>Persentase keyakinan: <strong>{Math.round(analysisResult.confidence * 100)}%</strong></p>
                      </div>
                      <section className="recommended-products" aria-labelledby="recommended-products-title">
                        <h2 id="recommended-products-title">Rekomendasi Produk</h2>
                        {recommendedProducts.length > 0 ? (
                          <div className="recommended-product-grid">
                            {recommendedProducts.map((product, index) => (
                              <article
                                className="recommended-product-card"
                                key={`${product.brand}-${product.product_name}-${product.shade_code_name}-${index}`}
                              >
                                <p className="recommended-product-brand">{product.brand || "Brand tidak diketahui"}</p>
                                <h3>{product.product_name || "Produk tanpa nama"}</h3>
                                <p>Shade: <strong>{product.shade_code_name || product.shade_number || "-"}</strong></p>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="recommended-products-empty">
                            Belum ada produk dengan kategori tone kulit “{analysisResult.tone}”.
                          </p>
                        )}
                      </section>
                    </>
                  )}
                  <button
                    className="scan-start-button"
                    onClick={() => {
                      setAnalysisError("");
                      setAnalysisResult(null);
                      setIsCameraActive(true);
                    }}
                  >
                    Mulai Kamera Cerdas (AI)
                  </button>
                </>
              )}
            </section>
          )}

          {activeTab === "history" && <HistoryList />}
        </div>
      </div>
    </div>
  );
}

export default App;