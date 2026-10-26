import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminTierConfigClientView } from "@/components/admin/AdminTierConfigClientView";

export const metadata = {
  title: "Konfigurasi Tier Membership | Admin BCL",
};

export default async function AdminMembershipTiersPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  const rawTiers = await prisma.membershipTier.findMany({
    orderBy: { price: "asc" },
  });

  const tiers = rawTiers.map((t) => ({
    id: t.id,
    type: t.type,
    name: t.name,
    price: t.price,
    durationDays: t.durationDays,
    discountPct: t.discountPct,
    description: t.description,
    benefits: t.benefits,
  }));

  return <AdminTierConfigClientView initialTiers={tiers} />;
}
