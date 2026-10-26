import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata = {
  title: "Checkout | Backcountry Light",
  description: "Secure checkout.",
};

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login?callbackUrl=/checkout");
  }

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  // Ambil membership aktif jika ada untuk estimasi UI checkout
  const activeMembership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
    },
    include: { tier: true },
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
      <h1 className="text-3xl font-heading font-medium mb-10">Checkout</h1>
      
      <CheckoutForm 
        addresses={addresses} 
        email={session.user.email || ""} 
        membership={activeMembership ? {
          tierType: activeMembership.tierType,
          tierName: activeMembership.tier.name,
          discountPct: activeMembership.discountPct,
        } : null}
      />
    </div>
  );
}
