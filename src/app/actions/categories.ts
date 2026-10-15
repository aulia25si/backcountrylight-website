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

export async function createCategory(formData: FormData) {
  try {
    await verifyStaffSession();
  } catch (err: any) {
    return { error: err.message };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const slug = name.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "");

  if (!name) return { error: "Name is required" };

  try {
    await prisma.category.create({
      data: {
        name,
        slug,
        description,
      },
    });
  } catch (error) {
    return { error: "Category with this name/slug may already exist." };
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    await verifyStaffSession();
  } catch (err: any) {
    return { error: err.message };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  
  if (!name) return { error: "Name is required" };

  const slug = name.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "");

  try {
    await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
      },
    });
  } catch (error) {
    return { error: "Category with this name/slug may already exist." };
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function deleteCategory(id: string) {
  try {
    await verifyStaffSession();
    await prisma.category.delete({
      where: { id },
    });
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete category. It might be linked to products." };
  }
}
