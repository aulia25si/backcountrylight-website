"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteUser(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Akses ditolak. Hanya Administrator yang dapat menghapus pengguna." };
  }

  // Cegah admin menghapus akunnya sendiri
  if (session.user.id === id) {
    return { error: "Anda tidak dapat menghapus akun Anda sendiri." };
  }

  try {
    await prisma.user.delete({
      where: { id },
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { error: "Gagal menghapus pengguna. Pengguna mungkin memiliki data pesanan terkait." };
  }
}

export async function updateUserRole(id: string, newRole: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Akses ditolak. Hanya Administrator yang dapat mengubah role pengguna." };
  }

  if (newRole !== "USER" && newRole !== "ADMIN" && newRole !== "STAFF") {
    return { error: "Role tidak valid." };
  }

  // Cegah admin mencabut role admin dari dirinya sendiri agar tidak terkunci
  if (session.user.id === id && newRole !== "ADMIN") {
    return { error: "Anda tidak dapat mencabut hak Administrator dari akun Anda sendiri." };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { role: newRole as "USER" | "ADMIN" | "STAFF" },
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { error: "Gagal memperbarui role pengguna." };
  }
}
