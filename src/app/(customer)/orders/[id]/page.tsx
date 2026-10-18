import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";
import { PAYMENT_CONFIG } from "@/lib/payment-config";
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Building2, 
  Copy, 
  AlertTriangle, 
  ArrowLeft,
  PackageCheck,
  Truck,
  CheckCircle,
  XCircle
} from "lucide-react";
import { PaymentProofSection } from "@/components/customer/PaymentProofSection";

export const metadata = {
  title: "Konfirmasi Pesanan | Backcountry Light",
  description: "Rincian dan instruksi pembayaran pesanan Anda.",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, image: true },
          },
          variant: {
            select: { id: true, name: true, sku: true, imageUrl: true },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Hanya pemilik pesanan atau Admin/Staff yang dapat melihat
  const isOwner = order.userId === session.user.id;
  const isStaff = session.user.role === "ADMIN" || session.user.role === "STAFF";

  if (!isOwner && !isStaff) {
    notFound();
  }

  const shippingAddress: any = order.shippingAddress || {};

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Menunggu Pembayaran",
          description: "Pesanan telah tersimpan. Silakan lakukan transfer ke rekening resmi di bawah ini.",
          badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
          icon: Clock,
        };
      case "PROCESSING":
        return {
          label: "Pembayaran Terverifikasi",
          description: "Pembayaran telah diverifikasi oleh tim BCL. Pesanan Anda sedang dipersiapkan untuk dikirim.",
          badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
          icon: PackageCheck,
        };
      case "SHIPPED":
        return {
          label: "Dalam Pengiriman",
          description: "Paket gear Anda sedang dalam perjalanan ke alamat tujuan.",
          badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
          icon: Truck,
        };
      case "DELIVERED":
        return {
          label: "Pesanan Selesai",
          description: "Pesanan telah berhasil diterima.",
          badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: CheckCircle,
        };
      case "CANCELLED":
        return {
          label: "Pesanan Dibatalkan",
          description: "Pesanan ini telah dibatalkan.",
          badgeClass: "bg-red-100 text-red-800 border-red-300",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          description: "",
          badgeClass: "bg-zinc-100 text-zinc-800 border-zinc-300",
          icon: Clock,
        };
    }
  };

  const statusInfo = getStatusDisplay(order.status);
  const StatusIcon = statusInfo.icon;

  const itemsSubtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingFee = order.totalAmount > itemsSubtotal ? order.totalAmount - itemsSubtotal : 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-5xl">
      {/* Top Breadcrumb */}
      <div className="mb-6">
        <Link 
          href="/account" 
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Riwayat Pesanan
        </Link>
      </div>

      {/* Header Notification Banner */}
      <div className="border rounded-xl p-6 sm:p-8 bg-card mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Order ID</span>
              <span className="font-mono text-sm font-semibold">{order.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-medium tracking-tight">
              {order.status === "PENDING" ? "Pesanan Menunggu Pembayaran" : "Rincian Pesanan"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dibuat pada {new Date(order.createdAt).toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex items-center">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}>
              <StatusIcon className="h-4 w-4" />
              {statusInfo.label}
            </span>
          </div>
        </div>

        {statusInfo.description && (
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            {statusInfo.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Payment Instructions & Items */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Instruksi Pembayaran Transfer Bank (Tampil Terutama Saat PENDING) */}
          {order.status === "PENDING" && (
            <div className="border border-primary/20 rounded-xl p-6 bg-primary/[0.02] space-y-6">
              <div className="flex items-center gap-2 text-primary border-b pb-4">
                <Building2 className="h-5 w-5" />
                <h2 className="text-lg font-heading font-medium">Instruksi Pembayaran Manual Transfer Bank</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-background border rounded-lg p-4 space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Total yang Harus Ditransfer:</span>
                  <div className="text-2xl sm:text-3xl font-bold font-heading text-primary">
                    {formatRupiah(order.totalAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    *Mohon transfer tepat hingga digit terakhir untuk memudahkan verifikasi manual.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pilihan Rekening Resmi Backcountry Light:
                  </p>
                  
                  {PAYMENT_CONFIG.bankAccounts.map((acc, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-background space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{acc.bankName}</span>
                        {acc.branch && <span className="text-xs text-muted-foreground">{acc.branch}</span>}
                      </div>
                      <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded border border-dashed font-mono text-base">
                        <span className="font-bold tracking-wider">{acc.accountNumber}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Atas Nama: <span className="font-medium text-foreground">{acc.accountHolder}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground">Panduan Pembayaran:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {PAYMENT_CONFIG.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Kartu Status Pengiriman & Nomor Resi (Jika Tersedia) */}
          {order.trackingNumber && (
            <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-900 uppercase">
                    Kurir: {order.courier?.toUpperCase() || "JNE"} {order.courierService && `(${order.courierService})`}
                  </p>
                  <p className="font-mono text-sm font-bold text-zinc-900 mt-0.5">
                    No. Resi: <span className="text-purple-700">{order.trackingNumber}</span>
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-200/60 text-purple-800">
                Dalam Pengiriman
              </span>
            </div>
          )}

          {/* Form / Status Bukti Transfer Pembayaran */}
          <PaymentProofSection
            orderId={order.id}
            orderTotal={order.totalAmount}
            paymentStatus={order.paymentStatus}
            paymentProofUrl={order.paymentProofUrl}
            senderName={order.senderName}
            senderBank={order.senderBank}
            transferAmount={order.transferAmount}
            transferDate={order.transferDate}
            verifiedAt={order.verifiedAt}
            customerName={order.user?.name || shippingAddress.firstName}
          />

          {/* Daftar Barang Pesanan */}
          <div className="border rounded-xl p-6 bg-card space-y-6">
            <h2 className="text-lg font-heading font-medium border-b pb-4">Daftar Produk Pesanan</h2>
            
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-center">
                  <div className="relative h-16 w-16 bg-muted rounded-md overflow-hidden flex-shrink-0 border">
                    {item.variant?.imageUrl || item.product?.image ? (
                      <Image 
                        src={item.variant?.imageUrl || item.product?.image || ""} 
                        alt={item.product?.name || "Product"} 
                        fill 
                        className="object-cover" 
                        sizes="64px" 
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted text-xs text-muted-foreground">
                        Gear
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={item.product ? `/shop/${item.product.slug}` : "#"} 
                      className="font-medium text-sm hover:underline line-clamp-1"
                    >
                      {item.product?.name || "Item Produk"}
                    </Link>
                    {item.variant?.name && (
                      <p className="text-xs font-medium text-primary mt-0.5">
                        Varian: {item.variant.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.quantity} x {formatRupiah(item.price)}
                    </p>
                  </div>

                  <div className="text-right font-medium text-sm whitespace-nowrap">
                    {formatRupiah(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Address & Summary */}
        <div className="lg:col-span-5 space-y-6">
          {/* Shipping Address Card */}
          <div className="border rounded-xl p-6 bg-card space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-heading font-medium">Alamat Pengiriman</h2>
            </div>
            
            <div className="text-sm space-y-1">
              <p className="font-semibold text-foreground">
                {shippingAddress.firstName} {shippingAddress.lastName}
              </p>
              <p className="text-muted-foreground">{shippingAddress.street}</p>
              <p className="text-muted-foreground">
                {shippingAddress.city}, {shippingAddress.postalCode}
              </p>
            </div>
          </div>

          {/* Payment Summary Card */}
          <div className="border rounded-xl p-6 bg-card space-y-4">
            <h2 className="text-base font-heading font-medium border-b pb-3">Rincian Pembayaran</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal Barang</span>
                <span className="font-medium">{formatRupiah(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkos Kirim</span>
                <span className="font-medium">{formatRupiah(shippingFee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-3">
                <span>Total Pembayaran</span>
                <span className="text-primary font-bold">{formatRupiah(order.totalAmount)}</span>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <Button className="w-full rounded-none" render={<Link href="/account" />}>
                Lihat Semua Pesanan
              </Button>
              <Button variant="outline" className="w-full rounded-none" render={<Link href="/shop" />}>
                Lanjut Belanja
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
