"use client";

import { useState } from "react";
import Image from "next/image";
import { formatRupiah } from "@/lib/utils";
import { submitPaymentProof } from "@/app/actions/order";
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
  ExternalLink
} from "lucide-react";

interface PaymentProofSectionProps {
  orderId: string;
  orderTotal: number;
  paymentStatus: "UNPAID" | "PENDING_VERIFICATION" | "PAID" | "REJECTED";
  paymentProofUrl?: string | null;
  senderName?: string | null;
  senderBank?: string | null;
  transferAmount?: number | null;
  transferDate?: string | Date | null;
  verifiedAt?: string | Date | null;
  customerName?: string | null;
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
  "PERMATA",
  "LAINNYA",
];

export function PaymentProofSection({
  orderId,
  orderTotal,
  paymentStatus,
  paymentProofUrl: initialProofUrl,
  senderName: initialSenderName,
  senderBank: initialSenderBank,
  transferAmount: initialAmount,
  transferDate: initialDate,
  verifiedAt,
  customerName,
}: PaymentProofSectionProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialProofUrl || null);
  const [senderName, setSenderName] = useState(initialSenderName || customerName || "");
  const [senderBank, setSenderBank] = useState(initialSenderBank || "BCA");
  const [customBank, setCustomBank] = useState("");
  const [transferAmount, setTransferAmount] = useState(initialAmount || orderTotal);
  const [transferDate, setTransferDate] = useState(
    initialDate ? new Date(initialDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Format file harus berupa gambar (JPG, PNG, atau WEBP)");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5 MB");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!previewUrl && !file) {
      toast.error("Silakan pilih file bukti transfer terlebih dahulu.");
      return;
    }

    if (!senderName.trim()) {
      toast.error("Nama pemilik rekening pengirim wajib diisi.");
      return;
    }

    const finalBank = senderBank === "LAINNYA" ? customBank.trim() : senderBank;
    if (!finalBank) {
      toast.error("Bank pengirim wajib diisi.");
      return;
    }

    if (!transferAmount || transferAmount <= 0) {
      toast.error("Nominal transfer tidak valid.");
      return;
    }

    try {
      setIsUploading(true);
      let uploadedUrl = previewUrl;

      // 1. Jika ada file baru dipilih, upload ke Supabase Storage via endpoint
      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload/payment-proof", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || "Gagal mengunggah gambar bukti transfer.");
        }

        uploadedUrl = uploadData.url;
      }

      if (!uploadedUrl) {
        throw new Error("Gagal memproses URL bukti transfer.");
      }

      // 2. Kirim rincian ke Server Action
      const result = await submitPaymentProof({
        orderId,
        paymentProofUrl: uploadedUrl,
        senderName: senderName.trim(),
        senderBank: finalBank.toUpperCase(),
        transferAmount: Number(transferAmount),
        transferDate: new Date(transferDate),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Bukti pembayaran berhasil diunggah! Tim BCL akan segera memverifikasi.");
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengunggah bukti pembayaran.");
    } finally {
      setIsUploading(false);
    }
  };

  // 1. Status: PAID
  if (paymentStatus === "PAID") {
    return (
      <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-emerald-800 font-semibold">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>Pembayaran Lunas & Terverifikasi</span>
        </div>
        <p className="text-xs text-emerald-700 leading-relaxed">
          Pembayaran Anda telah diverifikasi oleh tim Backcountry Light. Pesanan Anda sedang dipersiapkan untuk dikirim.
        </p>

        {initialProofUrl && (
          <div className="pt-2 flex items-center justify-between text-xs text-emerald-800 border-t border-emerald-200">
            <span>Bukti Transfer:</span>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 font-semibold text-emerald-900 underline hover:text-emerald-700"
            >
              <Eye className="h-3.5 w-3.5" />
              Lihat Bukti
            </button>
          </div>
        )}

        {/* Modal Lightbox */}
        {isModalOpen && initialProofUrl && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <div className="relative max-w-lg w-full bg-white rounded-lg p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold text-sm">Bukti Pembayaran</span>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-zinc-100 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative w-full h-80 rounded overflow-hidden bg-zinc-100">
                <Image src={initialProofUrl} alt="Bukti Transfer" fill className="object-contain" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Status: PENDING_VERIFICATION (Sedang Ditinjau) & Tidak Sedang Diedit
  if (paymentStatus === "PENDING_VERIFICATION" && !isEditing) {
    return (
      <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <Clock className="h-5 w-5 text-amber-600" />
            <span>Bukti Transfer Sedang Diverifikasi</span>
          </div>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-200/80 text-amber-900">
            Menunggu Admin
          </span>
        </div>

        <p className="text-xs text-amber-800 leading-relaxed">
          Terima kasih! Bukti transfer telah kami terima dan saat ini sedang ditinjau oleh staf kami. Status pesanan akan diperbarui setelah pembayaran terkonfirmasi.
        </p>

        <div className="bg-white/80 border border-amber-200 rounded-lg p-4 space-y-2 text-xs text-zinc-700">
          <div className="flex justify-between">
            <span className="text-zinc-500">Nama Pengirim:</span>
            <span className="font-semibold">{initialSenderName || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Bank Pengirim:</span>
            <span className="font-semibold">{initialSenderBank || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Nominal Transfer:</span>
            <span className="font-semibold">{formatRupiah(initialAmount || orderTotal)}</span>
          </div>
          {initialDate && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Tanggal Transfer:</span>
              <span>{new Date(initialDate).toLocaleDateString("id-ID")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {initialProofUrl && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800 hover:text-black underline"
            >
              <Eye className="h-4 w-4" />
              Lihat Bukti yang Dikirim
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:text-amber-900 underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Upload Ulang Bukti
          </button>
        </div>

        {/* Modal Lightbox */}
        {isModalOpen && initialProofUrl && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <div className="relative max-w-lg w-full bg-white rounded-lg p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold text-sm">Bukti Pembayaran</span>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-zinc-100 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative w-full h-80 rounded overflow-hidden bg-zinc-100">
                <Image src={initialProofUrl} alt="Bukti Transfer" fill className="object-contain" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Status: UNPAID, REJECTED, atau sedang Mode Edit
  return (
    <div className="border border-zinc-200 rounded-xl p-6 bg-card space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-zinc-900" />
          <h2 className="text-base font-heading font-medium text-zinc-900">
            Unggah Bukti Transfer
          </h2>
        </div>
        {paymentStatus === "REJECTED" && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700 border border-red-200">
            Bukti Ditolak
          </span>
        )}
      </div>

      {paymentStatus === "REJECTED" && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Bukti pembayaran sebelumnya tidak dapat diverifikasi oleh admin. Harap periksa nominal transfer dan unggah struk yang jelas.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Upload Area */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider block">
            Foto Struk / Tangkapan Layar Transfer <span className="text-red-500">*</span>
          </label>

          {previewUrl ? (
            <div className="relative border rounded-lg p-2 bg-zinc-50 flex items-center gap-3">
              <div className="relative h-20 w-20 rounded overflow-hidden bg-zinc-200 shrink-0 border">
                <Image src={previewUrl} alt="Preview Bukti" fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-900 truncate">
                  {file ? file.name : "Bukti transfer tersimpan"}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Siap diverifikasi"}
                </p>
                <div className="flex gap-2 mt-1">
                  <label className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer">
                    Ganti Foto
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-50/50">
              <UploadCloud className="h-8 w-8 text-zinc-400 mb-2" />
              <span className="text-xs font-medium text-zinc-700">Klik untuk memilih file foto bukti transfer</span>
              <span className="text-[11px] text-zinc-400 mt-1">PNG, JPG, JPEG, atau WEBP (Maks. 5 MB)</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Input Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">
              Nama Pemilik Rekening <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Contoh: Rasyid Tarmizi"
              className="w-full text-xs px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">
              Bank Pengirim <span className="text-red-500">*</span>
            </label>
            <select
              value={senderBank}
              onChange={(e) => setSenderBank(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 bg-white"
            >
              {COMMON_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {senderBank === "LAINNYA" && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Sebutkan Nama Bank</label>
            <input
              type="text"
              required
              value={customBank}
              onChange={(e) => setCustomBank(e.target.value)}
              placeholder="Contoh: Bank Nagari / BPD"
              className="w-full text-xs px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 bg-white"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">
              Nominal Transfer (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              value={transferAmount}
              onChange={(e) => setTransferAmount(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Tanggal Transfer</label>
            <input
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 bg-white"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={isUploading}
            className="flex-1 py-2.5 px-4 bg-zinc-900 text-white rounded-md text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Mengunggah Bukti...
              </>
            ) : (
              <>
                <FileCheck2 className="h-4 w-4" />
                Kirim Bukti Pembayaran
              </>
            )}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="py-2.5 px-4 border rounded-md text-xs font-medium hover:bg-zinc-50"
            >
              Batal
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
