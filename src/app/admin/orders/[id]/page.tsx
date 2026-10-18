import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AdminOrderDetailView } from "@/components/admin/AdminOrderDetailView";

export const metadata = {
  title: "Detail Pesanan | Admin BCL",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  const { id } = await params;

  const rawOrder = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      items: {
        include: {
          product: { select: { id: true, name: true, image: true } },
          variant: { select: { id: true, name: true, sku: true, imageUrl: true } },
        },
      },
    },
  });

  if (!rawOrder) {
    notFound();
  }

  // Serialize dates for client component
  const order = {
    ...rawOrder,
    createdAt: rawOrder.createdAt.toISOString(),
    updatedAt: rawOrder.updatedAt.toISOString(),
    paidAt: rawOrder.paidAt ? rawOrder.paidAt.toISOString() : null,
    transferDate: rawOrder.transferDate ? rawOrder.transferDate.toISOString() : null,
    verifiedAt: rawOrder.verifiedAt ? rawOrder.verifiedAt.toISOString() : null,
  };

  return <AdminOrderDetailView order={order as any} />;
}
