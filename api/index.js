export default async function handler(req, res) {
  // Pemeriksaan endpoint melalui browser
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      message: "BEDAGAN API aktif. Gunakan POST untuk mengirim data."
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Gunakan POST."
    });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;

  if (!gasUrl) {
    return res.status(500).json({
      success: false,
      message: "Environment Variable GAS_WEB_APP_URL belum diatur di Vercel."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    if (!body.method) {
      return res.status(400).json({
        success: false,
        message: "Method API tidak ditemukan."
      });
    }

    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(body)
    });

    const raw = await response.text();

    let result;

    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error(
        "Respons Google Apps Script bukan JSON. Periksa URL deployment /exec."
      );
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("BEDAGAN API ERROR:", error);

    return res.status(502).json({
      success: false,
      message: error.message || "Gagal menghubungi Google Apps Script."
    });
  }
}