"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { MembershipTierType, MembershipStatus, PaymentStatus } from "@prisma/client";

/**
 * Mendapatkan semua tier membership yang aktif & terkonfigurasi di sistem
 */
export async function getMembershipTiers() {
  try {
    const tiers = await prisma.membershipTier.findMany({
      orderBy: { price: "asc" },
    });
    return { success: true, tiers };
  } catch (error: any) {
    console.error("getMembershipTiers error:", error);
    return { error: "Gagal mengambil daftar tier membership." };
  }
}

/**
 * Mendapatkan status membership aktif / terkini dari user yang sedang login
 */
export async function getCurrentUserMembership() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { membership: null, activeOrder: null };
  }

  try {
    // 1. Cek membership aktif terlebih dahulu
    const activeMembership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      include: {
        tier: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeMembership) {
      return { membership: activeMembership, activeOrder: null };
    }

    // 2. Jika tidak ada yang aktif, cek apakah ada order membership yang pending (UNPAID / PENDING_VERIFICATION)
    const pendingOrder = await prisma.membershipOrder.findFirst({
      where: {
        userId: session.user.id,
        paymentStatus: {
          in: ["UNPAID", "PENDING_VERIFICATION"],
        },
      },
      include: {
        tier: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Cek membership terakhir (bisa EXPIRED atau PENDING atau REVOKED)
    const latestMembership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: { tier: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      membership: latestMembership,
      activeOrder: pendingOrder,
    };
  } catch (error: any) {
    console.error("getCurrentUserMembership error:", error);
    return { membership: null, activeOrder: null };
  }
}

export interface RegisterMembershipParams {
  tierType: MembershipTierType;
  businessName: string;
  businessType?: string;
  phoneNumber?: string;
  isRenewal?: boolean;
}

/**
 * Customer mengajukan pendaftaran/perpanjangan membership & membuat order pembayaran manual
 */
export async function registerOrRenewMembership(data: RegisterMembershipParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Silakan login terlebih dahulu untuk mendaftar membership." };
  }

  if (!data.tierType || !data.businessName?.trim()) {
    return { error: "Pilihan tier dan Nama Usaha / Brand wajib diisi." };
  }

  try {
    const tierConfig = await prisma.membershipTier.findUnique({
      where: { type: data.tierType },
    });

    if (!tierConfig) {
      return { error: "Tier membership yang dipilih tidak ditemukan." };
    }

    // Cek apakah user sudah memiliki membership aktif
    const existingActive = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    });

    // Cek jika ada order membership yang sedang PENDING_VERIFICATION
    const pendingVerification = await prisma.membershipOrder.findFirst({
      where: {
        userId: session.user.id,
        paymentStatus: "PENDING_VERIFICATION",
      },
    });

    if (pendingVerification) {
      return {
        error: "Anda memiliki pesanan membership yang sedang dalam proses verifikasi pembayaran oleh Admin.",
        orderId: pendingVerification.id,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat atau perbarui entri Membership record berstatus PENDING
      let membership = await tx.membership.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });

      if (!membership || membership.status === "REVOKED" || membership.status === "EXPIRED") {
        membership = await tx.membership.create({
          data: {
            userId: session.user.id,
            tierType: tierConfig.type,
            status: "PENDING",
            discountPct: tierConfig.discountPct,
            businessName: data.businessName.trim(),
            businessType: data.businessType?.trim() || "Reseller",
            phoneNumber: data.phoneNumber?.trim() || null,
          },
        });
      } else {
        // Update data profil usaha dan tier yang diajukan
        membership = await tx.membership.update({
          where: { id: membership.id },
          data: {
            tierType: tierConfig.type,
            discountPct: tierConfig.discountPct,
            businessName: data.businessName.trim(),
            businessType: data.businessType?.trim() || membership.businessType,
            phoneNumber: data.phoneNumber?.trim() || membership.phoneNumber,
          },
        });
      }

      // 2. Buat MembershipOrder untuk pembayaran manual
      const order = await tx.membershipOrder.create({
        data: {
          userId: session.user.id,
          membershipId: membership.id,
          tierType: tierConfig.type,
          amount: tierConfig.price,
          durationDays: tierConfig.durationDays,
          isRenewal: !!data.isRenewal || !!existingActive,
          paymentStatus: "UNPAID",
          paymentMethod: "MANUAL_BANK_TRANSFER",
        },
      });

      return { membership, order };
    });

    revalidatePath("/membership");
    revalidatePath("/account");
    return { success: true, orderId: result.order.id };
  } catch (error: any) {
    console.error("registerOrRenewMembership error:", error);
    return { error: error.message || "Gagal membuat pendaftaran membership." };
  }
}

