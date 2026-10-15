# PROJECT CONTEXT & ARCHITECTURE SPECIFICATION
**Backcountry Light (BCL) Web Application**  
*Dokumen Arsitektur, Analisis Codebase, dan Konteks Teknis Proyek*

---

## 1. Executive Summary

- **Nama Project**: `temp-app` (Identitas Publik: **Backcountry Light / BCL**)
- **Fungsi & Tujuan**: Platform e-commerce retail dan katalog perlengkapan outdoor ultralight (tenda, shelter, ransel, perlengkapan tidur, dan aksesoris mendaki). Sistem dilengkapi manajemen katalog produk bervarian (warna, ukuran), galeri gambar terkompresi otomatis dengan penyimpanan cloud, keranjang belanja interaktif (*client-side persistence*), buku alamat pengiriman pelanggan, proses *checkout order*, sistem autentikasi dengan verifikasi email, serta dashboard back-office (Admin Panel) untuk mengelola produk, kategori, brand, dan pengguna.
- **Bahasa Pemrograman**: TypeScript (Node.js ecosystem)
- **Framework Utama**: **Next.js 16.2.10** (App Router architecture, React Server Components, Server Actions, Edge Proxy)
- **Library UI & Rendering**: **React 19.2.4**, **Tailwind CSS v4** (`@tailwindcss/postcss`), **@base-ui/react 1.6.0** (Shadcn UI base-nova), Lucide React, Sonner, Framer Motion
- **Database & ORM**: **PostgreSQL** via **Prisma ORM 6.19.3** (Didukung Supabase PostgreSQL & Supabase Storage)
- **Autentikasi**: **NextAuth.js 4.24.15** (`CredentialsProvider`, Prisma Adapter, JWT strategy, bcrypt)
- **Layanan Eksternal**: **Supabase Storage** (CDN gambar produk), **Resend** (Layanan email transaksional)
- **Status Codebase**: **Active Development (Alpha menuju Beta)**. Alur utama etalase dan admin CRUD telah terpasang, namun terdapat beberapa temuan kritis terkait logika varian produk saat pesanan dibuat, otorisasi server actions, dan perhitungan harga.

---

## 2. Tech Stack & Dependencies

### Runtime Dependencies
- `next: 16.2.10`: Fullstack framework React dengan App Router.
- `react: 19.2.4`, `react-dom: 19.2.4`: Core UI framework.
- `@prisma/client: ^6.19.3`: Database client query builder.
- `@supabase/supabase-js: ^2.116.0`: SDK Supabase untuk interaksi Storage bucket `products`.
- `next-auth: ^4.24.15`, `@next-auth/prisma-adapter: ^1.0.7`: Manajemen sesi dan adapter database.
- `bcrypt: ^6.0.0`: Hashing kata sandi pengguna.
- `zustand: ^5.0.15`: State management keranjang belanja dengan persistensi localStorage.
- `browser-image-compression: ^2.0.2`: Kompresi gambar client-side sebelum diunggah ke storage.
- `resend: ^6.27.0`: Layanan API pengiriman email verifikasi pendaftaran.
- `@base-ui/react: ^1.6.0`: Primitif komponen UI tanpa gaya (Shadcn Base-Nova).
- `tailwindcss: ^4`, `@tailwindcss/postcss: ^4`: Utilitas CSS modern engine.
- `lucide-react: ^1.24.0`: Ikon antarmuka vektor.
- `sonner: ^2.0.7`: Komponen toast notifikasi.
- `use-debounce: ^10.1.1`: Debouncing input pencarian instan.
- `uuid: ^14.0.2`: Generator identifier token verifikasi email.

### Dev Dependencies & Tooling
- `typescript: ^5`: Compiler pengecekan tipe statis.
- `prisma: ^6.19.3`: CLI migrasi dan introspeksi database.
- `eslint: ^9`, `eslint-config-next: 16.2.10`: Linter kode.

---

## 3. Struktur Direktori Proyek

