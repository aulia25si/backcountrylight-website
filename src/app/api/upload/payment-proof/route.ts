import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    // 1. Authenticate Request (Customer must be logged in)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu untuk mengunggah bukti pembayaran." }, { status: 401 });
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File bukti pembayaran tidak ditemukan." }, { status: 400 });
    }

    // 3. Validate File Type & Size (Max 5MB)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Format file tidak didukung. Harap unggah gambar JPG, PNG, atau WEBP." }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 5 MB." }, { status: 400 });
    }

    // 4. Prepare File for Upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExtension = file.name.split(".").pop() || "jpg";
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${fileExtension}`;
    const filePath = `payment-proofs/${uniqueFilename}`;

    // 5. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Payment Proof Upload Error:", uploadError);
      return NextResponse.json({ error: "Gagal menyimpan file bukti pembayaran ke storage." }, { status: 500 });
    }

    // 6. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from("products")
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error("Payment Proof Upload Route Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