export interface SubmitMembershipProofParams {
  orderId: string;
  paymentProofUrl: string;
  senderName: string;
  senderBank: string;
  transferAmount: number;
  transferDate?: string | Date;
}

/**
 * Customer mengunggah bukti transfer manual untuk pesanan membership
 */
export async function submitMembershipPaymentProof(data: SubmitMembershipProofParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Silakan login untuk mengunggah bukti pembayaran." };
  }

  if (!data.orderId || !data.paymentProofUrl || !data.senderName || !data.senderBank || !data.transferAmount) {
    return { error: "Semua data konfirmasi pembayaran wajib diisi." };
  }

  try {
    const order = await prisma.membershipOrder.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      return { error: "Pesanan membership tidak ditemukan." };
    }

    if (order.userId !== session.user.id) {
      return { error: "Akses ditolak. Pesanan bukan milik akun Anda." };
    }

    if (order.paymentStatus === "PAID") {
      return { error: "Pesanan ini sudah berhasil diverifikasi sebelumnya." };
    }

    await prisma.membershipOrder.update({
      where: { id: data.orderId },
      data: {
        paymentProofUrl: data.paymentProofUrl,
        senderName: data.senderName.trim(),
        senderBank: data.senderBank.trim().toUpperCase(),
        transferAmount: data.transferAmount,
        transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
        paymentStatus: "PENDING_VERIFICATION",
        rejectionReason: null,
      },
    });

    revalidatePath("/membership");
    revalidatePath(`/membership/payment/${data.orderId}`);
    revalidatePath("/admin/membership");
    return { success: true };
  } catch (error: any) {
    console.error("submitMembershipPaymentProof error:", error);
    return { error: error.message || "Gagal mengirim bukti pembayaran." };
  }
}

/**
 * Helper verifikasi staff/admin
 */
async function verifyAdminOrStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    throw new Error("Akses ditolak. Tindakan ini memerlukan hak akses Admin atau Staf.");
  }
  return session;
}

/**
 * Admin/Staff menyetujui (Approve) pembayaran membership dan langsung mengaktifkan membership
 * Dilengkapi pencegahan aktivasi ganda (idempotency check)
 */
export async function approveMembershipPayment(orderId: string) {
  let session;
  try {
    session = await verifyAdminOrStaff();
  } catch (err: any) {
    return { error: err.message };
  }

  try {
    const order = await prisma.membershipOrder.findUnique({
      where: { id: orderId },
      include: {
        tier: true,
        membership: true,
      },
    });

    if (!order) {
      return { error: "Pesanan membership tidak ditemukan." };
    }

    // Idempotency: Jika sudah PAID, tidak boleh diproses ulang
    if (order.paymentStatus === "PAID") {
      return { error: "Pembayaran pesanan membership ini sudah diverifikasi sebelumnya." };
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Tentukan tanggal kedaluwarsa baru
      // Jika customer sudah punya membership aktif dan belum kedaluwarsa, tambahkan durasi ke tanggal expiresAt sebelumnya
      let startDate = now;
      let expiresAt = new Date(now.getTime() + order.durationDays * 24 * 60 * 60 * 1000);

      const existingActive = await tx.membership.findFirst({
        where: {
          userId: order.userId,
          status: "ACTIVE",
          expiresAt: { gt: now },
        },
      });

      if (existingActive && existingActive.expiresAt && existingActive.expiresAt > now) {
        // Perpanjangan: tambah durasi dari expiresAt sebelumnya
        startDate = existingActive.startDate || now;
        expiresAt = new Date(existingActive.expiresAt.getTime() + order.durationDays * 24 * 60 * 60 * 1000);
      }

      // 2. Update atau create Membership menjadi ACTIVE
      let targetMembershipId = order.membershipId;
      if (targetMembershipId) {
        await tx.membership.update({
          where: { id: targetMembershipId },
          data: {
            status: "ACTIVE",
            tierType: order.tierType,
            discountPct: order.tier.discountPct,
            startDate,
            expiresAt,
          },
        });
      } else {
        const newMembership = await tx.membership.create({
          data: {
            userId: order.userId,
            status: "ACTIVE",
            tierType: order.tierType,
            discountPct: order.tier.discountPct,
            startDate,
            expiresAt,
          },
        });
        targetMembershipId = newMembership.id;
      }

      // 3. Update status order menjadi PAID
      await tx.membershipOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          membershipId: targetMembershipId,
          paidAt: now,
          verifiedAt: now,
          verifiedBy: session.user.name || session.user.email || "Admin",
          rejectionReason: null,
        },
      });

      // 4. Catat Audit Log
      await tx.membershipAuditLog.create({
        data: {
          membershipId: targetMembershipId,
          membershipOrderId: order.id,
          adminId: session.user.id,
          action: "APPROVE_PAYMENT",
          details: `Pembayaran disetujui sebesar Rp ${order.amount.toLocaleString("id-ID")}. Tier diaktifkan: ${order.tierType} hingga ${expiresAt.toLocaleDateString("id-ID")}.`,
        },
      });
    });

    revalidatePath("/admin/membership");
    revalidatePath("/admin/membership/orders");
    revalidatePath("/membership");
    revalidatePath("/account");
    return { success: true };
  } catch (error: any) {
    console.error("approveMembershipPayment error:", error);
    return { error: error.message || "Gagal menyetujui pembayaran membership." };
  }
}

