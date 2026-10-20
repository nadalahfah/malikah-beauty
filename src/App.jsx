import { useState, useEffect } from "react";
import "./App.css";
import logoImage from "./assets/logo.png";
import dashboardImage from "./assets/fotodashboard.png";

const initialStats = [
  { label: "Total Analisis", value: "128", note: "+12% dari bulan lalu", icon: "◉" },
  { label: "Pelanggan Hari Ini", value: "08", note: "3 menunggu analisis", icon: "♡" },
  { label: "Laporan Selesai", value: "116", note: "90,6% dari total analisis", icon: "▤" },
];

const recentCustomers = [
  { initials: "NA", name: "Nadia Aulia", date: "17 Okt 2026 · 10:24", undertone: "Warm", status: "Selesai", color: "warm" },
  { initials: "SR", name: "Sarah Rahma", date: "17 Okt 2026 · 09:45", undertone: "Cool", status: "Selesai", color: "cool" },
  { initials: "DP", name: "Dinda Putri", date: "17 Okt 2026 · 09:10", undertone: "Neutral", status: "Selesai", color: "neutral" },
  { initials: "AF", name: "Alya Fitri", date: "17 Okt 2026 · 08:50", undertone: "—", status: "Menunggu", color: "pending" },
];

const navItems = [
  { id: "dashboard", icon: "⌂", label: "Dashboard" },
  { id: "scan", icon: "◎", label: "Face Scan" },
  { id: "history", icon: "▤", label: "Riwayat Analisis" },
];

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [scanTab, setScanTab] = useState("camera");
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [searchHistory, setSearchHistory] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua status");
  const [selectedHistory, setSelectedHistory] = useState(null);

  const historyData = [
    { id: 1, name: "Nadia Aulia", initials: "NA", avatarColor: "#d4a5a5", dateTime: "17 Okt 2026 · 14:32", status: "Berhasil", result: "Undertone: Warm — Palet: Warm Spring", undertone: "Warm", personalColor: "Warm Spring", paletteColors: ["#F4C2A1", "#E8A87C", "#C9A27E", "#A67C52", "#FDE3C8"] },
    { id: 2, name: "Sarah Rahma", initials: "SR", avatarColor: "#c9a9c9", dateTime: "12 Sep 2026 · 10:15", status: "Berhasil", result: "Undertone: Cool — Palet: Cool Winter", undertone: "Cool", personalColor: "Cool Winter", paletteColors: ["#E3E8F2", "#B8C4D4", "#8B9DC3", "#5A6B7E", "#F5F7FA"] },
    { id: 3, name: "Dinda Putri", initials: "DP", avatarColor: "#b8c4d4", dateTime: "28 Agu 2026 · 16:40", status: "Berhasil", result: "Undertone: Neutral — Palet: Soft Autumn", undertone: "Neutral", personalColor: "Soft Autumn", paletteColors: ["#D4C5C5", "#B8B0A8", "#E8E0D8", "#C9B8A8", "#F2EDE0"] },
    { id: 4, name: "Alya Fitri", initials: "AF", avatarColor: "#d4a5a5", dateTime: "21 Agu 2026 · 09:10", status: "Berhasil", result: "Undertone: Warm — Palet: Warm Spring", undertone: "Warm", personalColor: "Warm Spring", paletteColors: ["#F4C2A1", "#E8A87C", "#C9A27E", "#A67C52", "#FDE3C8"] },
    { id: 5, name: "Rina Salsabila", initials: "RS", avatarColor: "#c9a9c9", dateTime: "15 Agu 2026 · 11:25", status: "Berhasil", result: "Undertone: Cool — Palet: Cool Winter", undertone: "Cool", personalColor: "Cool Winter", paletteColors: ["#E3E8F2", "#B8C4D4", "#8B9DC3", "#5A6B7E", "#F5F7FA"] },
    { id: 6, name: "Fitria Anggraini", initials: "FA", avatarColor: "#b8c4d4", dateTime: "10 Agu 2026 · 15:50", status: "Gagal", result: "Tidak terdeteksi wajah — Coba lagi dengan pencahayaan lebih baik." },
    { id: 7, name: "Salsa Nabila", initials: "SN", avatarColor: "#d4a5a5", dateTime: "3 Agu 2026 · 13:20", status: "Berhasil", result: "Undertone: Neutral — Palet: Soft Summer", undertone: "Neutral", personalColor: "Soft Summer", paletteColors: ["#D4C5C5", "#B8B0A8", "#E8E0D8", "#C9B8A8", "#F2EDE0"] },
    { id: 8, name: "Chintya Lestari", initials: "CL", avatarColor: "#c9a9c9", dateTime: "28 Jul 2026 · 17:05", status: "Berhasil", result: "Undertone: Warm — Palet: Warm Autumn", undertone: "Warm", personalColor: "Warm Autumn", paletteColors: ["#F4C2A1", "#E8A87C", "#C9A27E", "#A67C52", "#FDE3C8"] },
  ];

  const activeLabel = navItems.find((item) => item.id === activePage)?.label
    || (activePage === "settings" ? "Pengaturan" : "Profil Staf");

  const filteredCustomers = recentCustomers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase())
  );

  function goTo(page) {
    setActivePage(page);
  }

  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const todayLocale = new Date().toLocaleDateString("id-ID", options);

  function toggleNotif() {
    setNotifOpen(!notifOpen);
  }

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err) {
      setCameraError(err);
      setIsCameraActive(false);
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraActive(false);
    setCameraError(null);
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Format tidak didukung. Gunakan JPG, JPEG, PNG, atau WEBP.");
      setUploadedFile(null);
      setUploadPreview(null);
      return;
    }
    setUploadError(null);
    setUploadedFile(file);
    setUploadPreview(URL.createObjectURL(file));
  }

  function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Format tidak didukung. Gunakan JPG, JPEG, PNG, atau WEBP.");
      setUploadedFile(null);
      setUploadPreview(null);
      return;
    }
    setUploadError(null);
    setUploadedFile(file);
    setUploadPreview(URL.createObjectURL(file));
  }

  function removeUploadedFile() {
    if (uploadPreview) {
      URL.revokeObjectURL(uploadPreview);
    }
    setUploadedFile(null);
    setUploadPreview(null);
    setUploadError(null);
  }

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (scanTab !== "camera" && cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      setIsCameraActive(false);
      setCameraError(null);
    }
  }, [scanTab, cameraStream]);

  const filteredHistory = historyData.filter((item) => {
    const matchName = searchHistory === "" || item.name.toLowerCase().includes(searchHistory.toLowerCase());
    const matchDate = filterDate === "" || item.dateTime.startsWith(filterDate);
    const matchStatus = filterStatus === "Semua status" || item.status === filterStatus;
    return matchName && matchDate && matchStatus;
  });

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <img src={logoImage} alt="Malikah Beauty Studio Logo" className="brand-logo" />
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => goTo(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "scan" && <span className="nav-new">NEW</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-sparkle">✧</div>
            <strong>Butuh bantuan?</strong>
            <p>Panduan singkat untuk membantu proses analisis pelanggan.</p>
            <button onClick={() => alert("Panduan staf akan ditambahkan pada tahap berikutnya.")}>
              Lihat panduan <span>↗</span>
            </button>
          </div>
          <button className={`nav-item bottom-nav ${activePage === "settings" ? "active" : ""}`} onClick={() => goTo("settings")}>
            <span className="nav-icon">⚙</span><span>Pengaturan</span>
          </button>
          <div className="staff-profile">
            <div className="staff-avatar">MB</div>
            <div className="staff-info"><strong>Staf Malika</strong><span>Administrator</span></div>
            <button className="more-button" aria-label="Opsi profil" onClick={() => goTo("profile")}>•••</button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            {activePage === "dashboard" ? (
              <>
                <div className="eyebrow"><span>✦</span> YOUR BEAUTY, YOUR COLORS</div>
                <h1>Selamat datang, <em>Malika!</em></h1>
                <p className="welcome-description">Bantu setiap pelanggan menemukan warna yang membuat mereka bersinar.</p>
              </>
            ) : (
              <>
                <div className="eyebrow"><span>✦</span> MALIKA BEAUTY STUDIO</div>
                <h1>{activeLabel}</h1>
              </>
            )}
          </div>
          <div className="topbar-right">
            <div className="today-label"><span>▦</span>{todayLocale}</div>
            <div className="status-dot" aria-label="Sistem online"></div>
            <button className="notification-button" onClick={toggleNotif}>🔔<i /></button>
            {notifOpen && (
              <div className="notif-panel">
                <div className="notif-header">Notifikasi</div>
                <div className="notif-empty">Belum ada notifikasi</div>
                <button className="notif-close" onClick={toggleNotif}>Tutup</button>
              </div>
            )}
            <div className="topbar-avatar">MB</div>
          </div>
        </header>

        <div className="page-content">
          {activePage === "dashboard" && (
            <>
          <section className="hero-card">
            <div className="hero-copy">
              <div className="hero-label"><span>✧</span> PERSONAL COLOR ANALYSIS</div>
              <h2>Temukan warna terbaik<br />untuk setiap <em>versi dirimu.</em></h2>
              <p>Mulai analisis personal color untuk membantu pelanggan mengenali undertone dan pilihan makeup yang sesuai.</p>
              <button className="primary-button" onClick={() => goTo("scan")}>Mulai Face Scan <span>→</span></button>
            </div>
            <div className="hero-image">
              <img src={dashboardImage} alt="Dashboard illustration" className="hero-img" />
            </div>
          </section>

          <section className="stats-grid" aria-label="Ringkasan aktivitas">
            {initialStats.map((stat, index) => (
              <article className="stat-card" key={stat.label}>
                <div className={`stat-icon stat-icon-${index}`}>{stat.icon}</div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
                <div className={`stat-note ${index === 0 ? "positive" : ""}`}>{stat.note}</div>
                <div className="stat-decoration">{index === 0 ? "↗" : index === 1 ? "✧" : "♡"}</div>
              </article>
            ))}
          </section>

          <section className="content-grid">
            <article className="panel recent-panel">
              <div className="panel-heading">
                <div><h3>Analisis Terbaru</h3><p>Pantau hasil analisis pelanggan terakhir.</p></div>
                <button className="text-button" onClick={() => goTo("history")}>Lihat semua <span>→</span></button>
              </div>
              <div className="table-tools">
                <div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama pelanggan..." aria-label="Cari nama pelanggan" /></div>
                <button className="filter-button" onClick={() => setSearch("")}>↕ Filter</button>
              </div>
              <div className="customer-table-wrap">
                <table className="customer-table">
                  <thead><tr><th>PELANGGAN</th><th>UNDERTONE</th><th>STATUS</th><th></th></tr></thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.name}>
                        <td><div className="customer-cell"><div className={`customer-avatar avatar-${customer.color}`}>{customer.initials}</div><div><strong>{customer.name}</strong><span>{customer.date}</span></div></div></td>
                        <td>{customer.undertone === "—" ? <span className="muted-dash">—</span> : <span className={`undertone-tag ${customer.color}`}>{customer.undertone}</span>}</td>
                        <td><span className={`status-tag ${customer.status === "Selesai" ? "done" : "waiting"}`}><i />{customer.status}</span></td>
                        <td><button className="row-more" aria-label={`Lihat ${customer.name}`} onClick={() => goTo("reports")}>···</button></td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && <tr><td colSpan="4" className="empty-state">Nama pelanggan tidak ditemukan.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="table-foot">Menampilkan {filteredCustomers.length} dari {recentCustomers.length} pelanggan contoh</div>
            </article>

            <article className="panel quick-panel">
              <div className="panel-heading"><div><h3>Akses Cepat</h3><p>Yang sering kamu butuhkan.</p></div></div>
              <button className="quick-action" onClick={() => goTo("scan")}><div className="quick-icon pink-icon">◎</div><div><strong>Analisis pelanggan</strong><span>Mulai pemindaian wajah baru</span></div><b>→</b></button>
              <button className="quick-action" onClick={() => goTo("history")}><div className="quick-icon lilac-icon">▤</div><div><strong>Riwayat analisis</strong><span>Lihat data analisis sebelumnya</span></div><b>→</b></button>
              <button className="quick-action" onClick={() => goTo("reports")}><div className="quick-icon peach-icon">♡</div><div><strong>Laporan personal color</strong><span>Buka hasil dan rekomendasi</span></div><b>→</b></button>
              <div className="tip-card"><span>✧</span><div><strong>Tips hari ini</strong><p>Pastikan pencahayaan wajah merata agar hasil analisis lebih konsisten.</p></div></div>
            </article>
          </section>
          <footer className="page-footer"><span>© 2026 Malika Beauty Studio</span><span>Made with care <b>♡</b></span></footer>
            </>
          )}</div>

      {activePage !== "dashboard" && (
        <div className="page-content subpage-content">
          {activePage === "scan" ? (
            <section className="scan-page">
              <div className="scan-header">
                <h1>Mulai Analisis Personal Color</h1>
                <p>Temukan warna yang paling cocok untuk wajah Anda dengan analisis personal color terbaru.</p>
              </div>
              <div className="scan-content">
                <div className="scan-left">
                  <div className="scan-tabs">
                    <button className={`scan-tab ${scanTab === "camera" ? "active" : ""}`} onClick={() => setScanTab("camera")}>Ambil Foto</button>
                    <button className={`scan-tab ${scanTab === "upload" ? "active" : ""}`} onClick={() => setScanTab("upload")}>Unggah Foto</button>
                  </div>

                  {scanTab === "camera" ? (
                    <>
                      {cameraError && (
                        <div className="camera-error">
                          <p>Kamera tidak dapat diakses.</p>
                          <button className="scan-start-button" onClick={startCamera}>Coba Lagi</button>
                        </div>
                      )}
                      {isCameraActive && cameraStream ? (
                        <>
                          <video className="camera-preview" autoPlay playsInline ref={(el) => { if (el) el.srcObject = cameraStream; }} />
                          <button className="scan-start-button" onClick={stopCamera}>Mulai Analisis</button>
                        </>
                      ) : (
                        <button className="scan-start-button" onClick={startCamera}>Mulai Foto</button>
                      )}
                      <div className="scan-guidelines">
                        <p>• Pastikan wajah terlihat penuh dan jelas</p>
                        <p>• Gunakan pencahayaan yang merata</p>
                        <p>• Hindari filter atau efek foto</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="upload-area" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                        <input type="file" accept="image/jpeg, image/jpg, image/png, image/webp" onChange={handleFileChange} className="file-input" />
                        <label className="upload-label">
                          <span className="upload-icon">📁</span>
                          <p className="upload-text">Klik atau seret foto di sini</p>
                          <p className="upload-hint">JPG, JPEG, PNG, WEBP</p>
                        </label>
                        {uploadError && <p className="upload-error">{uploadError}</p>}
                        {uploadPreview && (
                          <div className="preview-container">
                            <img className="preview-img" src={uploadPreview} alt="Preview" />
                            <button className="remove-upload" onClick={removeUploadedFile}>×</button>
                          </div>
                        )}
                      </div>
                      <div className="scan-guidelines">
                        <p>• Pilih foto wajah yang jelas</p>
                        <p>• Pastikan pencahayaan merata</p>
                        <p>• Hindari filter atau efek foto</p>
                      </div>
                      <button className="scan-start-button" onClick={() => alert("Fitur analisis akan aktif setelah AI terhubung.")} disabled={!uploadedFile}>Mulai Analisis</button>
                    </>
                  )}
                  <div className="scan-info-card">
                    <h3>Informasi Penting</h3>
                    <p>Hasil analisis akan ditampilkan dalam beberapa detik. Pastikan koneksi internet stabil selama proses berlangsung.</p>
                  </div>
                </div>
                <div className="scan-right">
                  <div className="scan-process-card">
                    <h3>Proses Analisis</h3>
                    <div className="process-steps">
                      <div className="process-step">
                        <span className="step-number">1</span>
                        <div className="step-content">
                          <strong>Ambil foto wajah</strong>
                          <p>Pastikan pencahayaan mencukupi</p>
                        </div>
                      </div>
                      <div className="process-step">
                        <span className="step-number">2</span>
                        <div className="step-content">
                          <strong>Analisis warna kulit</strong>
                          <p>Sistem mendeteksi undertone Anda</p>
                        </div>
                      </div>
                      <div className="process-step">
                        <span className="step-number">3</span>
                        <div className="step-content">
                          <strong>Hasil rekomendasi</strong>
                          <p>Dapatkan palet warna yang cocok</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="scan-example-card">
                    <h3>Contoh Foto yang Baik</h3>
                    <div className="example-grid">
                      <div className="example-item good"><span>✓</span><p>Cahaya wajah merata</p></div>
                      <div className="example-item good"><span>✓</span><p>Wajah menghadap ke depan</p></div>
                      <div className="example-item bad"><span>✗</span><p>Terlalu bayang-bayang</p></div>
                      <div className="example-item bad"><span>✗</span><p>Menggunakan filter foto</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : activePage === "history" ? (
            <section className="history-page">
              <div className="history-header">
                <div className="history-left">
                  <div className="history-label">✧ RIWAYAT ANALISIS</div>
                  <h1>Daftar Riwayat Analisis</h1>
                  <p className="history-desc">Berikut adalah seluruh sesi face scan yang pernah dilakukan pelanggan.</p>
                </div>
                <div className="history-decor">
                  <span className="decor-text">Setiap wajah punya warna unik</span>
                  <span className="decor-heart">♡</span>
                  <div className="decor-flower">✿</div>
                </div>
              </div>

              <div className="history-filter-card">
                <div className="filter-row">
                  <div className="filter-item">
                    <span>🔍</span>
                    <input type="text" placeholder="Cari nama pelanggan..." value={searchHistory} onChange={(e) => setSearchHistory(e.target.value)} />
                  </div>
                  <div className="filter-item">
                    <span>📅</span>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                  </div>
                  <div className="filter-item">
                    <span>📊</span>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option>Semua status</option>
                      <option>Berhasil</option>
                      <option>Gagal</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="history-table-card">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th style={{width:40}}>No.</th>
                      <th>Nama Pelanggan</th>
                      <th>Tanggal & Waktu Scan</th>
                      <th>Status Analisis</th>
                      <th>Hasil Singkat</th>
                      <th style={{width:130}}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>
                          <div className="customer-row-cell">
                            <div className="avatar-circle" style={{backgroundColor: item.avatarColor}}>{item.initials}</div>
                            <div><strong>{item.name}</strong></div>
                          </div>
                        </td>
                        <td>{item.dateTime}</td>
                        <td>
                          <span className={`status-badge ${item.status === 'Berhasil' ? 'success' : 'fail'}`}>{item.status}</span>
                        </td>
                        <td>{item.result}</td>
                        <td><button className="detail-button" onClick={() => { setSelectedHistory(item); setActivePage("reports"); }}>Lihat Detail <span>→</span></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="history-pagination">
                  <span>Menampilkan 1–{filteredHistory.length} dari {historyData.length} hasil</span>
                  <div className="pagination-controls">
                    <button>‹</button>
                    <button className="active">1</button>
                    <button>2</button>
                    <button>3</button>
                    <button>4</button>
                    <button>›</button>
                  </div>
                </div>
              </div>
            </section>
          
          ) : activePage === "reports" ? (
            <section className="report-detail-page">
              {selectedHistory ? (
                <div className="report-detail-view">
                  <button className="report-back-btn" onClick={() => { setSelectedHistory(null); setActivePage("history"); }}>← Kembali ke Riwayat Analisis</button>
                  <div className="report-detail-header">
                    <div className="report-detail-label">✧ LAPORAN PERSONAL COLOR</div>
                    <h1>Hasil Analisis Personal Color</h1>
                    <p>Berikut adalah hasil analisis warna dan rekomendasi makeup untuk kamu.</p>
                  </div>
                  <div className="report-detail-body">
                    <div className="report-customer">
                      <div className="report-avatar">{selectedHistory.initials}</div>
                      <div className="report-customer-info">
                        <div className="report-customer-name">{selectedHistory.name}</div>
                        <div className="report-customer-meta">{selectedHistory.dateTime} • Undertone: {selectedHistory.undertone} • Personal Color: {selectedHistory.personalColor}</div>
                      </div>
                    </div>
                    <div className="report-grid">
                      <div className="report-card">
                        <div className="report-card-title">Ringkasan Hasil Analisis</div>
                        <div className="personal-color-name">{selectedHistory.personalColor}</div>
                        <div className="undertone-chip">Undertone: {selectedHistory.undertone}</div>
                        <div className="char-list">
                          <div className="char-item"><span>💧</span><strong>Undertone:</strong> {selectedHistory.undertone}</div>
                          <div className="char-item"><span>☀️</span><strong>Intensitas Wara:</strong> Light - Medium</div>
                          <div className="char-item"><span>⚖️</span><strong>Kontras:</strong> Rendah - Sedang</div>
                        </div>
                        <div className="palette-row">
                          {selectedHistory.paletteColors.map((c,i)=>(<div key={i} className="palette-swatch" style={{backgroundColor:c}}></div>))}
                        </div>
                        <div className="report-card-note">Warna-warna ini akan membuat wajahmu terlihat lebih cerah, segar, dan sehat.</div>
                      </div>
                      <div className="report-card">
                        <div className="report-card-title">Rekomendasi Warna Pakaian</div>
                        <div className="cat-row">
                          <div className="cat-item"><div className="cat-title">Warna Utama</div><div className="cat-swatches">{selectedHistory.paletteColors.slice(0,4).map((c,i)=>(<div key={i} className="cat-swatch" style={{backgroundColor:c}}></div>))}</div></div>
                          <div className="cat-item"><div className="cat-title">Warna Netral</div><div className="cat-swatches">{['#D4C5C5','#B8B0A8','#E8E0D8','#C9B8A8'].map((c,i)=>(<div key={i} className="cat-swatch" style={{backgroundColor:c}}></div>))}</div></div>
                          <div className="cat-item"><div className="cat-title">Warna Aksen</div><div className="cat-swatches">{selectedHistory.paletteColors.slice(2,6).map((c,i)=>(<div key={i} className="cat-swatch" style={{backgroundColor:c}}></div>))}</div></div>
                        </div>
                        <div className="cat-row outfit-row">
                          {['Casual','Formal','Soft Look','Bold Accent'].map((o,i)=>(<div key={i} className="outfit-item"><div className="outfit-img">{['◍','□','◇','★'][i]}</div><div className="outfit-label">{o}</div></div>))}
                        </div>
                        <div className="report-card-title">Rekomendasi Warna Makeup</div>
                        <div className="makeup-row">
                          {[
                            {name:'Foundation', desc:'Warm / Neutral'},
                            {name:'Blush', desc:'Peach, Coral, Apricot'},
                            {name:'Lipstick', desc:'Peach, Coral, Rose Warm'},
                            {name:'Eyeshadow', desc:'Warm Brown, Peach, Gold'},
                            {name:'Bronzer', desc:'Highlighter Warm Tone'}
                          ].map((m,i)=>(<div key={i} className="makeup-item"><div className="makeup-img">◉</div><div className="makeup-info"><div className="makeup-name">{m.name}</div><div className="makeup-desc">{m.desc}</div></div></div>))}
                        </div>
                        <div className="report-card-note">Warna yang tepat, bahan yang selalu enak dipakai. Tapo tentang versi terbaik dari dirimu. ♡</div>
                      </div>
                    </div>
                  </div>
                  <div className="report-detail-actions">
                    <button className="report-btn-download">⬇ Unduh PDF</button>
                    <button className="report-btn-print">🖨 Cetak Laporan</button>
                  </div>
                </div>
              ) : (
                <div className="placeholder-card"><h2>Laporan personal color</h2><p>Hasil undertone dan rekomendasi makeup pelanggan akan muncul di halaman ini setelah AI dan API terhubung.</p><div className="report-swatches"><span /><span /><span /><span /><span /></div></div>
              )}
            </section>
          ) : activePage === "settings" ? (
            <section className="placeholder-card">
              <h2>Pengaturan workspace</h2>
              <p>Pengaturan profil salon, akun staf, dan preferensi sistem dapat ditambahkan di tahap berikutnya.</p>
            </section>
          ) : (
            <section className="placeholder-card">
              <h2>Profil staf</h2>
              <p>Pengaturan profil administrator akan ditambahkan di tahap berikutnya.</p>
            </section>
          )}
          <footer className="page-footer">
            <span>© 2026 Malika Beauty Studio</span>
            <span>Made with care <b>♡</b></span>
          </footer>

        </div>
      )}
      </div>
    </div>
  );
}

export default App;