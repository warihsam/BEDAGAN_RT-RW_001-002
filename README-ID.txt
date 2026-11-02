BEDAGAN — REACT + VITE
=====================

STRUKTUR
- src/       React UI dan pemanggil API
- api/       Proxy serverless untuk meneruskan request ke Google Apps Script
- GAS_API_PATCH.txt  kode tambahan untuk Code.gs lama

MENJALANKAN DI VS CODE
1. Ekstrak folder ini.
2. Buka folder BEDAGAN-Vite di VS Code.
3. Pastikan Node.js versi LTS sudah terpasang.
4. Buka Terminal VS Code, jalankan: npm install
5. Salin .env.example menjadi .env.local, lalu isi GAS_WEB_APP_URL dengan URL Web App Apps Script /exec.
6. Pastikan Code.gs sudah ditambahkan kode dari GAS_API_PATCH.txt dan Apps Script sudah di-deploy ulang.
7. Jalankan: npm run dev
8. Buka URL lokal yang ditampilkan Vite.

DEPLOY VERCEL
1. Push folder project ke GitHub.
2. Import repository di https://vercel.com/ lalu framework Vite.
3. Tambahkan Environment Variable:
   GAS_WEB_APP_URL = https://script.google.com/macros/s/ID_DEPLOYMENT/exec
4. Deploy.

PENTING
- Project ini mempertahankan Google Sheets sebagai database.
- Jangan menghapus backend Code.gs lama.
- GAS_API_PATCH.txt perlu ditambahkan ke Code.gs, lalu deploy ulang.
- UI saat ini memakai fungsi backend yang tersedia pada Code.gs yang diperiksa.
- Backend lama belum menyediakan CRUD untuk edit jadwal ronda/anggota ronda, ubah PIN, atau hapus data; menu tersebut tidak saya tampilkan sebagai fungsi aktif agar tidak menjanjikan fitur yang belum ada.
- Vite dev server memakai proxy lokal bawaan di vite.config.js.
- Untuk Vercel, atur Environment Variable GAS_WEB_APP_URL dengan URL /exec yang sama.
