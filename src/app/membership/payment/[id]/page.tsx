import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MembershipPaymentView } from "@/components/membership/MembershipPaymentView";

export const metadata = {
  title: "Pembayaran Membership | Backcountry Light",
  description: "Instruksi dan konfirmasi pembayaran manual transfer membership Backcountry Light.",
};

export default async function MembershipPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const order = await prisma.membershipOrder.findUnique({
    where: { id },
    include: {
      tier: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Verifikasi kepemilikan atau role admin/staff
  const isOwner = order.userId === session.user.id;
  const isStaff = session.user.role === "ADMIN" || session.user.role === "STAFF";

  if (!isOwner && !isStaff) {
    notFound();
  }

  const serializedOrder = {
    ...order,
    transferDate: order.transferDate ? order.transferDate.toISOString() : null,
    verifiedAt: order.verifiedAt ? order.verifiedAt.toISOString() : null,
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-5xl space-y-6">
      <Link
        href="/membership"
        className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Kembali ke Halaman Membership
      </Link>

      <div className="border-b pb-4">
        <span className="text-[11px] font-mono uppercase text-muted-foreground">Order ID: #{order.id}</span>
        <h1 className="text-2xl font-heading font-semibold text-foreground tracking-tight mt-0.5">
          Pembayaran Membership {order.tier.name}
        </h1>
      </div>

      <MembershipPaymentView order={serializedOrder as any} />
    </div>
  );
}
