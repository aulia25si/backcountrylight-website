import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { OrderStatusDropdown } from "@/components/admin/OrderStatusDropdown";
import { ShoppingBag, Clock, PackageCheck, Truck, ExternalLink } from "lucide-react";

export const metadata = {
  title: "Kelola Pesanan | Admin BCL",
};

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      items: {
        include: {
          product: { select: { id: true, name: true, image: true } },
          variant: { select: { id: true, name: true, sku: true } },
        },
      },
    },
  });

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const processingCount = orders.filter((o) => o.status === "PROCESSING").length;
  const shippedCount = orders.filter((o) => o.status === "SHIPPED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-medium text-zinc-900 tracking-tight">Orders</h1>
          <p className="text-zinc-500 mt-1">Kelola transaksi dan verifikasi pembayaran manual transfer bank</p>
        </div>
      </div>

      {/* Summary Metrik */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase">
            <span>Total Orders</span>
            <ShoppingBag className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-semibold text-zinc-900 mt-2">{orders.length}</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase">
            <span>Menunggu Pembayaran</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-semibold text-amber-900 mt-2">{pendingCount}</div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold uppercase">
            <span>Pembayaran Terverifikasi</span>
            <PackageCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-semibold text-blue-900 mt-2">{processingCount}</div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-purple-700 text-xs font-semibold uppercase">
            <span>Dalam Pengiriman</span>
            <Truck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-semibold text-purple-900 mt-2">{shippedCount}</div>
        </div>
      </div>

      {/* Tabel Pesanan */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50/50">
                <th className="px-6 py-4">ORDER ID & TANGGAL</th>
                <th className="px-6 py-4">PELANGGAN</th>
                <th className="px-6 py-4">ITEM PESANAN</th>
                <th className="px-6 py-4">TOTAL PEMBAYARAN</th>
                <th className="px-6 py-4 text-center">STATUS PEMBAYARAN</th>
                <th className="px-6 py-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    Belum ada pesanan yang masuk.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-medium text-zinc-900 text-xs">{order.id}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900 text-sm">{order.user.name || "Customer"}</div>
                        <div className="text-xs text-zinc-500">{order.user.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1 max-w-xs">
                          {order.items.map((item) => (
                            <div key={item.id} className="text-xs text-zinc-700 leading-snug">
                              <span className="font-medium text-zinc-900">{item.quantity}x</span> {item.product?.name}
                              {item.variant?.name && (
                                <span className="text-zinc-500 text-[11px] block pl-4">
                                  ↳ Varian: {item.variant.name}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900">{formatRupiah(order.totalAmount)}</div>
                        <div className="text-[11px] text-zinc-500">Manual Transfer</div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <OrderStatusDropdown orderId={order.id} currentStatus={order.status} />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/orders/${order.id}`}
                          target="_blank"
                          className="inline-flex items-center text-xs font-medium text-zinc-600 hover:text-zinc-900 underline underline-offset-4 gap-1"
                        >
                          <span>Lihat Invoice</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
