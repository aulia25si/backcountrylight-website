"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
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
  redirect("/admin/products");
}

export async function updateProduct(id: string, formData: FormData) {
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

  if (!name || !price || !categoryId || !brandId) {
    return { error: "Missing required fields" };
  }

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
    options: {
      deleteMany: {},
      create: options.map((opt: any) => ({
        name: opt.name,
        values: opt.values,
      }))
    },
    variants: {
      deleteMany: {},
      create: variants.map((v: any) => ({
        name: Object.values(v.options).join(" / "),
        sku: v.sku || null,
        price: v.price ? parseInt(v.price, 10) : null,
        stock: v.stock ? parseInt(v.stock, 10) : 0,
        options: v.options,
        imageUrl: v.imageUrl || null,
      }))
    },
  };

  // Only update main image if a new one is provided
  if (image) {
    dataToUpdate.image = image;
  }

  // Always update images array (empty array means they were deleted)
  dataToUpdate.images = images;

  try {
    await prisma.product.update({
      where: { id },
      data: dataToUpdate,
    });
  } catch (error: any) {
    console.error("Update product error:", error);
    return { error: error.message || "Failed to update product." };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id },
    });
    revalidatePath("/admin/products");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete product." };
  }
}
