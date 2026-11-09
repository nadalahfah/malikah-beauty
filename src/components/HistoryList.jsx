import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function HistoryList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    const fetchLogs = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data, error } = await supabase.from('skin_tone_logs').select('*').order('created_at', { ascending: false });

        if (error) throw error;
        if (isCurrent) setLogs(data || []);
      } catch (error) {
        console.error("Gagal mengambil riwayat dari Supabase:", error);
        if (isCurrent) {
          setErrorMessage("Gagal memuat riwayat analisis dari database. Silakan coba lagi.");
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchLogs();
    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatConfidence = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const score = Number(value);
    if (!Number.isFinite(score)) return "-";
    return `${Math.round(score <= 1 ? score * 100 : score)}%`;
  };

  return (
    <section className="skin-history" aria-labelledby="skin-history-title">
      <header className="skin-history-header">
        <div>
          <p className="skin-history-eyebrow">RIWAYAT ANALISIS</p>
          <h1 id="skin-history-title">Riwayat Analisis Skin Tone</h1>
          <p className="skin-history-description">Lihat hasil analisis warna kulit yang tersimpan.</p>
        </div>
        <button
          className="skin-history-refresh"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
        >
          {loading ? "Memuat..." : "Muat Ulang"}
        </button>
      </header>

      {loading ? (
        <p className="skin-history-message" role="status">Memuat data riwayat dari Supabase...</p>
      ) : errorMessage ? (
        <p className="skin-history-message skin-history-error" role="alert">{errorMessage}</p>
      ) : logs.length === 0 ? (
        <p className="skin-history-message">Belum ada riwayat analisis yang tersimpan di database.</p>
      ) : (
        <div className="skin-history-table-wrap">
          <table className="skin-history-table">
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col">Tone Kulit</th>
                <th scope="col">Skor Keyakinan</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.created_at)}</td>
                  <td><span className="skin-tone-badge">{item.predicted_tone || "-"}</span></td>
                  <td className="skin-confidence">{formatConfidence(item.confidence_score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