```text
backcountrylight-website/
├── prisma/
│   └── schema.prisma                 # Definisi skema database PostgreSQL & model relasional
├── public/
│   ├── bcl-icon.svg                  # Ikon aplikasi
│   ├── images/brands/                # Logo statis brand partner (WebP, PNG)
│   └── tent/                         # Aset foto produk & lifestyle lokal (WebP, JPG)
├── scripts/
│   └── seed.mjs                      # Script seeder admin, kategori default, dan brand default
├── src/
│   ├── proxy.ts                      # Konvensi Next.js 16 (pengganti middleware.ts) untuk proteksi rute
│   ├── app/
│   │   ├── (customer)/               # Route Group Customer & Autentikasi
│   │   │   ├── account/
│   │   │   │   ├── layout.tsx        # Layout navigasi akun pelanggan
│   │   │   │   ├── page.tsx          # Riwayat pesanan (My Orders)
│   │   │   │   ├── address/page.tsx  # Buku alamat pelanggan (Address Book)
│   │   │   │   ├── settings/page.tsx # Pengaturan profil & password (mockup UI)
│   │   │   │   └── wishlist/page.tsx # Wishlist barang tersimpan (mockup UI)
│   │   │   ├── checkout/page.tsx     # Form transaksi checkout pesanan
│   │   │   ├── login/page.tsx        # Halaman autentikasi login pengguna
│   │   │   └── register/page.tsx     # Halaman pendaftaran pengguna baru
│   │   ├── actions/                  # Next.js Server Actions (Mutasi database server-side)
│   │   │   ├── address.ts            # Tambah, hapus, dan set default alamat
│   │   │   ├── auth.ts               # Registrasi akun dan pengiriman token aktivasi email
│   │   │   ├── brands.ts             # CRUD brand produk
│   │   │   ├── categories.ts         # CRUD kategori produk
│   │   │   ├── order.ts              # Pembuatan order & dekremen kuota stok
│   │   │   ├── products.ts           # CRUD produk, opsi, varian, dan galeri
│   │   │   ├── search.ts             # Pencarian live produk dan brand
│   │   │   └── users.ts              # Pengaturan role akun & penghapusan user
│   │   ├── admin/                    # Route Group Admin Panel
│   │   │   ├── layout.tsx            # Frame layout dashboard admin (Sidebar + RBAC guard)
│   │   │   ├── page.tsx              # Overview statistik metrik katalog & pelanggan
│   │   │   ├── brands/               # Daftar, tambah baru, dan edit brand
│   │   │   ├── categories/           # Daftar, tambah baru, dan edit kategori
│   │   │   ├── products/             # Daftar, tambah baru, dan edit produk bervarian
│   │   │   └── users/                # Daftar customer dan penugasan role (ADMIN/STAFF/USER)
│   │   ├── api/                      # Route Handlers REST
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/    # Endpoint handler NextAuth.js
│   │   │   │   └── verify/route.ts   # Endpoint verifikasi link aktivasi email
│   │   │   └── upload/route.ts       # Endpoint unggah gambar produk ke Supabase Storage
│   │   ├── about/page.tsx            # Profil perusahaan dan cerita brand BCL
│   │   ├── brands/page.tsx           # Etalase brand mitra resmi
│   │   ├── cart/page.tsx             # Halaman keranjang belanja statis
│   │   ├── journal/                  # Modul blog/artikel (List & Detail slug)
│   │   ├── shop/                     # Modul katalog toko (List produk & Detail slug)
│   │   ├── globals.css               # Setup CSS Tailwind v4, tema OKLCH, font variables
│   │   ├── layout.tsx                # Root Layout aplikasi (Font Geist, Inter, Navbar, Footer)
│   │   └── page.tsx                  # Beranda / Landing Page
│   ├── components/
│   │   ├── account/                  # Komponen khusus akun (AddAddressForm, AddressCard)
│   │   ├── admin/                    # Komponen admin (Sidebar, Header, ProductForm, VariantEditor)
│   │   ├── checkout/                 # Komponen checkout pesanan (CheckoutForm)
│   │   ├── layout/                   # Komponen layout (Navbar, Footer, CartSidebar, SearchDialog)
│   │   ├── shared/                   # Komponen bersama (ProductCard, Gallery, VariantSelector)
│   │   └── ui/                       # Shadcn UI primitives (17 komponen @base-ui/react)
│   ├── lib/
│   │   ├── auth.ts                   # Konfigurasi NextAuth Options & CredentialsProvider
│   │   ├── prisma.ts                 # Prisma Client singleton
│   │   └── utils.ts                  # Helper formatting mata uang IDR & merge class Tailwind
│   ├── store/
│   │   └── useCartStore.ts           # Zustand store keranjang belanja (persist localStorage)
│   └── types/
│       └── next-auth.d.ts            # Deklarasi ekstensi tipe sesi & user NextAuth
├── .env                              # Environment variables (DB, Auth, Supabase, Resend)
├── AGENTS.md                         # Peringatan panduan konvensi Next.js 16
├── components.json                   # Konfigurasi Shadcn UI CLI
├── next.config.ts                    # Konfigurasi Next.js (unoptimized images)
├── supabase_schema.sql               # Snapshot SQL lama (legacy)
├── test_db.js / test_product.js      # Script tes koneksi database lokal
├── verify-all.mjs                    # Script utilitas manual aktivasi email user
└── tsconfig.json                     # Konfigurasi TypeScript
```

