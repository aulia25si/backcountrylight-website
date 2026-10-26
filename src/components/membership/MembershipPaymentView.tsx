"use client";

import { useState } from "react";
import Image from "next/image";
import { formatRupiah } from "@/lib/utils";
import { submitMembershipPaymentProof } from "@/app/actions/membership";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  X, 
  RefreshCw,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
  Building2
} from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/payment-config";

interface MembershipPaymentViewProps {
  order: {
    id: string;
    amount: number;
    durationDays: number;
    tierType: string;
    paymentStatus: string;
    paymentProofUrl?: string | null;
    senderName?: string | null;
    senderBank?: string | null;
    transferAmount?: number | null;
    transferDate?: string | Date | null;
    verifiedAt?: string | Date | null;
    rejectionReason?: string | null;
    tier: {
      name: string;
      discountPct: number;
    };
    user: {
      name?: string | null;
      email?: string | null;
    };
  };
}

const COMMON_BANKS = [
  "BCA",
  "MANDIRI",
  "BRI",
  "BNI",
  "BSI",
  "BANK JAGO",
  "SEABANK",
  "CIMB NIAGA",
  "LAINNYA",
];

export function MembershipPaymentView({ order }: MembershipPaymentViewProps) {
  const router = useRouter();

  // Form states
  const [senderName, setSenderName] = useState(order.senderName || order.user.name || "");
  const [senderBank, setSenderBank] = useState(order.senderBank || "BCA");
  const [transferAmount, setTransferAmount] = useState<string>(
    order.transferAmount ? String(order.transferAmount) : String(order.amount)
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(order.paymentProofUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  const isVerified = order.paymentStatus === "PAID";
  const isPending = order.paymentStatus === "PENDING_VERIFICATION";
  const isRejected = order.paymentStatus === "REJECTED";

  // Handle File Change & Upload ke /api/upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File bukti transfer harus berupa gambar (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal adalah 5MB.");
      return;
    }

    setProofFile(file);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Auto upload file ke backend
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Gagal mengunggah foto bukti.");
      }

      setPreviewUrl(json.url);
      toast.success("Foto bukti transfer berhasil diunggah.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah gambar bukti pembayaran.");
      setProofFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Submit konfirmasi pembayaran
  const handleSubmitConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!previewUrl) {
      toast.error("Silakan unggah foto/screenshot bukti transfer terlebih dahulu.");
      return;
    }

    const numericAmount = parseInt(transferAmount.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Nominal transfer tidak valid.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await submitMembershipPaymentProof({
        orderId: order.id,
        paymentProofUrl: previewUrl,
        senderName: senderName.trim(),
        senderBank: senderBank.trim(),
        transferAmount: numericAmount,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Konfirmasi pembayaran berhasil dikirim! Menunggu verifikasi tim BCL.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim konfirmasi pembayaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Kolom Kiri: Instruksi Pembayaran Bank */}
      <div className="lg:col-span-7 space-y-6">
        {/* Box Status Terverifikasi */}
        {isVerified && (
          <div className="border border-emerald-300 bg-emerald-50 rounded-xl p-5 flex items-center gap-3.5 text-emerald-900">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-heading font-semibold text-sm">Pembayaran Membership Terverifikasi</p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Status membership Partner BCL Anda sudah aktif dan siap digunakan untuk berbelanja.
              </p>
            </div>
          </div>
        )}

        {/* Box Status Pending Verifikasi */}
        {isPending && (
          <div className="border border-amber-300 bg-amber-50 rounded-xl p-5 flex items-center gap-3.5 text-amber-900">
            <Clock className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-heading font-semibold text-sm">Sedang Diverifikasi Tim BCL</p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Konfirmasi Anda telah masuk. Admin kami akan memeriksa mutasi bank dan mengaktifkan membership Anda maksimal 1x24 jam kerja.
              </p>
            </div>
          </div>
        )}

        {/* Box Status Ditolak */}
        {isRejected && (
          <div className="border border-red-300 bg-red-50 rounded-xl p-5 flex items-start gap-3.5 text-red-900">
            <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-heading font-semibold text-sm">Bukti Pembayaran Ditolak</p>
              <p className="text-xs text-red-800/90">
                Alasan: <span className="font-semibold">{order.rejectionReason || "Nominal tidak sesuai atau mutasi tidak ditemukan."}</span>
              </p>
              <p className="text-xs text-red-700">Silakan unggah ulang bukti transfer yang benar di bawah ini.</p>
            </div>
          </div>
        )}

        {/* Instruksi Rekening Resmi BCL */}
        <div className="border rounded-2xl p-6 bg-card space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b pb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-heading font-medium">Rekening Resmi Transfer Bank BCL</h2>
          </div>

          <div className="bg-primary/[0.03] border border-primary/20 rounded-xl p-5 space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total Transfer Tepat:</span>
            <div className="text-3xl font-heading font-bold text-primary">
              {formatRupiah(order.amount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              *Pastikan nominal transfer sesuai persis agar sistem admin dapat mencocokkan mutasi rekening.
            </p>
          </div>

          <div className="space-y-3">
            {PAYMENT_CONFIG.bankAccounts.map((acc, idx) => (
              <div key={idx} className="border rounded-xl p-4 bg-background space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">{acc.bankName}</span>
                  {acc.branch && <span className="text-xs text-muted-foreground">{acc.branch}</span>}
                </div>
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-dashed font-mono text-base">
                  <span className="font-bold tracking-wider">{acc.accountNumber}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Atas Nama: <span className="font-medium text-foreground">{acc.accountHolder}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">Panduan Transfer:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Sertakan keterangan: <strong>MBR-{order.id.slice(0, 8).toUpperCase()}</strong> pada berita transfer.</li>
              <li>Simpan bukti transfer m-banking / ATM untuk diunggah pada form konfirmasi.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Form Konfirmasi Pembayaran */}
      <div className="lg:col-span-5 space-y-6">
        <div className="border rounded-2xl p-6 bg-card shadow-xs space-y-5">
          <div className="border-b pb-3">
            <h2 className="text-base font-heading font-medium">Unggah Bukti Transfer</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kirimkan rincian dan foto struk untuk verifikasi manual
            </p>
          </div>

          <form onSubmit={handleSubmitConfirmation} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama Pemilik Rekening Pengirim</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Nama sesuai buku tabungan"
                required
                disabled={isVerified}
                className="w-full text-xs px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Bank Pengirim</label>
                <select
                  value={senderBank}
                  onChange={(e) => setSenderBank(e.target.value)}
                  disabled={isVerified}
                  className="w-full text-xs px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nominal Ditransfer</label>
                <input
                  type="text"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  disabled={isVerified}
                  required
                  className="w-full text-xs px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
            </div>

            {/* Upload Area */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-foreground">Foto Struk / Screenshot Transfer</label>
              
              {!previewUrl ? (
                <label className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors">
                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs font-medium text-foreground">
                    {isUploading ? "Mengunggah..." : "Klik untuk memilih file gambar"}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1">PNG, JPG, JPEG (Maks. 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading || isVerified}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative h-44 w-full rounded-xl border bg-muted overflow-hidden flex items-center justify-center">
                    <Image
                      src={previewUrl}
                      alt="Bukti Transfer"
                      fill
                      className="object-contain"
                    />
                  </div>

                  {!isVerified && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsProofModalOpen(true)}
                        className="flex-1 py-1.5 px-3 border rounded text-xs text-zinc-700 hover:bg-muted flex items-center justify-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Perbesar
                      </button>
                      <label className="flex-1 py-1.5 px-3 border rounded text-xs text-zinc-700 hover:bg-muted cursor-pointer flex items-center justify-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Ganti Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isVerified && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || !previewUrl}
                  className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Mengirim Konfirmasi...
                    </>
                  ) : (
                    "Kirim Bukti Pembayaran"
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Ringkasan Paket */}
        <div className="border rounded-2xl p-5 bg-card text-xs space-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rincian Paket</span>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tier Kemitraan:</span>
            <span className="font-semibold text-foreground">{order.tier.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Diskon Belanja:</span>
            <span className="font-bold text-emerald-600">{order.tier.discountPct}% Katalog</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Durasi Keanggotaan:</span>
            <span>{order.durationDays} Hari</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold text-sm">
            <span>Total Tagihan:</span>
            <span className="text-primary">{formatRupiah(order.amount)}</span>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isProofModalOpen && previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setIsProofModalOpen(false)}
        >
          <div className="relative max-w-lg w-full bg-background rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-semibold text-sm">Foto Bukti Pembayaran</h3>
              <button onClick={() => setIsProofModalOpen(false)} className="p-1 hover:bg-muted rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative h-96 w-full rounded bg-muted overflow-hidden">
              <Image src={previewUrl} alt="Preview" fill className="object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
