# ShareWeb 📤

Aplikasi web untuk mengirim file antar perangkat, dengan **Backblaze B2** sebagai penyimpanan di latar belakang. Buat room, dapatkan kode + password, lalu perangkat lain bisa mengunggah/mengunduh file. Siap di-deploy ke **Vercel**.

## Fitur

- 🔐 **Buat room** dengan kode unik + password acak
- ☁️ **Upload file** — tersimpan otomatis ke Backblaze B2
- 📥 **Download file** dari perangkat lain
- 📱 **Multi-perangkat** — akses dari mana pun dengan kode + password
- 🖼️ Dukungan semua tipe file (dokumen, gambar, video, dll), maks 100MB

## Teknologi

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Backblaze B2** (S3-compatible) untuk penyimpanan file
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

### 3. Setup Penyimpanan File (Backblaze B2)

1. Daftar di [Backblaze B2](https://www.backblaze.com/cloud-storage) (gratis 10GB, **tanpa kartu**, cukup verifikasi email).
2. Buat **bucket**: di dashboard B2 → **Buckets** → **Create a Bucket** → pilih nama, **Private**, lalu **Create**.
3. Di halaman bucket → **Bucket Settings** → aktifkan **"Allow List All File Names"**.
4. Buat **Application Key**: menu akun → **Application Keys** → **Add a New Application Key**:
   - Capabilities: centang **Read, Write, List, Delete**
   - **Create Key** → salin **keyID** (Access Key) dan **applicationKey** (Secret, hanya tampil sekali).
5. Salin **S3 API Endpoint** dari halaman bucket (bentuk `https://s3.<region>.backblazeb2.com`).
6. Isi `.env`:
   - `S3_ENDPOINT` = S3 API Endpoint
   - `S3_ACCESS_KEY_ID` = keyID
   - `S3_SECRET_ACCESS_KEY` = applicationKey
   - `S3_BUCKET_NAME` = nama bucket

> B2 dipakai karena penyedia lain (mis. Cloudflare R2) memerlukan kartu pembayaran untuk verifikasi; B2 free tier cukup dengan email.

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
   - `S3_ENDPOINT`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_BUCKET_NAME`
4. Deploy. Selesai!

## Alur Kerja

```
Perangkat A:
  Buat room → dapat KODE-XXX + password → bagikan
  Upload file → disimpan ke Backblaze B2 → metadata ke Postgres

Perangkat B:
  Masukkan kode + password → lihat daftar file → unduh
  (server ambil dari B2 → stream ke browser)
```

## Variabel Lingkungan

| Variabel | Wajib | Deskripsi |
|---|---|---|
| `DATABASE_URL` | ✅ | Koneksi Postgres (Vercel/Neon) |
| `S3_ENDPOINT` | ✅ | S3 API Endpoint (mis. `https://s3.<region>.backblazeb2.com`) |
| `S3_ACCESS_KEY_ID` | ✅ | keyID aplikasi Backblaze B2 |
| `S3_SECRET_ACCESS_KEY` | ✅ | applicationKey Backblaze B2 |
| `S3_BUCKET_NAME` | ✅ | Nama bucket B2 |

## Batasan

- Maks 100MB per file
- Download file besar bergantung streaming dari B2 ke Vercel
- Kuota penyimpanan B2 gratis 10GB