---

## 4. Arsitektur & Alur Data

### Diagram Arsitektur

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Browser)"]
        Guest["Pengunjung Tamu"]
        Customer["Pelanggan Terdaftar"]
        Admin["Administrator / Staff"]
        ZustandCart["Zustand Store (localStorage)"]
    end

    subgraph Edge_Proxy ["Next.js 16 Proxy Layer"]
        Proxy["src/proxy.ts (Auth Route Guard)"]
    end

    subgraph Server_AppRouter ["Next.js 16 Server Layer"]
        RSC["React Server Components (Direct Read Query)"]
        Actions["Server Actions (src/app/actions/*)"]
        API_Upload["/api/upload (Multipart Receiver)"]
        API_Auth["/api/auth/[...nextauth]"]
        API_Verify["/api/auth/verify"]
    end

    subgraph External_Services ["Infrastruktur & Layanan Eksternal"]
        PrismaSingleton["Prisma Client Singleton"]
        SupabaseDB["Supabase PostgreSQL Database"]
        SupabaseStorage["Supabase Storage ('products' bucket)"]
        ResendService["Resend Email API"]
    end

    Guest -->|Akses Rute| Proxy
    Customer -->|Akses Rute| Proxy
    Admin -->|Akses Rute| Proxy

    Guest -.->|Tambah Barang| ZustandCart
    Customer -.->|Tambah Barang| ZustandCart

    Proxy --> RSC
    Customer -->|Form Submission / Invocation| Actions
    Admin -->|Form Submission / Invocation| Actions
    Admin -->|Upload File| API_Upload
    Customer -->|Login Request| API_Auth
    Customer -->|Klik Link Email| API_Verify

    RSC -->|Read Data| PrismaSingleton
    Actions -->|Mutasi Data| PrismaSingleton
    Actions -->|Kirim Email Aktivasi| ResendService
    API_Upload -->|Simpan Blob| SupabaseStorage
    API_Auth -->|Cek Kredensial| PrismaSingleton
    API_Verify -->|Aktivasi Status| PrismaSingleton

    PrismaSingleton --> SupabaseDB