/**
 * Admin/Staff menolak pembayaran transfer manual membership
 */
export async function rejectMembershipPayment(orderId: string, reason?: string) {
  let session;
  try {
    session = await verifyAdminOrStaff();
  } catch (err: any) {
    return { error: err.message };
  }

  try {
    const order = await prisma.membershipOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { error: "Pesanan membership tidak ditemukan." };
    }

    if (order.paymentStatus === "PAID") {
      return { error: "Tidak dapat menolak pesanan yang statusnya sudah PAID." };
    }

    const rejectionReason = reason?.trim() || "Bukti transfer tidak valid atau dana belum masuk.";

    await prisma.$transaction(async (tx) => {
      await tx.membershipOrder.update({
        where: { id: orderId },
        data: {
          paymentStatus: "REJECTED",
          rejectionReason,
        },
      });

      await tx.membershipAuditLog.create({
        data: {
          membershipId: order.membershipId,
          membershipOrderId: order.id,
          adminId: session.user.id,
          action: "REJECT_PAYMENT",
          details: `Pembayaran ditolak. Alasan: ${rejectionReason}`,
        },
      });
    });

    revalidatePath("/admin/membership");
    revalidatePath("/admin/membership/orders");
    revalidatePath("/membership");
    return { success: true };
  } catch (error: any) {
    console.error("rejectMembershipPayment error:", error);
    return { error: error.message || "Gagal menolak pembayaran." };
  }
}

/**
 * Admin memberikan / assign membership secara manual ke customer terdaftar (Bypass Payment)
 */
export async function adminAssignMembership(params: {
  userId: string;
  tierType: MembershipTierType;
  durationDays?: number;
  adminNotes?: string;
}) {
  let session;
  try {
    session = await verifyAdminOrStaff();
  } catch (err: any) {
    return { error: err.message };
  }

  if (!params.userId || !params.tierType) {
    return { error: "Customer dan Tier wajib dipilih." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      return { error: "Customer tidak ditemukan." };
    }

    const tierConfig = await prisma.membershipTier.findUnique({
      where: { type: params.tierType },
    });

    if (!tierConfig) {
      return { error: "Tier tidak ditemukan." };
    }

    const days = params.durationDays && params.durationDays > 0 ? params.durationDays : tierConfig.durationDays;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      // Cari apakah sudah ada membership record
      const existing = await tx.membership.findFirst({
        where: { userId: params.userId },
        orderBy: { createdAt: "desc" },
      });

      let membershipId = existing?.id;

      if (existing) {
        await tx.membership.update({
          where: { id: existing.id },
          data: {
            tierType: params.tierType,
            status: "ACTIVE",
            discountPct: tierConfig.discountPct,
            startDate: now,
            expiresAt,
            adminNotes: params.adminNotes?.trim() || existing.adminNotes,
          },
        });
      } else {
        const created = await tx.membership.create({
          data: {
            userId: params.userId,
            tierType: params.tierType,
            status: "ACTIVE",
            discountPct: tierConfig.discountPct,
            startDate: now,
            expiresAt,
            adminNotes: params.adminNotes?.trim() || null,
          },
        });
        membershipId = created.id;
      }

      // Catat Audit Log
      await tx.membershipAuditLog.create({
        data: {
          membershipId,
          adminId: session.user.id,
          action: "MANUAL_ASSIGN",
          details: `Admin ${session.user.name || session.user.email} memberikan membership ${params.tierType} manual (${days} hari). Catatan: ${params.adminNotes || "-"}`,
        },
      });
    });

    revalidatePath("/admin/membership");
    revalidatePath("/membership");
    return { success: true };
  } catch (error: any) {
    console.error("adminAssignMembership error:", error);
    return { error: error.message || "Gagal memberikan membership manual." };
  }
}

