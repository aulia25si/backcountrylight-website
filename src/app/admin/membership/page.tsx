import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminMembershipClientView } from "@/components/admin/AdminMembershipClientView";

export const metadata = {
  title: "Kelola Membership | Admin BCL",
};

export default async function AdminMembershipPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  // 1. Ambil seluruh data memberships
  const rawMemberships = await prisma.membership.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      tier: true,
    },
  });

  // 2. Ambil seluruh order membership yang pending verifikasi
  const rawPendingOrders = await prisma.membershipOrder.findMany({
    where: {
      paymentStatus: "PENDING_VERIFICATION",
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // 3. Ambil konfigurasi tiers
  const tiers = await prisma.membershipTier.findMany({
    orderBy: { price: "asc" },
  });

  // 4. Ambil customer terdaftar untuk opsi manual assign
  const availableCustomers = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Serialisasi tanggal untuk client component
  const memberships = rawMemberships.map((m) => ({
    ...m,
    startDate: m.startDate ? m.startDate.toISOString() : null,
    expiresAt: m.expiresAt ? m.expiresAt.toISOString() : null,
  }));

  const pendingOrders = rawPendingOrders.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <AdminMembershipClientView
        initialMemberships={memberships as any}
        initialPendingOrders={pendingOrders as any}
        tiers={tiers as any}
        availableCustomers={availableCustomers}
      />
    </div>
  );
}
