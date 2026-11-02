export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({success:false,message:'Method not allowed'});
  const url = process.env.GAS_WEB_APP_URL;
  if (!url) return res.status(500).json({success:false,message:'Atur GAS_WEB_APP_URL di Environment Variables Vercel.'});
  try {
    const upstream = await fetch(url, {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(req.body || {})});
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('Respons Apps Script bukan JSON. Periksa URL deployment /exec dan fungsi doPost.'); }
    return res.status(200).json(data);
  } catch (e) { return res.status(502).json({success:false,message:e.message || 'Gagal menghubungi Apps Script'}); }
}
