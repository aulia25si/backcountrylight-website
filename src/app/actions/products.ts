"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function verifyStaffSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    throw new Error("Akses ditolak. Operasi ini membutuhkan hak akses Admin atau Staf.");
  }
  return session;
}

export async function createProduct(formData: FormData) {
  try {
    await verifyStaffSession();
  } catch (err: any) {
    return { error: err.message };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseInt(formData.get("price") as string, 10);
  const stock = parseInt(formData.get("stock") as string, 10);
  const categoryId = formData.get("categoryId") as string;
  const brandId = formData.get("brandId") as string;
  const image = formData.get("image") as string;
  const images = formData.getAll("images") as string[];
  const isFeatured = formData.get("isFeatured") === "on";
  
  const optionsRaw = formData.get("options") as string;
  const variantsRaw = formData.get("variants") as string;
  let options = [];
  let variants = [];
  if (optionsRaw) {
    try { options = JSON.parse(optionsRaw); } catch(e) {}
  }
  if (variantsRaw) {
    try { variants = JSON.parse(variantsRaw); } catch(e) {}
  }
  
  const rawSku = formData.get("sku") as string;
  const sku = rawSku?.trim() ? rawSku.trim() : null;

  const slug = name.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "");

  if (!name || !price || !categoryId || !brandId || !image) {
    return { error: "Missing required fields" };
  }

  try {
    await prisma.product.create({
      data: {
        name,
        sku,
        slug,
        description,
        price,
        stock,
        categoryId,
        brandId,
        image,
        images,
        isFeatured,
        options: options.length > 0 ? {
          create: options.map((opt: any) => ({
            name: opt.name,
            values: opt.values,
          }))
        } : undefined,
        variants: variants.length > 0 ? {
          create: variants.map((v: any) => ({
            name: Object.values(v.options).join(" / "),
            sku: v.sku || null,
            price: v.price ? parseInt(v.price, 10) : null,
            stock: v.stock ? parseInt(v.stock, 10) : 0,
            options: v.options,
            imageUrl: v.imageUrl || null,
          }))
        } : undefined,
      },
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    return { error: error.message || "Failed to create product." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products");
}

export async function updateProduct(id: string, formData: FormData) {
  try {
    await verifyStaffSession();
  } catch (err: any) {
    return { error: err.message };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseInt(formData.get("price") as string, 10);
  const stock = parseInt(formData.get("stock") as string, 10);
  const categoryId = formData.get("categoryId") as string;
  const brandId = formData.get("brandId") as string;
  const image = formData.get("image") as string;
  const images = formData.getAll("images") as string[];
  const isFeatured = formData.get("isFeatured") === "on";

  const optionsRaw = formData.get("options") as string;
  const variantsRaw = formData.get("variants") as string;
  let options: any[] = [];
  let variants: any[] = [];
  if (optionsRaw) {
    try { options = JSON.parse(optionsRaw); } catch(e) {}
  }
  if (variantsRaw) {
    try { variants = JSON.parse(variantsRaw); } catch(e) {}
  }

  const rawSku = formData.get("sku") as string;
  const sku = rawSku?.trim() ? rawSku.trim() : null;

  const slug = name.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "");

  if (!name || isNaN(price) || !categoryId || !brandId) {
    return { error: "Missing required fields" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Periksa varian lama yang sudah terkait dengan pesanan agar tidak memicu error Foreign Key
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: id },
        include: { _count: { select: { orderItems: true } } },
      });

      // Hapus opsi lama
      await tx.productOption.deleteMany({
        where: { productId: id },
      });

      // Buat opsi baru
      if (options.length > 0) {
        await tx.productOption.createMany({
          data: options.map((opt: any) => ({
            productId: id,
            name: opt.name,
            values: opt.values,
          })),
        });
      }

      // Hapus hanya varian yang belum pernah dipesan
      const variantsToDelete = existingVariants.filter((v) => v._count.orderItems === 0);
      if (variantsToDelete.length > 0) {
        await tx.productVariant.deleteMany({
          where: {
            id: { in: variantsToDelete.map((v) => v.id) },
          },
        });
      }

      // Buat atau perbarui varian baru
      for (const v of variants) {
        const variantName = Object.values(v.options).join(" / ");
        // Cari apakah varian dengan kombinasi ini sudah ada
        const matchedExisting = existingVariants.find(
          (ex) => JSON.stringify(ex.options) === JSON.stringify(v.options)
        );

        if (matchedExisting) {
          await tx.productVariant.update({
            where: { id: matchedExisting.id },
            data: {
              name: variantName,
              sku: v.sku || null,
              price: v.price ? parseInt(v.price, 10) : null,
              stock: v.stock ? parseInt(v.stock, 10) : 0,
              imageUrl: v.imageUrl || null,
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              name: variantName,
              sku: v.sku || null,
              price: v.price ? parseInt(v.price, 10) : null,
              stock: v.stock ? parseInt(v.stock, 10) : 0,
              options: v.options,
              imageUrl: v.imageUrl || null,
            },
          });
        }
      }

      // Update data utama produk
      const dataToUpdate: any = {
        name,
        sku,
        slug,
        description,
        price,
        stock,
        categoryId,
        brandId,
        isFeatured,
      };

      if (image) {
        dataToUpdate.image = image;
      }
      dataToUpdate.images = images;

      await tx.product.update({
        where: { id },
        data: dataToUpdate,
      });
    });
  } catch (error: any) {
    console.error("Update product error:", error);
    return { error: error.message || "Failed to update product." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  try {
    await verifyStaffSession();
    await prisma.product.delete({
      where: { id },
    });
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete product. It might be linked to orders." };
  }
}
