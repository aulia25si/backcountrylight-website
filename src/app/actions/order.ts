"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { PAYMENT_CONFIG } from "@/lib/payment-config";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export interface OrderItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface CreateOrderParams {
  addressId: string;
  items: OrderItemInput[];
}

export async function createOrder(data: CreateOrderParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Silakan login terlebih dahulu untuk melanjutkan pemesanan." };
  }

  if (!data.addressId) {
    return { error: "Silakan pilih alamat pengiriman." };
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return { error: "Keranjang belanja Anda kosong." };
  }

  // Validasi format quantity
  for (const item of data.items) {
    if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      return { error: "Data item keranjang tidak valid." };
    }
  }

  try {
    // 1. Verifikasi kepemilikan alamat pengiriman
    const address = await prisma.address.findUnique({
      where: { id: data.addressId },
    });

    if (!address || address.userId !== session.user.id) {
      return { error: "Alamat pengiriman tidak ditemukan atau tidak valid." };
    }

    // 2. Transaksi Database Atomik (Validasi Stok & Harga Server-Side, Decrement Stok, Create Order)
    const newOrder = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const verifiedItems: {
        productId: string;
        variantId: string | null;
        quantity: number;
        unitPrice: number;
        productName: string;
        variantName?: string | null;
      }[] = [];

      for (const item of data.items) {
        // Ambil data produk langsung dari DB
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            variants: true,
          },
        });

        if (!product) {
          throw new Error("Satu atau lebih produk tidak ditemukan dalam katalog kami.");
        }

        // Kasus 1: Produk memiliki varian
        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId);

          if (!variant) {
            throw new Error(`Varian tidak valid untuk produk "${product.name}".`);
          }

          if (variant.stock < item.quantity) {
            throw new Error(`Stok untuk "${product.name} (${variant.name})" tidak mencukupi (Sisa: ${variant.stock}).`);
          }

          // Harga varian (fallback ke harga base jika variant.price null)
          const unitPrice = variant.price != null && variant.price > 0 ? variant.price : product.price;
          subtotal += unitPrice * item.quantity;

          // Pengurangan stok varian secara atomik & bersyarat untuk mencegah overselling
          const updatedVariant = await tx.productVariant.updateMany({
            where: {
              id: variant.id,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (updatedVariant.count === 0) {
            throw new Error(`Stok untuk "${product.name} (${variant.name})" baru saja habis atau tidak mencukupi.`);
          }

          // Kurangi juga stok agregat produk jika ada
          if (product.stock >= item.quantity) {
            await tx.product.update({
              where: { id: product.id },
              data: { stock: { decrement: item.quantity } },
            });
          }

          verifiedItems.push({
            productId: product.id,
            variantId: variant.id,
            quantity: item.quantity,
            unitPrice,
            productName: product.name,
            variantName: variant.name,
          });
        } else {
          // Kasus 2: Produk tanpa varian
          // Jika produk sebenarnya memiliki varian terdaftar, tolak checkout tanpa varian
          if (product.variants.length > 0) {
            throw new Error(`Silakan pilih opsi varian untuk produk "${product.name}".`);
          }

          if (product.stock < item.quantity) {
            throw new Error(`Stok untuk "${product.name}" tidak mencukupi (Sisa: ${product.stock}).`);
          }

          const unitPrice = product.price;
          subtotal += unitPrice * item.quantity;

          // Pengurangan stok produk secara atomik & bersyarat
          const updatedProduct = await tx.product.updateMany({
            where: {
              id: product.id,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (updatedProduct.count === 0) {
            throw new Error(`Stok untuk "${product.name}" baru saja habis atau tidak mencukupi.`);
          }

          verifiedItems.push({
            productId: product.id,
            variantId: null,
            quantity: item.quantity,
            unitPrice,
            productName: product.name,
          });
        }
      }

      // Hitung biaya pengiriman flat sesuai aturan proyek
      const shippingFee = subtotal > 0 ? PAYMENT_CONFIG.flatShippingFee : 0;
      const totalAmount = subtotal + shippingFee;

      // Buat entitas Order dan OrderItem
      const order = await tx.order.create({
        data: {
          userId: session.user.id,
          totalAmount,
          status: "PENDING",
          shippingAddress: {
            id: address.id,
            firstName: address.firstName,
            lastName: address.lastName,
            street: address.street,
            city: address.city,
            postalCode: address.postalCode,
            shippingFee,
          },
          items: {
            create: verifiedItems.map((vi) => ({
              productId: vi.productId,
              variantId: vi.variantId,
              quantity: vi.quantity,
              price: vi.unitPrice,
            })),
          },
        },
      });

      return order;
    });

    revalidatePath("/account");
    revalidatePath("/admin/orders");
    return { success: true, orderId: newOrder.id };
  } catch (error: any) {
    console.error("Order Creation Error:", error);
    return { error: error.message || "Gagal membuat pesanan. Silakan coba lagi." };
  }
}

