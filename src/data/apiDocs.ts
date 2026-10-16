// Katalog endpoint REST MedCredix untuk halaman Dokumentasi API (#/api-docs).
// Sumber kebenaran: backend Golang internal/router/router.go. Contoh respons diambil
// dari backend asli (data demo) dan disimpan di api-examples.json.
import examples from './api-examples.json'

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type ApiParam = {
  name: string
  in: 'query' | 'body' | 'form'
  type: string
  required?: boolean
  desc: string
  example?: string
  enum?: string[]
}

export type ApiEndpoint = {
  id: string
  group: string
  method: Method
  path: string
  title: string
  desc: string
  auth: boolean
  permission?: string
  params?: ApiParam[]
  body?: unknown
  multipart?: boolean
  response?: unknown
  responseNote?: string
  errors?: { status: number; when: string }[]
}

const EX = examples as Record<string, unknown>

// Warna per metode HTTP, dipakai badge sidebar, judul endpoint, dan cURL.
export const METHOD_STYLE: Record<Method, { badge: string; text: string; dot: string }> = {
  GET: { badge: 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  POST: { badge: 'bg-blue-500/15 text-blue-600 ring-blue-500/30 dark:text-blue-400', text: 'text-blue-400', dot: 'bg-blue-500' },
  PATCH: { badge: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-400', text: 'text-amber-400', dot: 'bg-amber-500' },
  PUT: { badge: 'bg-orange-500/15 text-orange-600 ring-orange-500/30 dark:text-orange-400', text: 'text-orange-400', dot: 'bg-orange-500' },
  DELETE: { badge: 'bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-400', text: 'text-rose-400', dot: 'bg-rose-500' },
}

const ERR401 = { status: 401, when: 'Token Bearer kosong, salah, kedaluwarsa, atau sudah logout.' }
const ERR403 = { status: 403, when: 'Peran pengguna tidak punya izin untuk aksi ini.' }
const ERR400 = { status: 400, when: 'Payload tidak valid atau field wajib kosong.' }
const ERR404 = { status: 404, when: 'Data dengan id tersebut tidak ditemukan di RS aktif.' }

const HOSPITAL: ApiParam = {
  name: 'hospitalId', in: 'query', type: 'string',
  desc: 'RS yang dibuka. Hanya untuk Super Admin dan Auditor; peran lain otomatis memakai RS miliknya.',
  example: 'h_nusantara',
}
const Q: ApiParam = { name: 'q', in: 'query', type: 'string', desc: 'Kata kunci pencarian (nama, nomor, judul).' }

export const API_GROUPS = [
  'Autentikasi', 'Umum', 'Dashboard & Skor', 'Risiko & Peringatan', 'Aksi', 'Kredensialing',
  'Klaim', 'Klinis', 'Data', 'Bukti & Kepatuhan', 'Laporan', 'Pengaturan',
]

export const ENDPOINTS: ApiEndpoint[] = [
  // ── Autentikasi ──
  {
    id: 'login', group: 'Autentikasi', method: 'POST', path: '/auth', title: 'Login',
    desc: 'Tukar email dan kata sandi dengan token JWT. Email harus sama persis dengan yang terdaftar (huruf besar/kecil dibedakan). Simpan `data.token` lalu kirim sebagai header `Authorization: Bearer <token>` di semua endpoint lain.',
    auth: false,
    params: [
      { name: 'email', in: 'body', type: 'string', required: true, desc: 'Email akun.', example: 'admin@nusantarasehat.co.id' },
      { name: 'password', in: 'body', type: 'string', required: true, desc: 'Kata sandi akun.', example: 'kata-sandi-anda' },
    ],
    body: { email: 'admin@nusantarasehat.co.id', password: 'kata-sandi-anda' },
    response: EX['POST /api/auth'],
    errors: [
      { status: 401, when: 'Email atau kata sandi salah. Respons: ' + JSON.stringify(EX['ERR_LOGIN']) },
      { status: 429, when: 'Terlalu banyak percobaan login untuk email dan IP yang sama.' },
    ],
  },
  {
    id: 'logout', group: 'Autentikasi', method: 'POST', path: '/auth/logout', title: 'Logout',
    desc: 'Mencabut token yang sedang dipakai. Setelah ini token tidak bisa dipakai lagi walau belum kedaluwarsa.',
    auth: true, response: EX['POST /api/auth/logout'], errors: [ERR401],
  },

  // ── Umum ──
  {
    id: 'health', group: 'Umum', method: 'GET', path: '/health', title: 'Cek status server',
    desc: 'Mengecek apakah backend hidup. Tidak butuh token, cocok untuk health check Docker atau load balancer.',
    auth: false, response: EX['GET /api/health'],
  },
  {
    id: 'bootstrap', group: 'Umum', method: 'GET', path: '/bootstrap', title: 'Data awal aplikasi',
    desc: 'Profil RS aktif, daftar RS (untuk Super Admin), badge menu, aturan peringatan, dan notifikasi. Dipanggil sekali setelah login.',
    auth: true, permission: 'VIEW', params: [HOSPITAL], response: EX['GET /api/bootstrap'], errors: [ERR401],
  },
  {
    id: 'search', group: 'Umum', method: 'GET', path: '/search', title: 'Pencarian global',
    desc: 'Cari praktisi, kredensial, risiko, aksi, dan klaim sekaligus (dipakai kotak Ctrl+K).',
    auth: true, permission: 'VIEW',
    params: [{ ...Q, required: true, example: 'dr' }, HOSPITAL],
    response: EX['GET /api/search'], errors: [ERR401],
  },
  {
    id: 'admin', group: 'Umum', method: 'GET', path: '/admin', title: 'Panel admin lintas RS',
    desc: 'Ringkasan semua RS. Hanya Super Admin dan Auditor BPJS; peran lain mendapat 403 seperti contoh di bawah.',
    auth: true, permission: 'VIEW (Super Admin / Auditor)', response: EX['GET /api/admin'],
    responseNote: 'Contoh ini respons 403 untuk peran Admin RS.',
    errors: [ERR401, ERR403],
  },

  // ── Dashboard & Skor ──
  {
    id: 'dashboard', group: 'Dashboard & Skor', method: 'GET', path: '/dashboard', title: 'Dashboard',
    desc: 'Hospital Health Score, BCDS, skor per domain, KPI, tren, dan daftar prioritas.',
    auth: true, permission: 'VIEW', params: [HOSPITAL], response: EX['GET /api/dashboard'], errors: [ERR401],
  },
  {
    id: 'scores', group: 'Dashboard & Skor', method: 'GET', path: '/scores', title: 'Rincian skor (Mengapa skor ini?)',
    desc: 'Rincian perhitungan skor: komponen, bobot, dan bukti. Tanpa `domain` mengembalikan semua skor.',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'domain', in: 'query', type: 'string', desc: '`health`, `bcds`, atau kunci domain dari dashboard.', example: 'health' },
      HOSPITAL,
    ],
    response: EX['GET /api/scores'], errors: [ERR401],
  },
  {
    id: 'score-snapshot', group: 'Dashboard & Skor', method: 'POST', path: '/scores/snapshot', title: 'Simpan snapshot skor',
    desc: 'Membekukan skor bulan tertentu agar tren bulanan tidak berubah.',
    auth: true, permission: 'CONFIGURE',
    params: [{ name: 'period', in: 'body', type: 'string', required: true, desc: 'Periode format YYYY-MM.', example: '2026-10' }, HOSPITAL],
    body: { period: '2026-10' },
    response: EX['POST /api/scores/snapshot'], errors: [ERR400, ERR401, ERR403],
  },

  // ── Risiko & Peringatan ──
  {
    id: 'risks', group: 'Risiko & Peringatan', method: 'GET', path: '/risks', title: 'Daftar risiko',
    desc: 'Risk Radar: daftar risiko beserta skor, pemilik, dan tenggat.',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'category', in: 'query', type: 'string', desc: 'Kategori risiko.' },
      { name: 'level', in: 'query', type: 'string', desc: 'Tingkat risiko.', enum: ['Kritis', 'Tinggi', 'Sedang', 'Rendah'] },
      { name: 'status', in: 'query', type: 'string', desc: 'Status risiko.', enum: ['baru', 'terbuka', 'ditinjau', 'dalam_pengerjaan', 'terkelola', 'teratasi', 'selesai', 'ditutup'] },
      HOSPITAL,
    ],
    response: EX['GET /api/risks'], errors: [ERR401],
  },
  {
    id: 'risks-patch', group: 'Risiko & Peringatan', method: 'PATCH', path: '/risks', title: 'Ubah risiko',
    desc: 'Akui (`ack`), tugaskan (`assign`), atau ubah status (`status`) risiko. Menutup risiko butuh izin RESOLVE.',
    auth: true, permission: 'EDIT / ASSIGN / RESOLVE',
    params: [
      { name: 'id', in: 'body', type: 'string', required: true, desc: 'Id risiko.' },
      { name: 'action', in: 'body', type: 'string', required: true, desc: 'Jenis perubahan.', enum: ['ack', 'assign', 'status'] },
      { name: 'status', in: 'body', type: 'string', desc: 'Status baru (untuk action `status`).', enum: ['baru', 'terbuka', 'ditinjau', 'dalam_pengerjaan', 'terkelola', 'teratasi', 'selesai', 'ditutup'] },
      { name: 'owner', in: 'body', type: 'string', desc: 'Penanggung jawab (untuk `assign`).' },
      { name: 'deadline', in: 'body', type: 'string (YYYY-MM-DD)', desc: 'Tenggat (untuk `assign`).' },
      HOSPITAL,
    ],
    body: { id: 'rsk_ns_001', action: 'status', status: 'ditinjau' },
    response: EX['PATCH /api/risks'], errors: [ERR400, ERR401, ERR403, ERR404],
  },
  {
    id: 'warnings', group: 'Risiko & Peringatan', method: 'GET', path: '/warnings', title: 'Early warning',
    desc: 'Peringatan dini yang dipicu aturan peringatan (kredensial hampir habis, klaim janggal, dsb).',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'severity', in: 'query', type: 'string', desc: 'Tingkat keparahan.', enum: ['Kritis', 'Tinggi', 'Sedang', 'Rendah'] },
      { name: 'status', in: 'query', type: 'string', desc: 'Status peringatan.' },
      HOSPITAL,
    ],
    response: EX['GET /api/warnings'], errors: [ERR401],
  },
  {
    id: 'warnings-patch', group: 'Risiko & Peringatan', method: 'PATCH', path: '/warnings', title: 'Ubah peringatan',
    desc: 'Akui, tugaskan, atau selesaikan peringatan.',
    auth: true, permission: 'ASSIGN / RESOLVE',
    params: [
      { name: 'id', in: 'body', type: 'string', required: true, desc: 'Id peringatan.' },
      { name: 'action', in: 'body', type: 'string', required: true, desc: 'Jenis perubahan.', enum: ['ack', 'assign', 'resolve'] },
      { name: 'assignee', in: 'body', type: 'string', desc: 'Penanggung jawab (untuk `assign`).' },
      { name: 'dueDate', in: 'body', type: 'string (YYYY-MM-DD)', desc: 'Tenggat (untuk `assign`).' },
      HOSPITAL,
    ],
    body: { id: 'ew_ns_005', action: 'ack' },
    response: EX['PATCH /api/warnings'], errors: [ERR400, ERR401, ERR403, ERR404],
  },

  // ── Aksi ──
  {
    id: 'actions', group: 'Aksi', method: 'GET', path: '/actions', title: 'Daftar aksi',
    desc: 'Action Center: tindak lanjut dari risiko, peringatan, dan temuan. Kirim `id` untuk detail satu aksi beserta riwayatnya.',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'id', in: 'query', type: 'string', desc: 'Id aksi untuk detail.' },
      { name: 'priority', in: 'query', type: 'string', desc: 'Prioritas.', enum: ['Kritis', 'Tinggi', 'Sedang', 'Rendah'] },
      { name: 'status', in: 'query', type: 'string', desc: 'Status aksi.', enum: ['baru', 'ditugaskan', 'dalam_pengerjaan', 'menunggu_verifikasi', 'selesai', 'ditutup', 'ditolak', 'dibuka_kembali'] },
      Q, HOSPITAL,
    ],
    response: EX['GET /api/actions'], errors: [ERR401],
  },
  {
    id: 'actions-post', group: 'Aksi', method: 'POST', path: '/actions', title: 'Buat aksi',
    desc: 'Membuat aksi baru, bisa dikaitkan ke risiko, peringatan, atau temuan lain lewat `sourceType` dan `sourceRef`.',
    auth: true, permission: 'CREATE',
    params: [
      { name: 'title', in: 'body', type: 'string', required: true, desc: 'Judul aksi.' },
      { name: 'description', in: 'body', type: 'string', desc: 'Uraian.' },
      { name: 'priority', in: 'body', type: 'string', desc: 'Prioritas.', enum: ['Kritis', 'Tinggi', 'Sedang', 'Rendah'] },
      { name: 'sourceType', in: 'body', type: 'string', desc: 'Asal aksi, misalnya `risk` atau `warning`.' },
      { name: 'sourceRef', in: 'body', type: 'string', desc: 'Id data asal.' },
      { name: 'owner', in: 'body', type: 'string', desc: 'Penanggung jawab.' },
      { name: 'dueDate', in: 'body', type: 'string (YYYY-MM-DD)', desc: 'Tenggat.' },
      { name: 'expectedOutcome', in: 'body', type: 'string', desc: 'Hasil yang diharapkan.' },
      HOSPITAL,
    ],
    body: { title: 'Perpanjang STR dr. Budi', description: 'STR habis bulan depan', priority: 'Tinggi', owner: 'Bagian SDM', dueDate: '2026-11-01', expectedOutcome: 'STR baru terunggah' },
    response: EX['POST /api/actions'], errors: [ERR400, ERR401, ERR403],
  },
  {
    id: 'actions-patch', group: 'Aksi', method: 'PATCH', path: '/actions', title: 'Ubah aksi',
    desc: 'Tugaskan, beri komentar, atau ubah status aksi. Tiap perpindahan status punya izin sendiri (misal `selesai` butuh RESOLVE, `dibuka_kembali` butuh REOPEN).',
    auth: true, permission: 'ASSIGN / EDIT / RESOLVE / REOPEN',
    params: [
      { name: 'id', in: 'body', type: 'string', required: true, desc: 'Id aksi.' },
      { name: 'action', in: 'body', type: 'string', required: true, desc: 'Jenis perubahan.', enum: ['assign', 'comment', 'status'] },
      { name: 'owner', in: 'body', type: 'string', desc: 'Penanggung jawab (untuk `assign`).' },
      { name: 'dueDate', in: 'body', type: 'string (YYYY-MM-DD)', desc: 'Tenggat (untuk `assign`).' },
      { name: 'status', in: 'body', type: 'string', desc: 'Status baru (untuk `status`).', enum: ['dalam_pengerjaan', 'menunggu_verifikasi', 'selesai', 'ditutup', 'ditolak', 'dibuka_kembali', 'ditugaskan'] },
      { name: 'note', in: 'body', type: 'string', desc: 'Komentar (untuk `comment`).' },
      { name: 'resolutionNote', in: 'body', type: 'string', desc: 'Catatan penyelesaian.' },
      HOSPITAL,
    ],
    body: { id: 'act_xxx', action: 'comment', note: 'Sudah dihubungi bagian SDM' },
    response: EX['PATCH /api/actions'], errors: [ERR400, ERR401, ERR403, ERR404],
  },

  // ── Kredensialing ──
  {
    id: 'practitioners', group: 'Kredensialing', method: 'GET', path: '/practitioners', title: 'Daftar praktisi',
    desc: 'Dokter, perawat, dan tenaga kesehatan lain beserta status STR/SIP. Kirim `id` untuk profil lengkap.',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'id', in: 'query', type: 'string', desc: 'Id praktisi untuk detail.' },
      { name: 'dept', in: 'query', type: 'string', desc: 'Departemen.' },
      { name: 'prof', in: 'query', type: 'string', desc: 'Profesi.' },
      { name: 'status', in: 'query', type: 'string', desc: 'Status praktisi.' },
      Q, HOSPITAL,
    ],
    response: EX['GET /api/practitioners'], errors: [ERR401],
  },
  {
    id: 'credentials', group: 'Kredensialing', method: 'GET', path: '/credentials', title: 'Daftar kredensial',
    desc: 'STR, SIP, dan kewenangan klinis beserta masa berlaku.',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'status', in: 'query', type: 'string', desc: 'Status kredensial.', enum: ['aktif', 'segera_berakhir', 'kedaluwarsa', 'diajukan', 'verifikasi', 'tinjauan_komite', 'disetujui', 'ditangguhkan'] },
      { name: 'type', in: 'query', type: 'string', desc: 'Jenis kredensial (STR, SIP, dsb).' },
      Q, HOSPITAL,
    ],
    response: EX['GET /api/credentials'], errors: [ERR401],
  },
  {
    id: 'credentials-patch', group: 'Kredensialing', method: 'PATCH', path: '/credentials', title: 'Alur kredensial',
    desc: 'Menggerakkan kredensial di alur: ajukan → verifikasi → komite → setujui → aktifkan. Status asal harus sesuai, kalau tidak dibalas 400.',
    auth: true, permission: 'EDIT / VERIFY / APPROVE',
    params: [
      { name: 'id', in: 'body', type: 'string', required: true, desc: 'Id kredensial.' },
      { name: 'action', in: 'body', type: 'string', required: true, desc: 'Langkah alur.', enum: ['submit', 'verify', 'review', 'approve', 'activate', 'suspend', 'reactivate', 'reject'] },
      HOSPITAL,
    ],
    body: { id: 'c_pns05_sip', action: 'submit' },
    errors: [ERR400, ERR401, ERR403, ERR404],
  },
  {
    id: 'requirements', group: 'Kredensialing', method: 'GET', path: '/requirements', title: 'Prasyarat RS',
    desc: 'Dokumen prasyarat rumah sakit (izin operasional, akreditasi, dsb) dan statusnya.',
    auth: true, permission: 'VIEW', params: [HOSPITAL], response: EX['GET /api/requirements'], errors: [ERR401],
  },
  {
    id: 'requirements-patch', group: 'Kredensialing', method: 'PATCH', path: '/requirements', title: 'Ubah prasyarat',
    desc: 'Ajukan, verifikasi, batalkan, atau perbarui data dokumen prasyarat. `verify` dan `invalidate` butuh izin VERIFY.',
    auth: true, permission: 'EDIT / VERIFY',
    params: [
      { name: 'id', in: 'body', type: 'string', required: true, desc: 'Id prasyarat.' },
      { name: 'action', in: 'body', type: 'string', required: true, desc: 'Jenis perubahan.', enum: ['submit', 'verify', 'invalidate', 'update'] },
      { name: 'docNumber', in: 'body', type: 'string', desc: 'Nomor dokumen.' },
      { name: 'issuedAt', in: 'body', type: 'string (YYYY-MM-DD)', desc: 'Tanggal terbit.' },
      { name: 'docExpiry', in: 'body', type: 'string (YYYY-MM-DD)', desc: 'Tanggal berakhir.' },
      { name: 'fileName', in: 'body', type: 'string', desc: 'Nama file.' },
      { name: 'notes', in: 'body', type: 'string', desc: 'Catatan.' },
      HOSPITAL,
    ],
    body: { id: 'rq_xxx', action: 'update', docNumber: '445/123/2026', issuedAt: '2026-01-10', docExpiry: '2031-01-10' },
    errors: [ERR400, ERR401, ERR403, ERR404],
  },
  {
    id: 'requirements-upload', group: 'Kredensialing', method: 'POST', path: '/requirements/upload', title: 'Unggah file prasyarat',
    desc: 'Unggah file dokumen prasyarat (PDF/gambar) dengan `multipart/form-data`.',
    auth: true, permission: 'EDIT', multipart: true,
    params: [
      { name: 'file', in: 'form', type: 'file', required: true, desc: 'File dokumen.' },
      { name: 'id', in: 'form', type: 'string', required: true, desc: 'Id prasyarat.' },
      { name: 'docNumber', in: 'form', type: 'string', desc: 'Nomor dokumen.' },
      { name: 'issuedAt', in: 'form', type: 'string (YYYY-MM-DD)', desc: 'Tanggal terbit.' },
      { name: 'docExpiry', in: 'form', type: 'string (YYYY-MM-DD)', desc: 'Tanggal berakhir.' },
      HOSPITAL,
    ],
    errors: [ERR400, ERR401, ERR403, ERR404],
  },
  {
    id: 'requirements-file', group: 'Kredensialing', method: 'GET', path: '/requirements/file', title: 'Unduh file prasyarat',
    desc: 'Mengembalikan file asli (bukan JSON).',
    auth: true, permission: 'VIEW',
    params: [{ name: 'id', in: 'query', type: 'string', required: true, desc: 'Id prasyarat.' }, HOSPITAL],
    responseNote: 'Respons berupa file biner dengan Content-Type sesuai file.',
    errors: [ERR401, ERR404],
  },
  {
    id: 'documents', group: 'Kredensialing', method: 'GET', path: '/documents', title: 'Dokumen kredensial',
    desc: 'Dokumen pendukung kredensial yang sudah diunggah.',
    auth: true, permission: 'VIEW', params: [HOSPITAL], response: EX['GET /api/documents'], errors: [ERR401],
  },
  {
    id: 'documents-upload', group: 'Kredensialing', method: 'POST', path: '/documents/upload', title: 'Unggah dokumen kredensial',
    desc: 'Unggah dokumen pendukung kredensial dengan `multipart/form-data`.',
    auth: true, permission: 'EDIT', multipart: true,
    params: [
      { name: 'file', in: 'form', type: 'file', required: true, desc: 'File dokumen.' },
      { name: 'credentialId', in: 'form', type: 'string', required: true, desc: 'Id kredensial.' },
      HOSPITAL,
    ],
    errors: [ERR400, ERR401, ERR403, ERR404],
  },
  {
    id: 'documents-file', group: 'Kredensialing', method: 'GET', path: '/documents/file', title: 'Unduh dokumen kredensial',
    desc: 'Mengembalikan file asli (bukan JSON).',
    auth: true, permission: 'VIEW',
    params: [{ name: 'id', in: 'query', type: 'string', required: true, desc: 'Id dokumen.' }, HOSPITAL],
    responseNote: 'Respons berupa file biner dengan Content-Type sesuai file.',
    errors: [ERR401, ERR404],
  },

  // ── Klaim ──
  {
    id: 'claims', group: 'Klaim', method: 'GET', path: '/claims', title: 'Klaim & anomali',
    desc: 'Klaim BPJS beserta anomali yang terdeteksi. Kirim `id` untuk detail klaim.',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'id', in: 'query', type: 'string', desc: 'Id klaim untuk detail.' },
      { name: 'careType', in: 'query', type: 'string', desc: 'Jenis rawat.', enum: ['Rawat Inap', 'Rawat Jalan'] },
      { name: 'status', in: 'query', type: 'string', desc: 'Status klaim.', enum: ['diajukan', 'diverifikasi', 'disetujui', 'ditunda', 'ditolak'] },
      Q, HOSPITAL,
    ],
    response: EX['GET /api/claims'], errors: [ERR401],
  },
  {
    id: 'claims-patch', group: 'Klaim', method: 'PATCH', path: '/claims', title: 'Tindak lanjut klaim',
    desc: 'Dua bentuk: kirim `anomalyId` + `action` untuk menindak anomali, atau `claimId` + `status` untuk mengubah status klaim.',
    auth: true, permission: 'EDIT',
    params: [
      { name: 'anomalyId', in: 'body', type: 'string', desc: 'Id anomali (bentuk pertama).' },
      { name: 'action', in: 'body', type: 'string', desc: 'Tindakan anomali.', enum: ['review', 'confirm', 'clarify'] },
      { name: 'claimId', in: 'body', type: 'string', desc: 'Id klaim (bentuk kedua).' },
      { name: 'status', in: 'body', type: 'string', desc: 'Status klaim baru.', enum: ['diverifikasi', 'disetujui', 'ditunda', 'ditolak'] },
      HOSPITAL,
    ],
    body: { anomalyId: 'an_xxx', action: 'review' },
    errors: [ERR400, ERR401, ERR403, ERR404],
  },

  // ── Klinis ──
  {
    id: 'clinical', group: 'Klinis', method: 'GET', path: '/clinical', title: 'Data klinis',
    desc: 'Clinical pathway, utilisasi layanan, atau keselamatan pasien (agregat, tanpa data pasien).',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'type', in: 'query', type: 'string', required: true, desc: 'Jenis data.', enum: ['pathway', 'utilization', 'safety'], example: 'pathway' },
      HOSPITAL,
    ],
    response: EX['GET /api/clinical'], errors: [ERR401],
  },

  // ── Data ──
  {
    id: 'data', group: 'Data', method: 'GET', path: '/data', title: 'Kualitas & sumber data',
    desc: 'Kualitas data, tingkat kepercayaan data, dan status koneksi sumber data (SIMRS, SATUSEHAT, BPJS).',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'type', in: 'query', type: 'string', desc: 'Bagian data.', enum: ['all', 'quality', 'trust', 'sources'], example: 'all' },
      HOSPITAL,
    ],
    response: EX['GET /api/data'], errors: [ERR401],
  },
  {
    id: 'data-post', group: 'Data', method: 'POST', path: '/data', title: 'Tes koneksi sumber data',
    desc: 'Mengetes koneksi ke sumber data yang dikonfigurasi.',
    auth: true, permission: 'CONFIGURE',
    params: [{ name: 'action', in: 'body', type: 'string', required: true, desc: 'Selalu `test-connection`.', enum: ['test-connection'] }, HOSPITAL],
    body: { action: 'test-connection' },
    response: EX['POST /api/data'], errors: [ERR400, ERR401, ERR403],
  },

  // ── Bukti & Kepatuhan ──
  {
    id: 'evidence', group: 'Bukti & Kepatuhan', method: 'GET', path: '/evidence', title: 'Evidence vault',
    desc: 'Bukti pendukung skor dan temuan. Filter `refType` + `refId` untuk bukti satu data.',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'refType', in: 'query', type: 'string', desc: 'Jenis data rujukan.' },
      { name: 'refId', in: 'query', type: 'string', desc: 'Id data rujukan.' },
      Q, HOSPITAL,
    ],
    response: EX['GET /api/evidence'], errors: [ERR401],
  },
  {
    id: 'compliance', group: 'Bukti & Kepatuhan', method: 'GET', path: '/compliance', title: 'Kepatuhan regulasi',
    desc: 'Status kepatuhan terhadap standar dan regulasi.',
    auth: true, permission: 'VIEW', params: [HOSPITAL], response: EX['GET /api/compliance'], errors: [ERR401],
  },
  {
    id: 'audit', group: 'Bukti & Kepatuhan', method: 'GET', path: '/audit', title: 'Audit trail',
    desc: 'Catatan siapa mengubah apa dan kapan. Tidak bisa diubah atau dihapus.',
    auth: true, permission: 'VIEW',
    params: [
      { name: 'action', in: 'query', type: 'string', desc: 'Jenis aksi.' },
      { name: 'entityType', in: 'query', type: 'string', desc: 'Jenis data.' },
      Q, HOSPITAL,
    ],
    response: EX['GET /api/audit'], errors: [ERR401],
  },

  // ── Laporan ──
  {
    id: 'reports', group: 'Laporan', method: 'GET', path: '/reports', title: 'Daftar laporan',
    desc: 'Riwayat laporan. Kirim `id` untuk detail, atau `export=<id>` untuk mengunduh CSV (butuh izin EXPORT).',
    auth: true, permission: 'VIEW / EXPORT',
    params: [
      { name: 'id', in: 'query', type: 'string', desc: 'Id laporan untuk detail.' },
      { name: 'export', in: 'query', type: 'string', desc: 'Id laporan untuk diunduh sebagai CSV.' },
      HOSPITAL,
    ],
    response: EX['GET /api/reports'], errors: [ERR401, ERR403, ERR404],
  },
  {
    id: 'reports-post', group: 'Laporan', method: 'POST', path: '/reports', title: 'Buat laporan',
    desc: 'Membuat snapshot laporan dari data saat ini.',
    auth: true, permission: 'CREATE',
    params: [
      { name: 'type', in: 'body', type: 'string', required: true, desc: 'Jenis laporan.', enum: ['kredensial', 'kesehatan-rs', 'risiko', 'aksi', 'kepatuhan', 'klaim'] },
      HOSPITAL,
    ],
    body: { type: 'kredensial' },
    response: EX['POST /api/reports'], errors: [ERR400, ERR401, ERR403],
  },

  // ── Pengaturan ──
  {
    id: 'settings', group: 'Pengaturan', method: 'GET', path: '/settings', title: 'Pengaturan',
    desc: 'Profil RS, pengguna, dan aturan peringatan.',
    auth: true, permission: 'VIEW', params: [HOSPITAL], response: EX['GET /api/settings'], errors: [ERR401],
  },
  {
    id: 'settings-patch', group: 'Pengaturan', method: 'PATCH', path: '/settings', title: 'Ubah pengaturan',
    desc: 'Ubah profil RS (`target: hospital`) atau nyalakan/matikan aturan peringatan (`target: alert-rule`).',
    auth: true, permission: 'CONFIGURE',
    params: [
      { name: 'target', in: 'body', type: 'string', required: true, desc: 'Yang diubah.', enum: ['hospital', 'alert-rule'] },
      { name: 'id', in: 'body', type: 'string', desc: 'Id aturan peringatan (untuk `alert-rule`).' },
      { name: 'active', in: 'body', type: 'boolean', desc: 'Aktif/nonaktif aturan.' },
      { name: 'name', in: 'body', type: 'string', desc: 'Nama RS.' },
      { name: 'class', in: 'body', type: 'string', desc: 'Kelas RS (A/B/C/D).' },
      { name: 'city', in: 'body', type: 'string', desc: 'Kota.' },
      { name: 'province', in: 'body', type: 'string', desc: 'Provinsi.' },
      { name: 'bedLicensed', in: 'body', type: 'number', desc: 'Jumlah tempat tidur berizin.' },
      { name: 'bpjsFacilityCode', in: 'body', type: 'string', desc: 'Kode faskes BPJS.' },
      { name: 'satusehatOrgId', in: 'body', type: 'string', desc: 'Organization ID SATUSEHAT.' },
      HOSPITAL,
    ],
    body: { target: 'alert-rule', id: 'ar_ns_04', active: true },
    errors: [ERR400, ERR401, ERR403, ERR404],
  },
]

export const ERROR_401_EXAMPLE = EX['ERR401']
export const LOGIN_ERROR_EXAMPLE = EX['ERR_LOGIN']
