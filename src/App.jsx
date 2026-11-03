
import React, { useEffect, useMemo, useState } from 'react';
import {
  Home,
  Users,
  Wallet,
  HandCoins,
  CalendarDays,
  ClipboardCheck,
  Megaphone,
  ChartNoAxesCombined,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Plus,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ShieldCheck,
  LockKeyhole,
} from 'lucide-react';

import { api, rupiah, tanggal } from './api';

const NAV = [
  ['dashboard', 'Ringkasan', Home],
  ['warga', 'Data Warga', Users],
  ['keuangan', 'Keuangan', Wallet],
  ['jimpitan', 'Jimpitan', HandCoins],
  ['ronda', 'Jadwal Ronda', CalendarDays],
  ['kehadiran', 'Kehadiran', ClipboardCheck],
  ['pengumuman', 'Pengumuman', Megaphone],
  ['notifikasi', 'Notifikasi', Bell],
  ['laporan', 'Laporan', ChartNoAxesCombined],
];

const ROLE = {
  admin: 'Administrator',
  bendahara: 'Bendahara',
  petugas: 'Petugas',
  warga: 'Warga',
};

const title = (page) =>
  NAV.find((item) => item[0] === page)?.[1] || 'BEDAGAN';

export default function App() {
  const [token, setToken] = useState(
    localStorage.getItem('bedagan_token') || ''
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bedagan_user') || 'null');
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState('dashboard');
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState('');
  const [toast, setToast] = useState('');

  const nav = useMemo(
    () =>
      NAV
        .filter(([key]) => key !== 'warga' || user?.role === 'admin')
        .filter(
          ([key]) =>
            key !== 'keuangan' ||
            ['admin', 'bendahara'].includes(user?.role)
        )
        .filter(
          ([key]) =>
            key !== 'jimpitan' ||
            ['admin', 'bendahara', 'petugas'].includes(user?.role)
        )
        .filter(
          ([key]) =>
            key !== 'kehadiran' ||
            ['admin', 'petugas'].includes(user?.role)
        )
        .filter(
          ([key]) => key !== 'laporan' || user?.role !== 'warga'
        ),
    [user]
  );

  const say = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  };

  const call = async (method, args = []) => {
    return api(method, args);
  };

  const logout = () => {
    const currentToken = token;

    localStorage.removeItem('bedagan_token');
    localStorage.removeItem('bedagan_user');

    setToken('');
    setUser(null);
    setData({});
    setPage('dashboard');

    if (currentToken) {
      call('logout', [currentToken]).catch(() => {});
    }
  };

  // MEMUAT DATA HALAMAN
  async function load(p = page) {
    if (!token || user?.must_change_pin) return;

    setBusy(true);
    setError('');

    try {
      const methods = {
        dashboard: ['dashboard', [token]],
        warga: ['daftarWarga', [token]],
        keuangan: ['riwayatKeuangan', [token]],
        jimpitan: ['riwayatJimpitan', [token]],
        ronda: ['daftarJadwal', [token]],
        kehadiran: ['riwayatKehadiran', [token]],
        pengumuman: ['daftarPengumuman', [token]],
        laporan: ['laporanBulanan',[token, new Date().toISOString().slice(0, 7)],],
        notifikasi: ['daftarNotifikasi', [token]],
      };

      const selected = methods[p];

      if (!selected) return;

      const [method, args] = selected;
      const result = await call(method, args);

      setData((previous) => ({
        ...previous,
        [p]: result,
      }));
    } catch (err) {
      setError(err.message || 'Gagal memuat data.');

      if (/sesi berakhir/i.test(err.message || '')) {
        logout();
      }
    } finally {
      setBusy(false);
    }
  }

  // MEMERIKSA SESI LOGIN
  useEffect(() => {
    if (token && !user) {
      call('cekSesi', [token])
        .then((result) => {
          if (result?.success && result.user) {
            setUser(result.user);
            localStorage.setItem(
              'bedagan_user',
              JSON.stringify(result.user)
            );
          } else {
            logout();
          }
        })
        .catch(() => logout());
    }
  }, []);

  // MEMUAT DATA SAAT HALAMAN BERUBAH
  useEffect(() => {
    if (token && user && !user.must_change_pin) {
      load(page);
    }
  }, [page, token, user]);

  // LOGIN
  async function login(event) {
    event.preventDefault();

    setBusy(true);
    setError('');

    try {
      const result = await call('login', [phone, pin]);

      if (!result.success) {
        throw new Error(result.message || 'Login gagal.');
      }

      localStorage.setItem('bedagan_token', result.token);
      localStorage.setItem(
        'bedagan_user',
        JSON.stringify(result.user)
      );

      setToken(result.token);
      setUser(result.user);
      setPage('dashboard');
      setPin('');
    } catch (err) {
      setError(err.message || 'Nomor HP atau PIN salah.');
    } finally {
      setBusy(false);
    }
  }

  // GANTI PIN PERTAMA KALI
  async function handleGantiPin(pinLama, pinBaru) {
    setBusy(true);
    setError('');

    try {
      const result = await call('gantiPin', [
        token,
        pinLama,
        pinBaru,
      ]);

      if (result?.success === false) {
        throw new Error(result.message || 'Gagal mengganti PIN.');
      }

      const updatedUser = {
        ...user,
        must_change_pin: false,
      };

      localStorage.setItem(
        'bedagan_user',
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);
      setError('');
      say('PIN berhasil diganti.');

    } catch (err) {
      setError(err.message || 'Gagal mengganti PIN.');
    } finally {
      setBusy(false);
    }
  }

  // SIMPAN DATA
  async function save(method, args, message) {
    setBusy(true);
    setError('');

    try {
      await call(method, args);

      setModal('');
      say(message);

      await load(page);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data.');
    } finally {
      setBusy(false);
    }
  }

  // HALAMAN LOGIN
  if (!token || !user) {
    return (
      <div className="login">
        <div className="login-side">
          <div className="logo">
            <b>B</b>
            <span>
              BEDAGAN
              <small>RT 001 · RW 002</small>
            </span>
          </div>

          <div className="hero-copy">
            <small>SISTEM INFORMASI WARGA</small>

            <h1>
              Lingkungan tertata,
              <br />
              <i>warga sejahtera.</i>
            </h1>

            <p>
              Satu ruang digital untuk mengelola kegiatan,
              informasi, dan keuangan lingkungan.
            </p>

            <span>
              <ShieldCheck size={17} />
              Akses sesuai peran dan data terintegrasi
            </span>
          </div>

          <small className="copyright">
            BEDAGAN DIGITAL COMMUNITY
          </small>
        </div>

        <form className="login-form" onSubmit={login}>
          <div className="logo mobile-logo">
            <b>B</b>
            <span>BEDAGAN</span>
          </div>

          <small className="kicker">SELAMAT DATANG</small>
          <h2>Masuk akun</h2>

          <p>Gunakan nomor HP dan PIN yang terdaftar.</p>

          {error && <div className="error">{error}</div>}

          <label>
            Nomor HP
            <input
              required
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="08xxxxxxxxxx"
            />
          </label>

          <label>
            PIN
            <input
              required
              type="password"
              inputMode="numeric"
              maxLength="12"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Masukkan PIN"
            />
          </label>

          <button className="primary wide" disabled={busy}>
            {busy ? 'Memeriksa...' : 'Masuk ke BEDAGAN'}
            <ChevronRight size={17} />
          </button>

          <small className="hint">
            Hubungi administrator jika lupa PIN atau akun belum aktif.
          </small>
        </form>
      </div>
    );
  }

  // HALAMAN WAJIB GANTI PIN
  if (user.must_change_pin) {
    return (
      <GantiPin
        nama={user.nama}
        onSubmit={handleGantiPin}
        loading={busy}
        error={error}
      />
    );
  }

  const rows = Array.isArray(data[page]) ? data[page] : [];

  // TAMPILAN UTAMA
  return (
    <div className="shell">
      <aside className={`sidebar ${mobile ? 'show' : ''}`}>
        <div className="brand">
          <div className="brand-icon">B</div>

          <div>
            <b>BEDAGAN</b>
            <small>RT 001 · RW 002</small>
          </div>

          <button
            className="icon mobile-close"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>

        <div className="nav-caption">MENU UTAMA</div>

        <nav>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => {
                setPage(key);
                setMobile(false);
              }}
              className={page === key ? 'active' : ''}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="profile">
          <div className="avatar">
            {user.nama?.[0]?.toUpperCase()}
          </div>

          <div>
            <b>{user.nama}</b>
            <small>{ROLE[user.role] || user.role}</small>
          </div>

          <button
            className="icon"
            title="Keluar"
            onClick={logout}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {mobile && (
        <button
          className="scrim"
          onClick={() => setMobile(false)}
        />
      )}

      <main>
        <header className="top">
          <button
            className="icon menu"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>

          <div>
            <small>BEDAGAN</small>
            <ChevronRight size={14} />
            <b>{title(page)}</b>
          </div>

          <span className="today">
            {new Intl.DateTimeFormat('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(new Date())}
          </span>
        </header>

        <section className="content">
          <div className="heading">
            <div>
              <small className="kicker">
                SISTEM INFORMASI LINGKUNGAN
              </small>

              <h1>{title(page)}</h1>

              <p>Selamat datang kembali, {user.nama}.</p>
            </div>

            <button
              className="light"
              onClick={() => load()}
              disabled={busy}
            >
              <RefreshCw size={16} />
              Perbarui
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          {busy && <div className="progress" />}

          {page === 'dashboard' && (
            <Dashboard d={data.dashboard} go={setPage} />
          )}

          {page === 'warga' && (
            <DataTable
              label="Daftar akun warga"
              rows={rows}
              add={() => setModal('warga')}
              columns={[
                'nama',
                'nomor_hp',
                'role',
                'status',
                'last_login',
              ]}
            />
          )}

          {page === 'keuangan' && (
            <DataTable
              label="Riwayat transaksi"
              rows={rows}
              add={() => setModal('keuangan')}
              columns={[
                'tanggal',
                'jenis',
                'kategori',
                'keterangan',
                'petugas',
                'nominal',
              ]}
            />
          )}

          {page === 'jimpitan' && (
            <DataTable
              label="Riwayat jimpitan"
              rows={rows}
              add={() => setModal('jimpitan')}
              columns={[
                'tanggal',
                'waktu',
                'petugas',
                'nominal',
                'keterangan',
                'status',
              ]}
            />
          )}

          {page === 'ronda' && (
            <DataTable
              label="Jadwal ronda aktif"
              rows={rows}
              columns={[
                'hari',
                'jam_mulai',
                'jam_selesai',
                'kelompok',
                'lokasi',
                'koordinator',
              ]}
            />
          )}

          {page === 'kehadiran' && (
            <DataTable
              label="Riwayat kehadiran"
              rows={rows}
              add={() => setModal('kehadiran')}
              columns={[
                'tanggal',
                'nama',
                'jenis_tugas',
                'status',
                'waktu',
                'catatan',
              ]}
            />
          )}

          {page === 'pengumuman' && (
  <Announcements
    rows={rows}
    add={
      user.role === 'admin'
        ? () => setModal('pengumuman')
        : null
    }
  />
)}
{page === 'notifikasi' && (
  <Notifications
    rows={rows}
    add={user.role === 'admin' ? () => setModal('notifikasi') : null}
    onRead={async (id) => {
      try {
        await call('tandaiNotifikasiDibaca', [token, id]);
        await load('notifikasi');
        say('Notifikasi ditandai sudah dibaca.');
      } catch (err) {
        setError(err.message || 'Gagal memperbarui notifikasi.');
      }
    }}
  />
)}
          {page === 'laporan' && (
            <Report d={data.laporan} />
          )}
        </section>

        <footer>
          © {new Date().getFullYear()} BEDAGAN · RT 001 RW 002
        </footer>
      </main>

      <nav className="bottom-nav">
        {nav.slice(0, 5).map(([key, label, Icon]) => (
          <button
            key={key}
            className={page === key ? 'chosen' : ''}
            onClick={() => setPage(key)}
          >
            <Icon size={19} />
            <small>
              {key === 'dashboard' ? 'Home' : label}
            </small>
          </button>
        ))}
      </nav>

      {modal && (
        <FormModal
          type={modal}
          close={() => setModal('')}
          submit={save}
          token={token}
          user={user}
          busy={busy}
        />
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

// ========================================
// HALAMAN GANTI PIN
// ========================================

function GantiPin({ nama, onSubmit, loading, error }) {
  const [pinLama, setPinLama] = useState('');
  const [pinBaru, setPinBaru] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [localError, setLocalError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLocalError('');

    if (!/^\d{6,12}$/.test(pinBaru)) {
      setLocalError('PIN baru harus 6–12 angka.');
      return;
    }

    if (pinBaru === pinLama) {
      setLocalError('PIN baru harus berbeda dari PIN lama.');
      return;
    }

    if (pinBaru !== konfirmasi) {
      setLocalError('Konfirmasi PIN baru tidak sama.');
      return;
    }

    await onSubmit(pinLama, pinBaru);
  }

  return (
    <div className="login">
      <div className="login-side">
        <div className="logo">
          <b>B</b>
          <span>
            BEDAGAN
            <small>RT 001 · RW 002</small>
          </span>
        </div>

        <div className="hero-copy">
          <small>KEAMANAN AKUN</small>
          <h1>
            Lindungi akun,
            <br />
            <i>jaga data bersama.</i>
          </h1>
          <p>
            Buat PIN pribadi yang hanya kamu ketahui untuk
            menjaga keamanan akun BEDAGAN.
          </p>
          <span>
            <ShieldCheck size={17} />
            PIN terenkripsi dan akses terlindungi
          </span>
        </div>

        <small className="copyright">
          BEDAGAN DIGITAL COMMUNITY
        </small>
      </div>

      <form className="login-form" onSubmit={submit}>
        <div className="logo mobile-logo">
          <b>B</b>
          <span>BEDAGAN</span>
        </div>

        <div className="stat-icon blue" style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          marginBottom: 22
        }}>
          <LockKeyhole size={23} />
        </div>

        <small className="kicker">PENGAMANAN AKUN</small>
        <h2>Ganti PIN</h2>

        <p>
          Halo, {nama || 'Pengguna'}. Untuk melanjutkan,
          silakan ganti PIN awal akunmu.
        </p>

        {(localError || error) && (
          <div className="error">
            {localError || error}
          </div>
        )}

        <label>
          PIN lama
          <input
            required
            type="password"
            inputMode="numeric"
            maxLength="12"
            autoComplete="current-password"
            value={pinLama}
            onChange={(event) => setPinLama(event.target.value)}
            placeholder="Masukkan PIN lama"
          />
        </label>

        <label>
          PIN baru
          <input
            required
            type="password"
            inputMode="numeric"
            maxLength="12"
            autoComplete="new-password"
            value={pinBaru}
            onChange={(event) => setPinBaru(event.target.value)}
            placeholder="Buat PIN baru 6–12 angka"
          />
        </label>

        <label>
          Konfirmasi PIN baru
          <input
            required
            type="password"
            inputMode="numeric"
            maxLength="12"
            autoComplete="new-password"
            value={konfirmasi}
            onChange={(event) => setKonfirmasi(event.target.value)}
            placeholder="Ulangi PIN baru"
          />
        </label>

        <button className="primary wide" disabled={loading}>
          {loading ? 'Menyimpan PIN...' : 'Simpan PIN Baru'}
          <ChevronRight size={17} />
        </button>

        <small className="hint">
          Gunakan PIN pribadi 6–12 angka. Jangan bagikan PIN
          kepada orang lain.
        </small>
      </form>
    </div>
  );
}

// ========================================
// DASHBOARD
// ========================================

function Dashboard({ d, go }) {
  if (!d) {
    return <div className="panel">Memuat ringkasan...</div>;
  }

  const stats = [
    ['Saldo Kas', rupiah(d.saldo), Wallet, 'blue'],
    ['Total Warga', d.jumlahWarga ?? 0, Users, 'green'],
    [
      'Pemasukan Bulan Ini',
      rupiah(d.pemasukanBulan),
      ArrowDownLeft,
      'teal',
    ],
    [
      'Pengeluaran Bulan Ini',
      rupiah(d.pengeluaranBulan),
      ArrowUpRight,
      'orange',
    ],
  ];

  return (
    <>
      <div className="welcome">
        <small>RINGKASAN KAS LINGKUNGAN</small>
        <h2>Kelola lingkungan lebih mudah.</h2>
        <p>
          Pantau kondisi kas dan kegiatan warga dalam satu tampilan.
        </p>
      </div>

      <div className="stats">
        {stats.map(([label, value, Icon, color]) => (
          <div className="stat" key={label}>
            <div className={`stat-icon ${color}`}>
              <Icon size={20} />
            </div>

            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="columns">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h3>Jadwal ronda hari ini</h3>
              <small>Petugas dan kelompok yang bertugas</small>
            </div>

            <button className="link" onClick={() => go('ronda')}>
              Lihat semua →
            </button>
          </div>

          {(d.jadwalHariIni || []).length ? (
            (d.jadwalHariIni || []).map((item, index) => (
              <div className="row" key={item.id || index}>
                <CalendarDays />

                <div>
                  <b>
                    {item.kelompok ||
                      item.koordinator ||
                      'Jadwal ronda'}
                  </b>

                  <small>
                    {item.lokasi || 'Lokasi belum diisi'} ·{' '}
                    {item.jam_mulai || '—'}–
                    {item.jam_selesai || '—'}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="empty">
              Tidak ada jadwal ronda hari ini.
            </p>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h3>Pengumuman terbaru</h3>
              <small>Informasi untuk warga</small>
            </div>

            <button
              className="link"
              onClick={() => go('pengumuman')}
            >
              Semua →
            </button>
          </div>

          {(d.pengumuman || []).slice(0, 4).map((item, index) => (
            <div className="row" key={item.id || index}>
              <Bell />

              <div>
                <b>{item.judul}</b>
                <small>
                  {item.kategori || 'Umum'} ·{' '}
                  {tanggal(item.tanggal_mulai)}
                </small>
              </div>
            </div>
          ))}

          {!d.pengumuman?.length && (
            <p className="empty">Belum ada pengumuman aktif.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <h3>Akses cepat</h3>

        <div className="quick">
          {[
            ['keuangan', 'Catat transaksi', Wallet],
            ['jimpitan', 'Catat jimpitan', HandCoins],
            ['kehadiran', 'Catat kehadiran', ClipboardCheck],
            ['laporan', 'Lihat laporan', ChartNoAxesCombined],
          ].map(([page, label, Icon]) => (
            <button key={page} onClick={() => go(page)}>
              <Icon />
              {label}
              <span>→</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

// ========================================
// TABEL DATA
// ========================================

function DataTable({ label, rows = [], columns, add }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>{label}</h3>
          <small>{safeRows.length} data · Google Sheets</small>
        </div>

        {add && (
          <button className="primary" onClick={add}>
            <Plus size={16} />
            Tambah
          </button>
        )}
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>
                  {column.replaceAll('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {safeRows.length ? (
              safeRows.map((row, index) => (
                <tr key={row.id || index}>
                  {columns.map((column) => (
                    <td key={column}>
                      {column === 'nominal'
                        ? rupiah(row[column])
                        : column === 'tanggal' ||
                            column === 'last_login'
                          ? tanggal(row[column])
                          : row[column] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty">
                  Belum ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ========================================
// PENGUMUMAN
// ========================================

function Announcements({ rows = [], add }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Pengumuman aktif</h3>
          <small>{safeRows.length} pengumuman</small>
        </div>

        {add && (
          <button className="primary" onClick={add}>
            <Plus size={16} />
            Buat pengumuman
          </button>
        )}
      </div>

      {safeRows.map((item, index) => (
        <article className="announce" key={item.id || index}>
          <small>
            {item.kategori || 'Umum'} ·{' '}
            {item.prioritas || 'Normal'} ·{' '}
            {tanggal(item.tanggal_mulai)}
          </small>

          <h3>{item.judul}</h3>
          <p>{item.isi}</p>
        </article>
      ))}

      {!safeRows.length && (
        <p className="empty">Belum ada pengumuman.</p>
      )}
    </section>
  );
}
function Notifications({ rows = [], onRead, add }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const unread = safeRows.filter(
    item => item.status === 'Belum Dibaca'
  ).length;

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Notifikasi Saya</h3>
          <small>
            {unread} belum dibaca · {safeRows.length} total
          </small>
        </div>
        {add && (
          <button className="primary" onClick={add}>
            <Plus size={16} />
            Kirim notifikasi
          </button>
        )}
      </div>

      {safeRows.length ? (
        safeRows.map((item, index) => {
          const isUnread = item.status === 'Belum Dibaca';

          return (
            <article
              className="announce"
              key={item.id || index}
              style={{
                background: isUnread ? '#f0f5ff' : '#fff',
                borderLeft: isUnread
                  ? '4px solid #2563eb'
                  : '4px solid #e5e7eb',
                marginBottom: 12
              }}
            >
              <small>
                {item.jenis || 'Umum'} ·{' '}
                {tanggal(item.waktu_kirim || item.jadwal_kirim)}
              </small>

              <h3>{item.judul}</h3>
              <p>{item.pesan}</p>

              {isUnread ? (
                <button
                  className="light"
                  onClick={() => onRead(item.id)}
                >
                  Tandai sudah dibaca
                </button>
              ) : (
                <small>✓ Sudah dibaca</small>
              )}
            </article>
          );
        })
      ) : (
        <p className="empty">Belum ada notifikasi.</p>
      )}
    </section>
  );
}
// ========================================
// LAPORAN
// ========================================

function Report({ d }) {
  return (
    <>
      <div className="stats three">
        <div className="stat">
          <small>Pemasukan</small>
          <strong>{rupiah(d?.pemasukan)}</strong>
        </div>

        <div className="stat">
          <small>Pengeluaran</small>
          <strong>{rupiah(d?.pengeluaran)}</strong>
        </div>

        <div className="stat">
          <small>Selisih</small>
          <strong>{rupiah(d?.selisih)}</strong>
        </div>
      </div>

      <DataTable
        label={`Rincian transaksi · ${d?.bulan || ''}`}
        rows={d?.transaksi || []}
        columns={[
          'tanggal',
          'jenis',
          'kategori',
          'keterangan',
          'nominal',
        ]}
      />
    </>
  );
}

// ========================================
// FORM MODAL
// ========================================

function FormModal({
  type,
  close,
  submit,
  token,
  user,
  busy,
}) {
  const defs = {
    warga: [
      'Tambah warga',
      'tambahWarga',
      [
        ['nama', 'Nama lengkap', 'text'],
        ['phone', 'Nomor HP', 'tel'],
        ['role', 'Peran', 'select', [
          'warga',
          'petugas',
          'bendahara',
        ]],
        ['pin', 'PIN 6–12 angka', 'password'],
      ],
    ],

    keuangan: [
      'Tambah transaksi',
      'simpanTransaksi',
      [
        ['jenis', 'Jenis', 'select', [
          'Pemasukan',
          'Pengeluaran',
        ]],
        ['kategori', 'Kategori', 'text'],
        ['nominal', 'Nominal', 'number'],
        ['keterangan', 'Keterangan', 'text'],
      ],
    ],

    jimpitan: [
      'Catat jimpitan',
      'simpanJimpitan',
      [
        ['petugas', 'Petugas', 'text'],
        ['nominal', 'Nominal', 'number'],
        ['keterangan', 'Keterangan', 'text'],
      ],
    ],

    kehadiran: [
      'Catat kehadiran',
      'simpanKehadiran',
      [
        ['nama', 'Nama warga', 'text'],
        ['status', 'Status', 'select', [
          'Hadir',
          'Izin',
          'Tidak Hadir',
        ]],
        ['catatan', 'Catatan', 'text'],
      ],
    ],

    notifikasi: [
      'Kirim notifikasi ke seluruh warga',
      'buatNotifikasi',
      [
        ['judul', 'Judul notifikasi', 'text'],
        ['pesan', 'Isi pesan', 'textarea'],
        ['jenis', 'Jenis notifikasi', 'select', [
          'Umum',
          'Kegiatan',
          'Keamanan',
          'Keuangan',
        ]],
      ],
    ],

    pengumuman: [
      'Buat pengumuman',
      'buatPengumuman',
      [
        ['judul', 'Judul', 'text'],
        ['isi', 'Isi pengumuman', 'textarea'],
        ['kategori', 'Kategori', 'select', [
          'Umum',
          'Kegiatan',
          'Keamanan',
          'Keuangan',
        ]],
        ['prioritas', 'Prioritas', 'select', [
          'Normal',
          'Penting',
          'Mendesak',
        ]],
        ['tanggal_mulai', 'Tanggal mulai', 'date'],
        ['tanggal_selesai', 'Tanggal selesai', 'date'],
      ],
    ],
  };

  const [heading, method, fields] = defs[type];

  const [values, setValues] = useState({
    petugas: user.nama,
  });

  function send(event) {
    event.preventDefault();

    const formData = { ...values };

    if (type === 'warga') {
      return submit(
        method,
        [
          token,
          formData.nama,
          formData.phone,
          formData.role,
          formData.pin,
        ],
        'Warga berhasil ditambahkan.'
      );
    }

    if (type === 'keuangan') {
      formData.nominal = Number(formData.nominal);
    }

    if (type === 'jimpitan') {
      formData.nominal = Number(formData.nominal || 0);
    }

    if (type === 'notifikasi') {
      return submit(
        method,
        [token, formData],
        'Notifikasi berhasil dikirim ke warga aktif.'
      );
    }

    if (type === 'kehadiran') {
      formData.tanggal = new Date()
        .toISOString()
        .slice(0, 10);

      formData.jenis_tugas = 'Ronda';
      formData.jadwal_id = '';
    }

    submit(
      method,
      [token, formData],
      'Data berhasil disimpan.'
    );
  }

  return (
    <div
      className="modal-bg"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <form className="modal" onSubmit={send}>
        <div className="panel-title">
          <h2>{heading}</h2>

          <button
            type="button"
            className="icon"
            onClick={close}
          >
            <X />
          </button>
        </div>

        {fields.map(([key, label, type, options]) => (
          <label key={key}>
            {label}

            {type === 'select' ? (
              <select
                required
                value={values[key] || ''}
                onChange={(event) =>
                  setValues({
                    ...values,
                    [key]: event.target.value,
                  })
                }
              >
                <option value="">Pilih...</option>

                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : type === 'textarea' ? (
              <textarea
                required
                value={values[key] || ''}
                onChange={(event) =>
                  setValues({
                    ...values,
                    [key]: event.target.value,
                  })
                }
              />
            ) : (
              <input
                required={
                  key !== 'catatan' &&
                  key !== 'tanggal_selesai'
                }
                type={type}
                min={type === 'number' ? 0 : undefined}
                value={values[key] || ''}
                onChange={(event) =>
                  setValues({
                    ...values,
                    [key]: event.target.value,
                  })
                }
              />
            )}
          </label>
        ))}

        <div className="modal-actions">
          <button
            type="button"
            className="light"
            onClick={close}
          >
            Batal
          </button>

          <button className="primary" disabled={busy}>
            {busy ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