/**
 * Server Action khusus Admin/Staff untuk memperbarui status pesanan
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return { error: "Akses ditolak. Hanya Admin atau Staf yang dapat mengelola status pesanan." };
  }

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!existingOrder) {
      return { error: "Pesanan tidak ditemukan." };
    }

    // Jika pesanan dibatalkan (CANCELLED) dari status aktif, kembalikan stok
    if (newStatus === "CANCELLED" && existingOrder.status !== "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        for (const item of existingOrder.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: newStatus },
        });
      });
    } else {
      // Pembaruan status normal (e.g. PENDING -> PROCESSING / SHIPPED / DELIVERED)
      // Stok TIDAK dikurangi dua kali karena sudah didekrementasi saat order dibuat
      await prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/account");
    return { success: true };
  } catch (error: any) {
    console.error("Update Order Status Error:", error);
    return { error: error.message || "Gagal memperbarui status pesanan." };
  }
}

export interface SubmitPaymentProofParams {
  orderId: string;
  paymentProofUrl: string;
  senderName: string;
  senderBank: string;
  transferAmount: number;
  transferDate?: string | Date;
}

/**
 * Server Action untuk customer mengunggah rincian bukti transfer manual
 */
export async function submitPaymentProof(data: SubmitPaymentProofParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Silakan login terlebih dahulu untuk mengunggah bukti pembayaran." };
  }

  if (!data.orderId || !data.paymentProofUrl || !data.senderName || !data.senderBank || !data.transferAmount) {
    return { error: "Semua data konfirmasi pembayaran wajib diisi." };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      return { error: "Pesanan tidak ditemukan." };
    }

    if (order.userId !== session.user.id) {
      return { error: "Akses ditolak. Pesanan ini bukan milik akun Anda." };
    }

    await prisma.order.update({
      where: { id: data.orderId },
      data: {
        paymentProofUrl: data.paymentProofUrl,
        senderName: data.senderName.trim(),
        senderBank: data.senderBank.trim().toUpperCase(),
        transferAmount: data.transferAmount,
        transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
        paymentStatus: "PENDING_VERIFICATION",
      },
    });

    revalidatePath(`/orders/${data.orderId}`);
    revalidatePath(`/admin/orders/${data.orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/account");

    return { success: true };
  } catch (error: any) {
    console.error("Submit Payment Proof Error:", error);
    return { error: error.message || "Gagal mengirim bukti pembayaran. Silakan coba lagi." };
  }
}

/**
 * Server Action bagi Admin/Staff untuk menyetujui (approve) bukti transfer
 */
export async function approvePaymentProof(orderId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return { error: "Akses ditolak. Hanya Admin atau Staf yang dapat memverifikasi pembayaran." };
  }

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return { error: "Pesanan tidak ditemukan." };
    }

    // Setujui pembayaran: ubah status bayar menjadi PAID dan status pesanan menjadi PROCESSING
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        status: existingOrder.status === "PENDING" ? "PROCESSING" : existingOrder.status,
        paidAt: new Date(),
        verifiedAt: new Date(),
        verifiedBy: session.user.name || session.user.email || "Admin BCL",
      },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/account");

    return { success: true };
  } catch (error: any) {
    console.error("Approve Payment Proof Error:", error);
    return { error: error.message || "Gagal menyetujui bukti pembayaran." };
  }
}

/**
 * Server Action bagi Admin/Staff untuk menolak (reject) bukti transfer
 */
export async function rejectPaymentProof(orderId: string, reason?: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return { error: "Akses ditolak. Hanya Admin atau Staf yang dapat menolak bukti pembayaran." };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "REJECTED",
      },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/account");

    return { success: true };
  } catch (error: any) {
    console.error("Reject Payment Proof Error:", error);
    return { error: error.message || "Gagal menolak bukti pembayaran." };
  }
}

export interface UpdateOrderDetailsParams {
  status?: OrderStatus;
  courier?: string;
  courierService?: string;
  trackingNumber?: string;
}

/**
 * Server Action bagi Admin/Staff untuk memperbarui rincian pesanan (Status, Kurir, Resi)
 */
export async function updateOrderDetails(orderId: string, data: UpdateOrderDetailsParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return { error: "Akses ditolak. Hanya Admin atau Staf yang dapat memperbarui pesanan." };
  }

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!existingOrder) {
      return { error: "Pesanan tidak ditemukan." };
    }

    // Jika status berubah ke CANCELLED, kembalikan stok
    if (data.status === "CANCELLED" && existingOrder.status !== "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        for (const item of existingOrder.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            courier: data.courier !== undefined ? data.courier : existingOrder.courier,
            courierService: data.courierService !== undefined ? data.courierService : existingOrder.courierService,
            trackingNumber: data.trackingNumber !== undefined ? data.trackingNumber : existingOrder.trackingNumber,
          },
        });
      });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          ...(data.status ? { status: data.status } : {}),
          ...(data.courier !== undefined ? { courier: data.courier } : {}),
          ...(data.courierService !== undefined ? { courierService: data.courierService } : {}),
          ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber } : {}),
        },
      });
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/account");

    return { success: true };
  } catch (error: any) {
    console.error("Update Order Details Error:", error);
    return { error: error.message || "Gagal memperbarui rincian pesanan." };
  }
}

