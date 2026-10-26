import Link from "next/link";
import { Award, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MembershipStatusBannerProps {
  membership: {
    status: string;
    tierType: string;
    discountPct: number;
    expiresAt?: Date | string | null;
  } | null;
  activeOrder?: {
    id: string;
    tierType: string;
    paymentStatus: string;
    amount: number;
  } | null;
}

export function MembershipStatusBanner({ membership, activeOrder }: MembershipStatusBannerProps) {
  // 1. Jika ada order pending pembayaran atau verifikasi
  if (activeOrder && activeOrder.paymentStatus !== "PAID") {
    const isPendingVerification = activeOrder.paymentStatus === "PENDING_VERIFICATION";

    return (
      <div className="border border-amber-300 bg-amber-50/60 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5 sm:mt-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-amber-900 text-sm">
                Pendaftaran Membership ({activeOrder.tierType})
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                {isPendingVerification ? "Menunggu Verifikasi Admin" : "Menunggu Pembayaran"}
              </span>
            </div>
            <p className="text-xs text-amber-800/80 mt-1">
              {isPendingVerification
                ? "Bukti pembayaran Anda telah dikirim dan sedang diverifikasi oleh tim Backcountry Light (maks 1x24 jam kerja)."
                : "Silakan selesaikan transfer pembayaran manual untuk mengaktifkan diskon membership Anda."}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs w-full sm:w-auto"
          render={<Link href={`/membership/payment/${activeOrder.id}`} />}
        >
          {isPendingVerification ? "Lihat Status Pembayaran" : "Instruksi Pembayaran"}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // 2. Jika membership AKTIF
  if (membership && membership.status === "ACTIVE") {
    const expiresFormatted = membership.expiresAt
      ? new Date(membership.expiresAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Tanpa Batas";

    return (
      <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 sm:mt-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-emerald-950 text-sm">
                BCL Partner: Tier {membership.tierType}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                Diskon {membership.discountPct}% Aktif
              </span>
            </div>
            <p className="text-xs text-emerald-800/80 mt-1">
              Masa aktif berlaku hingga <span className="font-semibold text-emerald-900">{expiresFormatted}</span>. Diskon otomatis diterapkan pada katalog saat checkout.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-emerald-300 text-emerald-900 hover:bg-emerald-100/60 shrink-0 text-xs w-full sm:w-auto"
          render={<Link href="/membership" />}
        >
          Kelola / Perpanjang
        </Button>
      </div>
    );
  }

  // 3. Jika belum memiliki membership atau revoked/expired
  return (
    <div className="border border-border bg-card rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground shrink-0 mt-0.5 sm:mt-0">
          <Award className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-foreground text-sm">
              Gabung Backcountry Light Partner
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border">
              Reseller & Dropship
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Nikmati diskon eksklusif 10% s/d 20% langsung untuk seluruh gear ultralight & varian produk BCL.
          </p>
        </div>
      </div>

      <Button
        size="sm"
        className="rounded-lg shrink-0 text-xs w-full sm:w-auto"
        render={<Link href="/membership" />}
      >
        Daftar Membership
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
