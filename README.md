# MedCredix Web

Frontend **MedCredix** (Medical Credentialing Intelligence) by SPKD. Aplikasi ini adalah tampilan untuk:

- memantau skor kesiapan rumah sakit (Hospital Health Score, BDCS, Data Trust);
- mengelola kredensial tenaga medis, prasyarat, risiko, early warning dan aksi perbaikan;
- meninjau klaim BPJS, bukti, audit trail dan laporan.

Semua data diambil dari backend Golang: [backend-spkd-medcredix-golang](https://github.com/official-spkd/backend-spkd-medcredix-golang). Frontend ini **tidak menyimpan data sendiri**, jadi backend harus jalan dulu.

---

## Daftar Isi

1. [Teknologi](#teknologi)
2. [Struktur Folder](#struktur-folder)
3. [Prasyarat (Windows & macOS)](#prasyarat)
4. [Mulai Cepat](#mulai-cepat)
5. [Instalasi](#instalasi)
6. [Menghubungkan ke Backend](#menghubungkan-ke-backend)
7. [Konfigurasi Environment](#konfigurasi-environment)
8. [Perintah npm](#perintah-npm)
9. [Akun Demo](#akun-demo)
10. [Mode Demo (tanpa backend)](#mode-demo-tanpa-backend)
11. [Build & Deploy Produksi](#build--deploy-produksi)
12. [Troubleshooting](#troubleshooting)

---

## Teknologi

| Komponen | Versi | Keterangan |
|---|---|---|
| Node.js | 20.19+ atau 22.12+ | Runtime untuk menjalankan Vite |
| Vue | 3.5 | Framework UI (Composition API, `<script setup>`) |
| Vite | 7 | Dev server & build tool |
| TypeScript | 5.9 | Bahasa utama |
| Pinia | 3 | State management (sesi login, RS aktif) |
| Tailwind CSS | 4 | Styling |
| Chart.js + vue-chartjs | 4.5 / 5.3 | Grafik dashboard |
| lucide-vue-next | 0.545 | Ikon |
| @vueuse/core | 13 | Utilitas Vue |

Vue, Vite, Tailwind dan library lain **tidak perlu di-install satu per satu**. Semuanya terdaftar di `package.json` dan otomatis terpasang lewat `npm install`.

---

## Struktur Folder

```
frontend-spkd-medcredix-vue-sudah-terhubung/
├── public/fonts/               # font Poppins & Open Sans (lokal, tanpa CDN)
├── src/
│   ├── main.ts                 # titik masuk aplikasi
│   ├── App.vue                 # boot sesi, router berbasis hash, 29 halaman
│   ├── assets/css/main.css     # Tailwind + tema warna
│   ├── components/
│   │   ├── views/              # satu file per halaman (Dashboard, Kredensial, Aksi, ...)
│   │   ├── medcredix/          # komponen khusus MedCredix (login, sidebar, grafik, drawer)
│   │   └── ui/                 # komponen dasar (Button, Card, Dialog, Select, ...)
│   ├── composables/
│   │   └── useApi.ts           # klien API ke backend Golang (token JWT, RS aktif)
│   ├── stores/medcredix.ts     # store Pinia: user, token, RS aktif
│   ├── utils/                  # format angka/tanggal, menu navigasi, API demo
│   └── data/demo-db.json       # data untuk mode demo
├── index.html
├── vite.config.ts              # port 3000 + proxy /api ke backend
├── package.json / package-lock.json
└── tsconfig.json
```

---

## Prasyarat

Butuh tiga aplikasi: **Node.js** (sudah termasuk npm), **Git**, dan **code editor** (disarankan VS Code). Backend juga harus sudah terpasang, ikuti README di repo backend.

<details open>
<summary><b>🪟 Windows</b></summary>

<br>

**1. Node.js**

1. Buka <https://nodejs.org/>, unduh versi **LTS** (installer `.msi`).
2. Jalankan installer dengan pilihan default. npm ikut ter-install otomatis.
3. Buka **PowerShell baru**, lalu cek:
   ```powershell
   node -v
   npm -v
   ```
   `node -v` harus `v20.19` ke atas atau `v22.12` ke atas.

**2. Git**

Unduh di <https://git-scm.com/download/win>, lalu install dengan pilihan default.

**3. VS Code** (disarankan)

Unduh di <https://code.visualstudio.com/>. Setelah terpasang, install extension **Vue - Official** (Vue.volar) supaya file `.vue` terbaca dengan benar.

> **Alternatif cepat:** semuanya bisa di-install lewat `winget`:
> ```powershell
> winget install OpenJS.NodeJS.LTS Git.Git Microsoft.VisualStudioCode
> ```

> **Catatan PowerShell:** kalau muncul error `running scripts is disabled on this system` saat menjalankan `npm`, jalankan sekali:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

</details>

<details open>
<summary><b>🍎 macOS</b></summary>

<br>

Panduan ini memakai **Homebrew**. Bila belum punya, install dulu:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**1. Node.js**

```bash
brew install node@22
echo 'export PATH="$(brew --prefix node@22)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
node -v
npm -v
```

> Bisa juga pakai installer `.pkg` dari <https://nodejs.org/> (pilih versi LTS).

**2. Git**

Git biasanya sudah tersedia. Cek dengan `git --version`. Bila belum ada:

```bash
brew install git
```

**3. VS Code** (disarankan)

```bash
brew install --cask visual-studio-code
```

Lalu install extension **Vue - Official** (Vue.volar).

</details>

---

## Mulai Cepat

Backend sudah jalan di `http://localhost:8080`? Cukup tiga perintah:

```bash
git clone https://github.com/official-spkd/frontend-spkd-medcredix-vue-sudah-terhubung.git
cd frontend-spkd-medcredix-vue-sudah-terhubung
npm install
npm run dev
```

Buka <http://localhost:3000>, lalu login dengan salah satu [akun demo](#akun-demo).

Penjelasan lengkap tiap langkah ada di bawah.

---

## Instalasi

### 1. Clone repository

```bash
git clone https://github.com/official-spkd/frontend-spkd-medcredix-vue-sudah-terhubung.git
cd frontend-spkd-medcredix-vue-sudah-terhubung
```

### 2. Install dependency

```bash
npm install
```

Perintah ini membaca `package.json` dan mengunduh Vue, Vite, Pinia, Tailwind dan library lain ke folder `node_modules`. Cukup dilakukan sekali, atau setiap kali `package.json` berubah.

> Folder `node_modules` **tidak ikut di-push** ke GitHub (sudah ada di `.gitignore`). Setiap orang yang clone harus menjalankan `npm install` sendiri.

### 3. Jalankan

```bash
npm run dev
```

Kalau berhasil, muncul:

```
VITE v7.x  ready in ... ms

➜  Local:   http://localhost:3000/
```

---

## Menghubungkan ke Backend

Frontend dan backend berjalan sebagai dua aplikasi terpisah:

| Aplikasi | Alamat | Cara menjalankan |
|---|---|---|
| Backend Golang | `http://localhost:8080` | `go run ./cmd/server` di folder backend |
| Frontend Vue | `http://localhost:3000` | `npm run dev` di folder frontend |

### Cara kerjanya

Frontend selalu memanggil API lewat alamat relatif `/api/...`. Server dev Vite (lihat `vite.config.ts`) meneruskan semua request `/api` ke backend:

```
Browser  ──►  localhost:3000/api/...  ──(proxy Vite)──►  localhost:8080/api/...
```

Karena browser hanya bicara dengan `localhost:3000`, **tidak ada masalah CORS** saat development.

Setelah login, backend mengirim **token JWT**. Token disimpan di browser dan otomatis dikirim di setiap request sebagai header `Authorization: Bearer <token>`. Bila token kedaluwarsa, aplikasi kembali ke halaman login.

### Langkah menyambungkan

1. **Jalankan PostgreSQL** (biasanya sudah otomatis jalan setelah install).
2. **Jalankan backend.** Di terminal pertama, dari folder backend:
   ```bash
   go run ./cmd/server
   ```
   Tunggu sampai muncul `MedCredix API jalan di :8080`.
3. **Cek backend bisa diakses:**
   ```bash
   curl http://localhost:8080/api/health
   ```
   Harus keluar `{"data":{"status":"up"},"ok":true}`. Di Windows PowerShell bisa pakai `curl.exe` atau buka alamat itu di browser.
4. **Jalankan frontend.** Di terminal kedua, dari folder frontend:
   ```bash
   npm run dev
   ```
5. Buka <http://localhost:3000> dan login.

Di VS Code, dua terminal bisa dibuka berdampingan lewat tombol **Split Terminal**.

### Backend tidak di port 8080?

Buat file `.env.local` di folder frontend (lihat [Konfigurasi Environment](#konfigurasi-environment)):

```env
MEDCREDIX_API_URL=http://localhost:9090
```

Lalu restart `npm run dev`.

### Mengecek koneksi

- Buka DevTools browser (**F12**) → tab **Network**, lalu login. Request ke `/api/auth/login` harus berstatus **200**.
- Setiap aksi di halaman (membuat aksi, verifikasi kredensial, ubah status klaim) langsung tersimpan di PostgreSQL. Hasilnya bisa dicek di DBeaver.

---

## Konfigurasi Environment

Frontend **bisa jalan tanpa file env sama sekali**. Nilai default sudah diatur di `vite.config.ts`.

File env tidak ikut di repository (semua `.env*` ada di `.gitignore`). Bila perlu mengubah default, buat file **`.env.local`** sendiri di folder frontend:

```env
# Alamat backend untuk proxy dev server. Default: http://localhost:8080
MEDCREDIX_API_URL=http://localhost:8080

# Base URL API saat build, hanya bila frontend & backend beda domain.
# Kosongkan bila memakai proxy / reverse proxy (disarankan).
VITE_API_BASE=

# true = mode demo tanpa backend. Untuk pemakaian normal: false
VITE_DEMO_MODE=false
```

| Variabel | Dipakai saat | Keterangan |
|---|---|---|
| `MEDCREDIX_API_URL` | `npm run dev` / `preview` | Tujuan proxy `/api`. |
| `VITE_API_BASE` | `npm run build` | Alamat backend bila beda domain. Isi juga `CORS_ORIGIN` di `.env` backend. |
| `VITE_DEMO_MODE` | dev & build | `true` = data dari file lokal, tanpa backend. |

> Jangan menaruh password, secret, atau token di env frontend. Semua variabel `VITE_*` ikut masuk ke file JavaScript dan bisa dibaca siapa saja.

Setiap kali file env diubah, **restart** `npm run dev`.

---

## Perintah npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan dev server di port 3000 (terhubung ke backend). |
| `npm run build` | Build produksi ke folder `dist/`. |
| `npm run preview` | Menjalankan hasil build secara lokal untuk dicek. |
| `npm run typecheck` | Cek tipe TypeScript dengan `vue-tsc`. |
| `npm run dev:demo` | Dev server mode demo (lihat [Mode Demo](#mode-demo-tanpa-backend)). |
| `npm run build:demo` | Build mode demo. |

---

## Akun Demo

Akun ini dibuat oleh backend bila `SEED_DEMO=true` di `.env` backend. Semua akun memakai password `medcredix2026`.

| Email | Peran | Rumah Sakit |
|---|---|---|
| superadmin@spkd.co.id | Super Admin | semua RS |
| auditorbpjs@spkd.co.id | Auditor BPJS | semua RS (hanya lihat) |
| auditor@spkd.co.id | Auditor | RS Nusantara Sehat (hanya lihat) |
| admin@nusantarasehat.co.id | Admin RS | RS Nusantara Sehat |
| manajemen@nusantarasehat.co.id | Manajemen RS | RS Nusantara Sehat |
| kredensial@nusantarasehat.co.id | Petugas Kredensial | RS Nusantara Sehat |
| komite@nusantarasehat.co.id | Komite Medis | RS Nusantara Sehat |
| klaim@nusantarasehat.co.id | Tim Klaim | RS Nusantara Sehat |
| it@nusantarasehat.co.id | IT / SIMRS | RS Nusantara Sehat |
| sdm@nusantarasehat.co.id | HR / SDM | RS Nusantara Sehat |
| viewer@nusantarasehat.co.id | Viewer | RS Nusantara Sehat |
| admin@medikasejahtera.co.id | Admin RS | RS Medika Sejahtera |

Menu dan tombol yang muncul menyesuaikan peran. Contohnya, Viewer hanya bisa melihat, sedangkan Super Admin dan Auditor BPJS bisa berpindah rumah sakit lewat pilihan RS di bagian atas.

> Untuk produksi, matikan `SEED_DEMO` di backend dan ganti semua password akun demo.

---

## Mode Demo (tanpa backend)

Mode ini berguna untuk presentasi atau mencoba tampilan tanpa menjalankan backend dan database. Data diambil dari `src/data/demo-db.json` dan perubahan **tidak tersimpan** ke database.

1. Buat file `.env.demo` di folder frontend:
   ```env
   VITE_DEMO_MODE=true
   ```
2. Jalankan:
   ```bash
   npm run dev:demo
   ```

Untuk kembali terhubung ke backend, cukup jalankan `npm run dev` biasa.

---

## Build & Deploy Produksi

### 1. Build

```bash
npm run build
```

Hasilnya ada di folder `dist/` (HTML, JS, CSS statis). Folder ini yang di-upload ke server.

Aplikasi memakai router berbasis hash (`/#/dashboard`), jadi **tidak butuh pengaturan fallback** di web server.

### 2. Pilih cara menyambungkan ke backend

**Opsi A — satu domain (disarankan).** Frontend dan backend di domain yang sama, `/api` diteruskan ke backend oleh web server. Tidak perlu CORS dan `VITE_API_BASE` dikosongkan. Contoh Nginx:

```nginx
server {
    listen 80;
    server_name medcredix.contoh.co.id;

    root /var/www/medcredix/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Opsi B — beda domain.** Contoh: frontend di `app.contoh.co.id`, backend di `api.contoh.co.id`.

1. Di frontend, buat `.env.production.local` sebelum build:
   ```env
   VITE_API_BASE=https://api.contoh.co.id
   ```
2. Di `.env` backend, izinkan domain frontend:
   ```env
   CORS_ORIGIN=https://app.contoh.co.id
   ```
3. Jalankan `npm run build` lagi.

Di produksi, selalu gunakan **HTTPS** karena token login dikirim di setiap request.

---

## Troubleshooting

### Umum

| Masalah | Penyebab & solusi |
|---|---|
| `Tidak dapat terhubung ke server MedCredix` | Backend belum jalan atau beda port. Jalankan `go run ./cmd/server`, cek `http://localhost:8080/api/health`. |
| Error `ECONNREFUSED` / `http proxy error` di terminal Vite | Sama seperti di atas: proxy tidak menemukan backend. |
| Login gagal `Email atau kata sandi salah` | Akun demo belum dibuat. Pastikan `SEED_DEMO=true` di backend lalu restart backend. |
| Setelah login langsung kembali ke halaman login | Token tidak valid, biasanya karena `JWT_SECRET` backend diganti. Login ulang. |
| Muncul `403` / tombol tidak bisa dipakai | Peran akun tidak punya izin untuk aksi itu. Coba dengan akun Super Admin. |
| Data tidak muncul tapi tidak ada error | Cek `VITE_DEMO_MODE` tidak bernilai `true` di `.env.local`. |
| `Port 3000 is already in use` | Ada `npm run dev` lain yang masih jalan. Tutup terminalnya, atau lihat solusi per OS di bawah. |
| Error CORS di console browser | Hanya terjadi bila `VITE_API_BASE` diisi. Samakan `CORS_ORIGIN` di backend dengan alamat frontend. |
| `Cannot find module @rollup/rollup-...` | `node_modules` dibuat di OS lain. Hapus folder `node_modules`, lalu `npm install` ulang. |
| Perubahan env tidak berpengaruh | Restart `npm run dev`. |

<details>
<summary><b>🪟 Windows</b></summary>

<br>

**`npm` tidak dikenali.** Node.js belum masuk PATH. Tutup lalu buka ulang PowerShell. Bila masih gagal, install ulang Node.js.

**`running scripts is disabled on this system`.**

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**Port 3000 terpakai.**

```powershell
netstat -ano | findstr :3000
taskkill /PID <angka_PID> /F
```

**Hapus `node_modules` dan install ulang.**

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

</details>

<details>
<summary><b>🍎 macOS</b></summary>

<br>

**`command not found: npm`.** Jalankan `source ~/.zshrc`, atau buka Terminal baru.

**`EACCES: permission denied`.** Jangan pakai `sudo npm install`. Perbaiki kepemilikan folder:

```bash
sudo chown -R $(whoami) ~/.npm
```

**Port 3000 terpakai.**

```bash
lsof -i :3000
kill -9 <PID>
```

**Hapus `node_modules` dan install ulang.**

```bash
rm -rf node_modules
npm install
```

</details>

---

Backend: [backend-spkd-medcredix-golang](https://github.com/official-spkd/backend-spkd-medcredix-golang)
