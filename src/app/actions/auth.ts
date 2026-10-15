"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function registerUser(prevState: any, formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!firstName || !lastName || !email || !password) {
    return { error: "Semua kolom wajib diisi." };
  }

  // Cek apakah email sudah terdaftar
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "Email sudah terdaftar. Silakan login atau gunakan email lain." };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  let createdUserId: string | null = null;

  try {
    const newUser = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        role: "USER",
      },
    });
    createdUserId = newUser.id;

    // Generate Verification Token
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 1000 * 60 * 60 * 24); // 24 jam

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Kirim Email Verifikasi
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/verify?token=${token}&email=${email}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@bclrental.co.id",
      to: email,
      subject: "Verify your email address - Backcountrylight",
      html: `<p>Hi ${firstName},</p><p>Welcome to Backcountrylight! Please click the link below to verify your email address:</p><p><a href="${verificationUrl}">Verify Email</a></p>`,
    });

  } catch (error) {
    // Rollback akun jika pengiriman email gagal agar user tidak terkunci permanen
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
      await prisma.verificationToken.deleteMany({ where: { identifier: email } }).catch(() => {});
    }
    console.error("Failed to register user:", error);
    return { error: "Gagal membuat akun atau mengirim email verifikasi. Silakan coba lagi." };
  }

  redirect("/login?registered=true&verify=true");
}
