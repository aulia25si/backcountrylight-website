import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MembershipRegistrationView } from "@/components/membership/MembershipRegistrationView";
import { formatRupiah } from "@/lib/utils";
import { Award, CheckCircle2, Clock, ShieldCheck, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { getCurrentUserMembership } from "@/app/actions/membership";

export const metadata = {
  title: "BCL Membership Partner | Reseller & Dropshipper",
  description: "Daftar program kemitraan resmi Backcountry Light untuk mendapatkan diskon grosir 10% s/d 20% khusus reseller dan dropshipper outdoor gear.",
};

export default async function MembershipPage() {
  const session = await getServerSession(authOptions);

  // 1. Ambil konfigurasi tiers dari DB
  const rawTiers = await prisma.membershipTier.findMany({
    orderBy: { price: "asc" },
  });

  const tiers = rawTiers.map((t) => ({
    id: t.id,
    type: t.type,
    name: t.name,
    discountPct: t.discountPct,
    price: t.price,
    durationDays: t.durationDays,
    description: t.description,
    benefits: t.benefits,
  }));

  // 2. Jika user belum login, tampilkan landing page publik dengan CTA login
  if (!session?.user?.id) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-6xl space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Program Kemitraan Resmi Backcountry Light</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-heading font-medium tracking-tight text-foreground">
            Tingkatkan Profit Bisnis Outdoor Anda
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Bergabunglah dengan BCL Membership Partner dan nikmati potongan harga khusus 10% hingga 20% langsung pada seluruh katalog tenda, shelter, ransel, dan perlengkapan camping ultralight.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-sm font-medium" render={<Link href="/login?callbackUrl=/membership" />}>
              Masuk untuk Mendaftar
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-sm" render={<Link href="/register" />}>
              Buat Akun Baru
            </Button>
          </div>
        </div>

        {/* Tier Cards Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div key={tier.id} className="rounded-2xl border p-6 sm:p-8 bg-card flex flex-col justify-between space-y-6">
              <div>
                <h3 className="font-heading font-semibold text-xl">{tier.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                <div className="my-6 border-t border-b py-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-heading font-bold">{formatRupiah(tier.price)}</span>
                    <span className="text-xs text-muted-foreground">/ {tier.durationDays} hari</span>
                  </div>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Diskon {tier.discountPct}% Katalog
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {tier.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button className="w-full" variant="outline" render={<Link href="/login?callbackUrl=/membership" />}>
                Mulai dengan {tier.name}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. User sudah login: Cek status membership dan pesanan aktif
  const { membership, activeOrder } = await getCurrentUserMembership();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-6xl space-y-12">
      {/* Jika ada pesanan membership yang pending verifikasi / bayar */}
      {activeOrder && activeOrder.paymentStatus !== "PAID" && (
        <div className="border border-amber-300 bg-amber-50/70 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Status Pesanan Membership #{activeOrder.id.slice(0, 8)}
              </span>
              <h2 className="text-xl font-heading font-semibold text-amber-950">
                {activeOrder.paymentStatus === "PENDING_VERIFICATION"
                  ? "Pembayaran Anda Sedang Diverifikasi"
                  : "Menunggu Pembayaran Manual"}
              </h2>
              <p className="text-xs text-amber-900/80 max-w-xl">
                {activeOrder.paymentStatus === "PENDING_VERIFICATION"
                  ? "Bukti transfer telah diterima dan sedang diproses tim Backcountry Light. Diskon kemitraan akan otomatis aktif begitu pembayaran disetujui."
                  : "Silakan transfer nominal pembayaran membership dan unggah bukti transfer agar status kemitraan Anda segera diproses."}
              </p>
            </div>
          </div>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs w-full sm:w-auto"
            render={<Link href={`/membership/payment/${activeOrder.id}`} />}
          >
            {activeOrder.paymentStatus === "PENDING_VERIFICATION" ? "Lihat Status Bukti Pembayaran" : "Instruksi Transfer"}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Jika Membership Sedang AKTIF */}
      {membership && membership.status === "ACTIVE" && (
        <div className="border border-emerald-300 bg-emerald-50/60 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-800">Status Kemitraan Aktif</span>
                <h2 className="text-2xl font-heading font-semibold text-emerald-950">
                  {membership.tier.name} ({membership.tierType})
                </h2>
              </div>
            </div>
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 border border-emerald-300 w-fit">
              Hak Diskon {membership.discountPct}% Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-emerald-900">
            <div>
              <p className="text-emerald-700 uppercase font-semibold">Nama Usaha / Toko</p>
              <p className="font-semibold text-sm mt-0.5">{membership.businessName || "—"}</p>
            </div>
            <div>
              <p className="text-emerald-700 uppercase font-semibold">Masa Berlaku Hingga</p>
              <p className="font-semibold text-sm mt-0.5">
                {membership.expiresAt
                  ? new Date(membership.expiresAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Aktif Permanen"}
              </p>
            </div>
            <div>
              <p className="text-emerald-700 uppercase font-semibold">Penerapan Diskon</p>
              <p className="text-muted-foreground mt-0.5">
                Diskon {membership.discountPct}% otomatis terpotong pada subtotal produk saat Anda checkout.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tampilkan Form Pendaftaran / Perpanjangan */}
      <MembershipRegistrationView
        tiers={tiers}
        user={session.user}
        currentTier={membership?.tierType}
        isRenewal={membership?.status === "ACTIVE"}
      />
    </div>
  );
}
