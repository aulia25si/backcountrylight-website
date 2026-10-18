import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";

export const metadata = {
  title: "Orders | Admin BCL",
};

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  const rawOrders = await prisma.order.findMany({
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

  // Serialize orders for client component
  const orders = rawOrders.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    transferDate: order.transferDate ? order.transferDate.toISOString() : null,
    verifiedAt: order.verifiedAt ? order.verifiedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Orders</h1>
        <p className="text-xs text-zinc-500 mt-1">Manage customer orders</p>
      </div>

      {/* Interactive Orders Filter & Table (Sesuai Referensi Gambar 1) */}
      <AdminOrdersTable initialOrders={orders as any} />
    </div>
  );
}
