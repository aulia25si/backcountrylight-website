"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { 
  updateOrderDetails, 
  approvePaymentProof, 
  rejectPaymentProof 
} from "@/app/actions/order";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Check, 
  X, 
  Eye, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  ExternalLink
} from "lucide-react";
import { OrderStatus, PaymentStatus } from "@prisma/client";

interface AdminOrderDetailViewProps {
  order: {
    id: string;
    status: OrderStatus;
    totalAmount: number;
    shippingAddress: any;
    createdAt: string;
    updatedAt: string;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    paidAt?: string | null;
    courier?: string | null;
    courierService?: string | null;
    trackingNumber?: string | null;
    paymentProofUrl?: string | null;
    senderName?: string | null;
    senderBank?: string | null;
    transferAmount?: number | null;
    transferDate?: string | null;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      product: {
        id: string;
        name: string;
        image: string;
      };
      variant?: {
        id: string;
        name: string;
        sku?: string | null;
        imageUrl?: string | null;
      } | null;
    }>;
  };
}

export function AdminOrderDetailView({ order }: AdminOrderDetailViewProps) {
  const router = useRouter();

  // Form State (Right Column)
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(order.status);
  const [courier, setCourier] = useState(order.courier || "jne");
  const [courierService, setCourierService] = useState(order.courierService || "CTC");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "");
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Approval State
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  // Perhitungan Subtotal dan Ongkir
  const itemsSubtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingFee = order.totalAmount > itemsSubtotal ? order.totalAmount - itemsSubtotal : 0;

  const shipping = order.shippingAddress || {};
  const formattedDate = new Date(order.createdAt).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const shortId = order.id.slice(0, 8);

  // Handle Update Order (Right Column)
  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingOrder(true);
      const res = await updateOrderDetails(order.id, {
        status: orderStatus,
        courier: courier.trim(),
        courierService: courierService.trim(),
        trackingNumber: trackingNumber.trim(),
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Rincian pesanan berhasil diperbarui!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui pesanan.");
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Handle Approve Payment
  const handleApprovePayment = async () => {
    if (!confirm("Apakah Anda yakin ingin menyetujui pembayaran pesanan ini?")) return;
    try {
      setIsApproving(true);
      const res = await approvePaymentProof(order.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Pembayaran berhasil diverifikasi! Status pesanan kini Processing.");
      setOrderStatus("PROCESSING");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memverifikasi pembayaran.");
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject Payment
  const handleRejectPayment = async () => {
    if (!confirm("Apakah Anda yakin ingin menolak bukti transfer ini? Customer akan diminta mengunggah ulang.")) return;
    try {
      setIsRejecting(true);
      const res = await rejectPaymentProof(order.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Bukti transfer telah ditolak.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak bukti transfer.");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header sesuai Gambar 2 */}
      <div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-1 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Order #{shortId}
          </h1>
        </div>
        <p className="text-xs text-zinc-500 mt-1 pl-8">
          {formattedDate}
        </p>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KOLOM KIRI (col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. ORDER ITEMS CARD */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              ORDER ITEMS
            </h2>

            <div className="divide-y divide-zinc-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-12 w-12 rounded border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0">
                      {item.variant?.imageUrl || item.product?.image ? (
                        <Image
                          src={item.variant?.imageUrl || item.product?.image || ""}
                          alt={item.product?.name || "Product"}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400">
                          Gear
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 truncate">
                        {item.product?.name}
                      </p>
                      {item.variant?.name && (
                        <p className="text-[11px] text-zinc-500">
                          Varian: {item.variant.name}
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Qty: {item.quantity} × {formatRupiah(item.price)}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-zinc-900 whitespace-nowrap">
                    {formatRupiah(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-900">{formatRupiah(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Shipping Cost</span>
                <span className="font-medium text-zinc-900">{formatRupiah(shippingFee)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-zinc-900 border-t border-zinc-100 pt-2.5">
                <span>Total</span>
                <span>{formatRupiah(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* 2. CUSTOMER & SHIPPING ADDRESS CARDS (Subgrid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* CUSTOMER CARD */}
            <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-3">
              <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                CUSTOMER
              </h2>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-zinc-900 text-sm">
                  {order.user?.name || "Customer BCL"}
                </p>
                <p className="text-zinc-500">{order.user?.email || "—"}</p>
                <p className="text-zinc-500">{shipping.phone || "+6285157324007"}</p>
              </div>
            </div>

            {/* SHIPPING ADDRESS CARD */}
            <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-3">
              <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                SHIPPING ADDRESS
              </h2>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-zinc-900 text-sm">
                  {shipping.firstName} {shipping.lastName}
                </p>
                <p className="text-zinc-500">{shipping.phone || "+6285157324007"}</p>
                <p className="text-zinc-600 leading-relaxed">{shipping.street || "—"}</p>
                <p className="text-zinc-400 uppercase font-medium">
                  {shipping.city ? `${shipping.city}, ${shipping.postalCode || ""}` : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* 3. PAYMENT INFORMATION CARD sesuai Gambar 3 */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-5">
            <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              PAYMENT INFORMATION
            </h2>

            {/* Grid Status Pembayaran */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-zinc-400">External ID</p>
                <p className="font-medium text-zinc-900">—</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400">Xendit Invoice ID</p>
                <p className="font-medium text-zinc-900">—</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400">Payment Status</p>
                <p className="font-semibold text-zinc-900 capitalize">
                  {order.paymentStatus === "PAID" ? "Paid" : order.paymentStatus === "PENDING_VERIFICATION" ? "Pending Verification" : order.paymentStatus}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400">Payment Method</p>
                <p className="font-semibold text-zinc-900">Manual</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400">Paid At</p>
                <p className="text-zinc-900">
                  {order.paidAt ? new Date(order.paidAt).toLocaleDateString("id-ID") : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400">Expired At</p>
                <p className="text-zinc-900">—</p>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-800">
                Manual Transfer Details
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-zinc-400">Sender Name</p>
                  <p className="font-medium text-zinc-900">{order.senderName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-400">Sender Bank</p>
                  <p className="font-medium text-zinc-900">{order.senderBank || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-400">Transfer Amount</p>
                  <p className="font-medium text-zinc-900">
                    {order.transferAmount ? formatRupiah(order.transferAmount) : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-400">Transfer Date</p>
                  <p className="text-zinc-900">
                    {order.transferDate ? new Date(order.transferDate).toLocaleDateString("id-ID") : "—"}
                  </p>
                </div>
              </div>

              {/* Tombol View Payment Proof sesuai Gambar 3 */}
              <div className="pt-2">
                {order.paymentProofUrl ? (
                  <button
                    type="button"
                    onClick={() => setIsProofModalOpen(true)}
                    className="w-full py-2.5 px-4 border border-zinc-200 hover:bg-zinc-50 rounded text-xs font-medium text-zinc-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Payment Proof
                  </button>
                ) : (
                  <div className="w-full py-2.5 px-4 border border-zinc-200 bg-zinc-50 rounded text-xs text-center text-zinc-400">
                    Customer belum mengunggah bukti pembayaran
                  </div>
                )}
              </div>

              {/* Timestamp Verifikasi & Approval Actions */}
              <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-zinc-400">Verified At: </span>
                  <span className="font-medium text-zinc-900">
                    {order.verifiedAt ? new Date(order.verifiedAt).toLocaleString("id-ID") : "—"}
                  </span>
                  {order.verifiedBy && (
                    <span className="text-[11px] text-zinc-400 block sm:inline sm:ml-2">
                      (oleh: {order.verifiedBy})
                    </span>
                  )}
                </div>

                {/* Tombol Aksi Verifikasi Staf jika belum disetujui */}
                {order.paymentStatus !== "PAID" && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={isApproving || isRejecting}
                      onClick={handleApprovePayment}
                      className="flex-1 sm:flex-none py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isApproving ? "Menyetujui..." : "Approve Pembayaran"}
                    </button>
                    <button
                      type="button"
                      disabled={isApproving || isRejecting}
                      onClick={handleRejectPayment}
                      className="py-1.5 px-3 border border-red-200 hover:bg-red-50 text-red-600 rounded text-xs font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN (col-span-4) - STATUS CARD sesuai Gambar 2 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-5">
            <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              STATUS
            </h2>

            {/* Badges Baris Atas sesuai Gambar 2 */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-medium border border-purple-200 text-purple-600 bg-purple-50/50 capitalize">
                {order.status.toLowerCase()}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-medium border border-emerald-400 text-emerald-600 bg-emerald-50/50">
                {order.paymentStatus === "PAID" ? "Paid" : "Pending"}
              </span>
            </div>

            <form onSubmit={handleUpdateOrder} className="space-y-4">
              {/* Dropdown Order Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 block">
                  Order Status
                </label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-md bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                >
                  <option value="PENDING">pending</option>
                  <option value="PROCESSING">processing</option>
                  <option value="SHIPPED">shipped</option>
                  <option value="DELIVERED">delivered</option>
                  <option value="CANCELLED">cancelled</option>
                </select>
              </div>

              {/* Courier Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 block">
                  Courier
                </label>
                <input
                  type="text"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder="jne"
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-md bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                />
              </div>

              {/* Courier Service Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 block">
                  Courier Service
                </label>
                <input
                  type="text"
                  value={courierService}
                  onChange={(e) => setCourierService(e.target.value)}
                  placeholder="CTC"
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-md bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                />
              </div>

              {/* Tracking Number Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 block">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="123"
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-md bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800 font-mono"
                />
              </div>

              {/* Button Update Order */}
              <button
                type="submit"
                disabled={isUpdatingOrder}
                className="w-full py-2.5 px-4 bg-zinc-900 text-white rounded-md text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {isUpdatingOrder ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Order"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Lightbox untuk View Payment Proof */}
      {isProofModalOpen && order.paymentProofUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsProofModalOpen(false)}
        >
          <div
            className="relative max-w-xl w-full bg-white rounded-lg p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-semibold text-sm text-zinc-900">
                  Bukti Transfer #{shortId}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Pengirim: {order.senderName || "—"} ({order.senderBank || "—"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProofModalOpen(false)}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative w-full h-96 rounded bg-zinc-100 overflow-hidden border">
              <Image
                src={order.paymentProofUrl}
                alt="Payment Proof"
                fill
                className="object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-600 pt-2 border-t">
              <span>Nominal: <strong>{order.transferAmount ? formatRupiah(order.transferAmount) : formatRupiah(order.totalAmount)}</strong></span>
              <a
                href={order.paymentProofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                <span>Buka Gambar Asli</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
