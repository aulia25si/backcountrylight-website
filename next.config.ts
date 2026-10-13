import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // unoptimized: true menonaktifkan Image Optimization Vercel secara global.
    // Ini menghilangkan konsumsi kuota transformasi (transformation quota) di Vercel.
    // Gambar tetap dimuat dan ditampilkan normal — hanya tidak diproses ulang oleh /_next/image.
    // Gambar lokal di /public sudah dioptimasi secara manual (WebP/AVIF).
    // Gambar produk dari Supabase dilayani langsung dari CDN Supabase Storage.
    unoptimized: true,
  },
};

export default nextConfig;
