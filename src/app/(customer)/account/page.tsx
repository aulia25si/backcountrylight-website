import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { PackageX, ExternalLink, Clock, PackageCheck, Truck, CheckCircle, XCircle } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { getCurrentUserMembership } from "@/app/actions/membership";
import { MembershipStatusBanner } from "@/components/account/MembershipStatusBanner";

export const metadata = {
  title: "My Orders | Backcountry Light",
  description: "View your order history.",
};

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) return null;

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { 
          product: true,
          variant: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const { membership, activeOrder } = await getCurrentUserMembership();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Menunggu Pembayaran",
          className: "bg-amber-100 text-amber-800 border-amber-300",
          icon: Clock,
        };
      case "PROCESSING":
        return {
          label: "Pembayaran Terverifikasi",
          className: "bg-blue-100 text-blue-800 border-blue-300",
          icon: PackageCheck,
        };
      case "SHIPPED":
        return {
          label: "Dalam Pengiriman",
          className: "bg-purple-100 text-purple-800 border-purple-300",
          icon: Truck,
        };
      case "DELIVERED":
        return {
          label: "Selesai",
          className: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: CheckCircle,
        };
      case "CANCELLED":
        return {
          label: "Dibatalkan",
          className: "bg-red-100 text-red-800 border-red-300",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          className: "bg-zinc-100 text-zinc-800 border-zinc-200",
          icon: Clock,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Ringkasan Membership Partner */}
      <MembershipStatusBanner membership={membership} activeOrder={activeOrder} />

      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Riwayat Pesanan</h1>
        <p className="text-muted-foreground text-sm mt-1">Pantau status transaksi dan instruksi pembayaran Anda.</p>
      </div>

      {orders.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-4">
            <PackageX className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-2">Belum ada pesanan</h2>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Anda belum memiliki riwayat pesanan. Jelajahi katalog perlengkapan outdoor ultralight kami!
          </p>
          <Button render={<Link href="/shop" />}>
            Mulai Belanja
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const statusConfig = getStatusBadge(order.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={order.id} className="border rounded-lg p-6 bg-card shadow-sm">
                <div className="flex flex-wrap gap-4 items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Order ID</p>
                    <p className="font-semibold text-sm font-mono">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tanggal</p>
                    <p className="font-medium text-sm">
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                    <p className="font-semibold text-sm">
                      {formatRupiah(order.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
                
                {/* Items preview */}
                <div className="space-y-3 mb-5">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="relative h-14 w-14 bg-muted rounded overflow-hidden flex-shrink-0 border">
                        {item.variant?.imageUrl || item.product?.image ? (
                          <Image 
                            src={item.variant?.imageUrl || item.product?.image || ""} 
                            alt={item.product?.name || "Gear"} 
                            fill 
                            className="object-cover" 
                            sizes="56px" 
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted text-xs text-muted-foreground">
                            Gear
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product?.name || "Produk"}</p>
                        {item.variant?.name && (
                          <p className="text-xs text-primary font-medium">Varian: {item.variant.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Jumlah: {item.quantity}</p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-medium text-sm">{formatRupiah(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card Action Link */}
                <div className="border-t pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    {order.status === "PENDING" 
                      ? "Menunggu pembayaran manual via transfer bank." 
                      : "Pembayaran telah dicatat dalam sistem BCL."}
                  </p>
                  <Button 
                    variant={order.status === "PENDING" ? "default" : "outline"} 
                    size="sm"
                    className="h-9 px-4 text-xs font-medium"
                    render={<Link href={`/orders/${order.id}`} />}
                  >
                    <span>{order.status === "PENDING" ? "Lihat Instruksi Pembayaran" : "Rincian Pesanan"}</span>
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
