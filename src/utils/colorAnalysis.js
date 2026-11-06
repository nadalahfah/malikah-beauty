// Konversi RGB ke CIELAB
export function rgbToLab(r, g, b) {
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
export function calculateDeltaE(lab1, lab2) {
  const dL = lab1.L - (lab2.lab_L || lab2.L || 0);
  const dA = lab1.a - (lab2.lab_A || lab2.a || 0);
  const dB = lab1.b - (lab2.lab_B || lab2.b || 0);
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}

// Pengolahan Ekstraksi Pigmen Kulit & Matching Katalog
export function analyzeSkinColor(imageSrc, ctx, w, h, katalogProduk, customerName) {
  const points = [
    { x: Math.floor(w * 0.5), y: Math.floor(h * 0.3) },  // Dahi
    { x: Math.floor(w * 0.5), y: Math.floor(h * 0.5) },  // T-Zone
    { x: Math.floor(w * 0.35), y: Math.floor(h * 0.55) },// Pipi Kiri
    { x: Math.floor(w * 0.65), y: Math.floor(h * 0.55) },// Pipi Kanan
    { x: Math.floor(w * 0.5), y: Math.floor(h * 0.42) }  // Bawah Mata
  ];

  let totalR = 0, totalG = 0, totalB = 0, sampled = 0;

  points.forEach((pt) => {
    const pixel = ctx.getImageData(pt.x, pt.y, 1, 1).data;
    totalR += pixel[0];
    totalG += pixel[1];
    totalB += pixel[2];
    sampled++;
  });

  const avgR = Math.round(totalR / sampled);
  const avgG = Math.round(totalG / sampled);
  const avgB = Math.round(totalB / sampled);

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

  // Hitung Delta E & urutkan produk
  const productsWithDeltaE = katalogProduk.map((item) => ({
    ...item,
    deltaE: calculateDeltaE(lab, item)
  })).sort((a, b) => a.deltaE - b.deltaE);

  // Variasi Merek (Grouped Sampling)
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

  return {
    id: Date.now(),
    name: customerName.trim() || "Pelanggan Anonim",
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
}