/**
 * Admin memperbarui tier atau masa berlaku membership
 */
export async function adminUpdateMembership(params: {
  membershipId: string;
  tierType: MembershipTierType;
  expiresAt: string | Date;
  status: MembershipStatus;
  adminNotes?: string;
}) {
  let session;
  try {
    session = await verifyAdminOrStaff();
  } catch (err: any) {
    return { error: err.message };
  }

  try {
    const existing = await prisma.membership.findUnique({
      where: { id: params.membershipId },
      include: { user: true },
    });

    if (!existing) {
      return { error: "Data membership tidak ditemukan." };
    }

    const tierConfig = await prisma.membershipTier.findUnique({
      where: { type: params.tierType },
    });

    if (!tierConfig) {
      return { error: "Tier tidak valid." };
    }

    const newExpiresAt = new Date(params.expiresAt);

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: params.membershipId },
        data: {
          tierType: params.tierType,
          discountPct: tierConfig.discountPct,
          status: params.status,
          expiresAt: newExpiresAt,
          adminNotes: params.adminNotes !== undefined ? params.adminNotes.trim() : existing.adminNotes,
        },
      });

      await tx.membershipAuditLog.create({
        data: {
          membershipId: params.membershipId,
          adminId: session.user.id,
          action: "UPDATE_MEMBERSHIP",
          details: `Perubahan: Tier=${params.tierType}, Status=${params.status}, Exp=${newExpiresAt.toLocaleDateString("id-ID")}. Catatan: ${params.adminNotes || "-"}`,
        },
      });
    });

    revalidatePath("/admin/membership");
    revalidatePath("/membership");
    return { success: true };
  } catch (error: any) {
    console.error("adminUpdateMembership error:", error);
    return { error: error.message || "Gagal memperbarui membership." };
  }
}

/**
 * Admin mencabut (revoke) membership customer
 */
export async function adminRevokeMembership(membershipId: string, reason?: string) {
  let session;
  try {
    session = await verifyAdminOrStaff();
  } catch (err: any) {
    return { error: err.message };
  }

  try {
    const existing = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!existing) {
      return { error: "Data membership tidak ditemukan." };
    }

    const revocationReason = reason?.trim() || "Dicabut oleh Admin.";

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: membershipId },
        data: {
          status: "REVOKED",
        },
      });

      await tx.membershipAuditLog.create({
        data: {
          membershipId,
          adminId: session.user.id,
          action: "REVOKE",
          details: `Membership dicabut oleh ${session.user.name || session.user.email}. Alasan: ${revocationReason}`,
        },
      });
    });

    revalidatePath("/admin/membership");
    revalidatePath("/membership");
    return { success: true };
  } catch (error: any) {
    console.error("adminRevokeMembership error:", error);
    return { error: error.message || "Gagal mencabut membership." };
  }
}

/**
 * Admin mengupdate konfigurasi harga dan durasi tier membership
 */
export async function updateTierConfig(params: {
  tierType: MembershipTierType;
  price: number;
  durationDays: number;
  discountPct: number;
  description?: string;
}) {
  let session;
  try {
    session = await verifyAdminOrStaff();
  } catch (err: any) {
    return { error: err.message };
  }

  if (params.price < 0 || params.durationDays <= 0 || params.discountPct < 0 || params.discountPct > 100) {
    return { error: "Parameter harga, durasi, atau diskon tidak valid." };
  }

  try {
    await prisma.membershipTier.update({
      where: { type: params.tierType },
      data: {
        price: params.price,
        durationDays: params.durationDays,
        discountPct: params.discountPct,
        description: params.description?.trim() || undefined,
      },
    });

    await prisma.membershipAuditLog.create({
      data: {
        adminId: session.user.id,
        action: "UPDATE_TIER_CONFIG",
        details: `Update Tier ${params.tierType}: Harga=Rp ${params.price.toLocaleString("id-ID")}, Durasi=${params.durationDays} hari, Diskon=${params.discountPct}%`,
      },
    });

    revalidatePath("/admin/membership/tiers");
    revalidatePath("/membership");
    return { success: true };
  } catch (error: any) {
    console.error("updateTierConfig error:", error);
    return { error: error.message || "Gagal memperbarui konfigurasi tier." };
  }
}