```

### Karakteristik Arsitektur Utama
1. **Konvensi `proxy.ts` Next.js 16**: Middleware standar Next.js telah berganti nama menjadi `proxy.ts`. File ini berfungsi sebagai pos pemeriksaan pertama untuk memblokir akses ke rute `/admin/*` bagi pengguna non-admin/staff dan mengarahkan pengguna yang sudah login agar tidak membuka kembali halaman login/register.
2. **Arsitektur Hybrid RSC & Server Actions**: 
   - Kueri baca (Read) memanfaatkan React Server Components untuk mengambil data langsung dari Prisma tanpa overhead lapisan REST API.
   - Operasi tulis (Write/Mutation) dipusatkan pada Server Actions (`src/app/actions/`).
3. **Penyimpanan Gambar Teroptimasi**:
   - Gambar dikompresi di sisi klien terlebih dahulu oleh library `browser-image-compression` ke ukuran maksimal 500KB dan dimensi 1200px sebelum dikirimkan ke `/api/upload`.
   - File disimpan di Supabase Storage bucket `products` dan diakses publik via CDN Supabase.
   - `next.config.ts` menyetel `images.unoptimized: true` untuk menghemat kuota transformasi gambar Vercel.

---

## 5. Skema Database & Relasi (Prisma)

### Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Account : "has"
    User ||--o{ Session : "has"
    User ||--o{ Address : "has"
    User ||--o{ Order : "places"
    Category ||--o{ Product : "contains"
    Brand ||--o{ Product : "manufactures"
    Product ||--o{ ProductOption : "defines"
    Product ||--o{ ProductVariant : "has"
    Product ||--o{ OrderItem : "included_in"
    ProductVariant ||--o{ OrderItem : "specified_in"
    Order ||--o{ OrderItem : "contains"

    User {
        String id PK
        String name
        String email UK
        DateTime emailVerified
        String password
        Role role "USER | ADMIN | STAFF"
        DateTime createdAt
        DateTime updatedAt
    }

    Address {
        String id PK
        String userId FK
        String firstName
        String lastName
        String street
        String city
        String postalCode
        Boolean isDefault
        DateTime createdAt
        DateTime updatedAt
    }

    Category {
        String id PK
        String name
        String slug UK
        String description
        String image
        DateTime createdAt
        DateTime updatedAt
    }

    Brand {
        String id PK
        String name
        String slug UK
        String logo
        String description
        DateTime createdAt
        DateTime updatedAt
    }

    Product {
        String id PK
        String sku UK
        String name
        String slug UK
        String description
        Int price
        Int stock
        String image
        String[] images
        Json specifications
        Boolean isFeatured
        String categoryId FK
        String brandId FK
        DateTime createdAt
        DateTime updatedAt
    }

    ProductOption {
        String id PK
        String productId FK
        String name
        String[] values
    }

    ProductVariant {
        String id PK
        String productId FK
        String name
        String sku UK
        Int price
        Int stock
        Json options
        String imageUrl
    }

    Order {
        String id PK
        String userId FK
        OrderStatus status "PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED"
        Int totalAmount
        Json shippingAddress
        DateTime createdAt
        DateTime updatedAt
    }

    OrderItem {
        String id PK
        String orderId FK
        String productId FK
        String variantId FK
        Int quantity
        Int price
    }
```

---

## 6. Inventaris File-by-File & Fungsionalitas

### Core & Konfigurasi
- **[next.config.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/next.config.ts)**: Mengatur `images.unoptimized: true` agar gambar lokal WebP dan CDN Supabase tidak diproses ulang oleh Vercel.
- **[src/proxy.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/proxy.ts)**: Gatekeeper otorisasi berbasis rute. Mengamankan `/admin/*` hanya untuk token dengan role `ADMIN` atau `STAFF`.
- **[src/lib/prisma.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/lib/prisma.ts)**: Pola singleton Prisma Client agar koneksi database tidak bocor pada mode hot-reload Next.js.
- **[src/lib/auth.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/lib/auth.ts)**: Konfigurasi NextAuth Options. Memvalidasi kata sandi ter-enkripsi `bcrypt` dan mewajibkan field `emailVerified` aktif.
- **[src/lib/utils.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/lib/utils.ts)**: Helper `cn()` untuk penggabungan kelas Tailwind dan `formatRupiah(amount)` untuk format mata uang IDR.
- **[src/store/useCartStore.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/store/useCartStore.ts)**: Store Zustand dengan persistensi localStorage (`bcl-cart-storage`) untuk menyimpan item keranjang, kuantitas, kalkulasi harga, dan kontrol buka-tutup drawer.

### Server Actions (`src/app/actions/`)
- **[auth.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/auth.ts)**: `registerUser`: Mendaftarkan akun baru, membuat token verifikasi, dan mengirim email via Resend API.
- **[address.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/address.ts)**: `addAddress`, `deleteAddress`, `setDefaultAddress`: Mengatur alamat pengiriman user dengan verifikasi kepemilikan session.
- **[order.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/order.ts)**: `createOrder`: Membuat entri pesanan baru dan melakukan pengurangan stok produk.
- **[products.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/products.ts)**: `createProduct`, `updateProduct`, `deleteProduct`: CRUD katalog produk, pembuatan opsi dan varian.
- **[categories.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/categories.ts)**: `createCategory`, `updateCategory`, `deleteCategory`: CRUD kategori produk.
- **[brands.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/brands.ts)**: `createBrand`, `updateBrand`, `deleteBrand`: CRUD brand partner.
- **[users.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/users.ts)**: `updateUserRole`, `deleteUser`: Mengubah hak akses pengguna dan menghapus user.
- **[search.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/search.ts)**: `searchStore`: Melakukan kueri pencarian teks instan pada produk dan brand.

### API Routes (`src/app/api/`)
- **[api/auth/verify/route.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/api/auth/verify/route.ts)**: Menangkap token aktivasi email, memvalidasi kedaluwarsa, dan memperbarui status akun user menjadi terverifikasi.
- **[api/upload/route.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/api/upload/route.ts)**: Menerima multipart form data, memverifikasi sesi admin/staff, dan mengunggah buffer file ke Supabase Storage.

---

## 7. Temuan Masalah & Area Perbaikan (Audit Codebase)

### A. Critical Issues (P0 - Harus Segera Diperbaiki)

1. **Crash Pesanan Produk Bervarian pada Proses Checkout**:
   - *Lokasi*: [ProductVariantSelector.tsx:106](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/components/shared/ProductVariantSelector.tsx#L106) dan [order.ts:40-55](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/order.ts#L40-L55).
   - *Penyebab*: Saat varian dipilih, ID yang disimpan ke keranjang adalah format komposit: `${product.id}-${activeVariant.id}`. Server Action `createOrder` mencoba memperbarui `prisma.product.update({ where: { id: item.id } })` dan menyimpan `productId: item.id`. Akibatnya Prisma melempar error *Record Not Found* atau *Foreign Key Violation*. Pembelian produk dengan varian gagal total.
   - *Solusi*: Simpan `productId` dan `variantId` sebagai field terpisah pada `CartItem`, lalu perbaiki query di `order.ts` agar mendistribusikan pengurangan stok ke `ProductVariant` atau `Product` yang relevan.

2. **Celah Keamanan: Privilege Escalation pada Pengaturan Role Akun**:
   - *Lokasi*: [src/app/actions/users.ts:18-29](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/users.ts#L18-L29).
   - *Penyebab*: Fungsi `updateUserRole` dan `deleteUser` tidak memanggil `getServerSession(authOptions)`. Siapa pun dapat memanggil fungsi Server Action via HTTP POST dari luar untuk menaikkan level akunnya menjadi `ADMIN` atau menghapus akun administrator lain.
   - *Solusi*: Tambahkan guard otorisasi di baris pertama fungsi untuk memastikan pemanggil memiliki sesi dengan role `ADMIN`.

3. **Celah Keamanan: Manipulasi Harga Pesanan dari Sisi Klien (Client-Side Price Tampering)**:
   - *Lokasi*: [src/app/actions/order.ts:35-43](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/order.ts#L35-L43).
   - *Penyebab*: Nilai `totalAmount` dan `items[].price` diterima langsung dari payload klien tanpa validasi ulang di server. Pengguna teknis dapat mengubah harga menjadi Rp 1 di network request.
   - *Solusi*: Hitung ulang seluruh harga barang langsung dari database menggunakan ID produk/varian di server, kalkulasi ongkos kirim resmi, dan simpan total hasil hitungan server.

4. **Ketiadaan Cek Otorisasi pada Server Actions Katalog Admin**:
   - *Lokasi*: [products.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/products.ts), [brands.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/brands.ts), [categories.ts](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/categories.ts).
   - *Penyebab*: Rute admin di browser diproteksi oleh `proxy.ts`, tetapi Server Actions di balik operasi CRUD katalog tidak memiliki verifikasi sesi `ADMIN`/`STAFF`.

### B. High Issues (P1 - Masalah Fungsionalitas Signifikan)

1. **Kegagalan Pembaruan Produk yang Sudah Pernah Dipesan**:
   - *Lokasi*: [products.ts:127-137](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/products.ts#L127-L137).
   - *Penyebab*: `updateProduct` menggunakan perintah `variants: { deleteMany: {}, create: ... }`. Karena tabel `OrderItem` mengikat varian dengan constraint `ON DELETE RESTRICT`, database PostgreSQL akan menolak penghapusan varian yang sudah tercatat di riwayat transaksi.
   - *Solusi*: Terapkan pola update/upsert varian secara spesifik berdasarkan ID varian yang sudah ada.

2. **Pengguna Terkunci jika Pengiriman Email Verifikasi Mengalami Gangguan**:
   - *Lokasi*: [auth.ts:35-69](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/actions/auth.ts#L35-L69).
   - *Penyebab*: User dibuat di database sebelum email dikirim. Jika pengiriman via Resend gagal, proses terhenti tanpa *rollback*. User tidak bisa login karena belum terverifikasi dan tidak bisa mendaftar ulang karena email sudah tercatat.
   - *Solusi*: Gunakan `$transaction` atau sediakan rute/tombol "Kirim Ulang Email Verifikasi".

3. **Inkonsistensi Halaman `/cart`**:
   - *Lokasi*: [src/app/cart/page.tsx:13-14](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/cart/page.tsx#L13-L14).
   - *Penyebab*: Halaman `/cart` merupakan Server Component dengan state dummy `const cartItems: any[] = []`. Halaman ini selalu menampilkan keranjang kosong terpisah dari `CartSidebar`.
   - *Solusi*: Konversikan `/cart` menjadi Client Component yang membaca state dari `useCartStore`.

### C. Medium & Low Issues (P2 & P3)

1. **Bug Filter Brand Multi-Kata**: [src/app/brands/page.tsx:51](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/src/app/brands/page.tsx#L51) menggunakan `.replace(" ", "-")` (hanya mengganti spasi pertama). Untuk "Hyperlite Mountain Gear", link menjadi `/shop?brand=hyperlite-mountain gear` yang berakibat produk tidak ditemukan. Solusi: Gunakan regex global `.replace(/\s+/g, "-")`.
2. **Kerancuan Fitur Status Aktif vs Featured**: Form produk mengaitkan switch "Status (Active)" ke kolom database `isFeatured`. Setiap barang aktif otomatis menjadi featured di halaman muka.
3. **Dead Links**: Rute `/rental` dan `/contact` menghasilkan 404. Menu `/admin/orders` pada sidebar masih berstatus nonaktif (disabled).
4. **Form Statis**: Form ubah profil dan kata sandi di halaman `/account/settings` belum memiliki handler mutasi ke database.
5. **Skema Drift**: File [supabase_schema.sql](file:///d:/1.%20jgn%20dibuka/Project%20Web/BCL_Project/backcountrylight-website/supabase_schema.sql) belum mencerminkan model `Address`, `ProductOption`, `ProductVariant`, dan enum `STAFF`.

---

## 8. Panduan Menjalankan Proyek Secara Lokal

### Prasyarat
- Node.js versi 20 atau lebih baru
- PostgreSQL instance (lokal atau cloud Supabase)

### Langkah-langkah
1. **Clone & Pasang Dependensi**:
   ```bash
   npm install
   ```
2. **Konfigurasi Environment**:
   Pastikan file `.env` memiliki variabel yang sesuai:
   ```env
   DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
   NEXTAUTH_SECRET="your-super-secret-jwt-key"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="ey..."
   RESEND_API_KEY="re_..."
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```
3. **Generate Prisma Client & Sinkronisasi Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. **Isi Data Awal (Seeding)**:
   ```bash
   node scripts/seed.mjs
   ```
   *Seeder akan membuat akun admin default: `admin@bcl.com` / `admin123`.*
5. **Jalankan Aplikasi**:
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses di `http://localhost:3000`.

---

## 9. Rekomendasi Roadmap Pengembangan

| Fase | Target Pekerjaan |
| :--- | :--- |
| **Fase 1: Stability & Security Fixes** | 1. Perbaiki penanganan `variantId` pada `useCartStore` dan `createOrder`.<br>2. Pasang otorisasi role admin pada semua Server Actions katalog & user.<br>3. Terapkan kalkulasi harga pesanan server-side pada `createOrder`. |
| **Fase 2: Core E-Commerce Completion** | 1. Integrasikan halaman `/cart` dengan `useCartStore`.<br>2. Bangun halaman admin `/admin/orders` untuk melihat dan mengupdate status pesanan.<br>3. Integrasikan Payment Gateway resmi (Midtrans Snap / Payment API). |
| **Fase 3: Feature Polish & User Experience** | 1. Sambungkan form profil & password pada `/account/settings` ke server actions.<br>2. Perbaiki filter brand di `/brands` dan aktifkan checkbox filter di `/shop`.<br>3. Pisahkan status `isActive` dan `isFeatured` pada model produk. |
