# ShareWeb 📤

Aplikasi web untuk mengirim file antar perangkat, dengan **Google Drive** sebagai penyimpanan di latar belakang. Buat room, dapatkan kode + password, lalu perangkat lain bisa mengunggah/mengunduh file. Siap di-deploy ke **Vercel**.

## Fitur

- 🔐 **Buat room** dengan kode unik + password acak
- ☁️ **Upload file** — tersimpan otomatis ke Google Drive
- 📥 **Download file** dari perangkat lain
- 📱 **Multi-perangkat** — akses dari mana pun dengan kode + password
- 🖼️ Dukungan semua tipe file (dokumen, gambar, video, dll), maks 100MB

## Teknologi

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Google Drive API** (Service Account)
- **Prisma + Vercel Postgres** (Neon) untuk metadata room & file

## Setup Lokal

### 1. Instal dependensi

```bash
npm install
```

### 2. Setup Database (Vercel Postgres / Neon)

1. Buat database Postgres (mis. [Neon](https://neon.tech) gratis).
2. Salin `.env.example` menjadi `.env` lalu isi `DATABASE_URL`.
3. Migrasi skema:

```bash
npx prisma migrate dev --name init
```

Atau tanpa migrasi (sinkron langsung):

```bash
npx prisma db push
```

### 3. Setup Google Drive API

1. Buka [Google Cloud Console](https://console.cloud.google.com) → buat **Project** baru.
2. Pergi ke **APIs & Services → Library** → aktifkan **Google Drive API**.
3. Buka **APIs & Services → Credentials → Create Credentials → Service Account**.
4. Buat service account, lalu **Manage keys → Add Key → Create new key → JSON** → unduh file-nya.
5. Dari file JSON tersebut copi nilai **`client_email`** dan **`private_key`**.
   - Pada `private_key`, ganti setiap `\n` literal dengan `\\n` (aplikasi akan mengonversinya kembali menjadi baris baru).
6. Isikan ke `.env`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = nilai `client_email`
   - `GOOGLE_PRIVATE_KEY` = nilai `private_key` (dengan `\\n`)

> **Opsional — folder khusus:** Buat folder di Google Drive, bagikan (share) ke email service account sebagai **Editor**, lalu isi ID folder di `GOOGLE_DRIVE_FOLDER_ID`. Jika dikosongkan, file masuk ke Drive root service account.

### 4. Jalankan

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Deploy ke Vercel

1. Push repo ke GitHub.
2. Import di [Vercel](https://vercel.com) → pilih framework otomatis **Next.js**.
3. Di **Settings → Environment Variables**, tambahkan semua variabel dari `.env.example`:
   - `DATABASE_URL`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_DRIVE_FOLDER_ID` (opsional)
4. Deploy. Selesai!

> Pastikan `GOOGLE_PRIVATE_KEY` di Vercel menggunakan `\n` (newline asli) atau `\\n` escaped — aplikasi menangani keduanya.

## Alur Kerja

```
Perangkat A:
  Buat room → dapat KODE-XXX + password → bagikan
  Upload file → disimpan ke Google Drive → metadata ke Postgres

Perangkat B:
  Masukkan kode + password → lihat daftar file → unduh
  (server ambil dari Google Drive → stream ke browser)
```

## Variabel Lingkungan

| Variabel | Wajib | Deskripsi |
|---|---|---|
| `DATABASE_URL` | ✅ | Koneksi Postgres (Vercel/Neon) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ✅ | `client_email` dari JSON service account |
| `GOOGLE_PRIVATE_KEY` | ✅ | `private_key` dari JSON service account |
| `GOOGLE_DRIVE_FOLDER_ID` | ❌ | ID folder Drive (opsional) |

## Batasan

- Maks 100MB per file
- Download file besar bergantung streaming dari Google Drive ke Vercel
