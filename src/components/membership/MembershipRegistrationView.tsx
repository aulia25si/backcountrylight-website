"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MembershipTierType } from "@prisma/client";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerOrRenewMembership } from "@/app/actions/membership";
import { toast } from "sonner";
import { Check, ArrowRight, ShieldCheck, Sparkles, Building2, Phone, Briefcase } from "lucide-react";

interface TierOption {
  id: string;
  type: MembershipTierType;
  name: string;
  discountPct: number;
  price: number;
  durationDays: number;
  description: string | null;
  benefits: string[];
}

interface MembershipRegistrationViewProps {
  tiers: TierOption[];
  user: {
    name?: string | null;
    email?: string | null;
  };
  currentTier?: MembershipTierType | null;
  isRenewal?: boolean;
}

export function MembershipRegistrationView({
  tiers,
  user,
  currentTier,
  isRenewal = false,
}: MembershipRegistrationViewProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<MembershipTierType>(
    currentTier || "GOLD"
  );
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Reseller Toko Online");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTierConfig = tiers.find((t) => t.type === selectedTier) || tiers[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      toast.error("Nama Toko / Usaha wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerOrRenewMembership({
        tierType: selectedTier,
        businessName: businessName.trim(),
        businessType: businessType.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        isRenewal,
      });

      if (res.error) {
        toast.error(res.error);
        if (res.orderId) {
          router.push(`/membership/payment/${res.orderId}`);
        }
        setIsSubmitting(false);
        return;
      }

      if (res.orderId) {
        toast.success("Pendaftaran membership berhasil dibuat! Menuju instruksi pembayaran...");
        router.push(`/membership/payment/${res.orderId}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengajukan pendaftaran membership.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-16">
      {/* 1. Header & Value Proposition */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span>Reseller & Dropshipper Partner Program</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-heading font-medium tracking-tight text-foreground">
          {isRenewal ? "Perpanjang Membership BCL" : "Pilih Paket Kemitraan Anda"}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Dapatkan akses harga khusus reseller pada seluruh katalog tenda, shelter, ransel ultralight, dan aksesoris outdoor BCL dengan margin profit optimal.
        </p>
      </div>

      {/* 2. Tier Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier.type;
          const isPopular = tier.type === "GOLD";

          return (
            <div
              key={tier.id}
              onClick={() => setSelectedTier(tier.type)}
              className={`relative cursor-pointer rounded-2xl p-6 sm:p-8 flex flex-col justify-between border-2 transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/[0.02] shadow-md ring-2 ring-primary/10"
                  : "border-border bg-card hover:border-zinc-300"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary text-primary-foreground shadow-xs">
                  Paling Populer
                </span>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-foreground">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tier.description || "Masa aktif 1 tahun penuh."}
                    </p>
                  </div>
                  <span
                    className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-zinc-300"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                </div>

                <div className="border-t border-b py-4 my-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-heading font-bold text-foreground">
                      {formatRupiah(tier.price)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {tier.durationDays} hari
                    </span>
                  </div>
                  <div className="inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Diskon Langsung {tier.discountPct}%
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Benefit Mitra:
                  </p>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {tier.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <button
                  type="button"
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-zinc-200/70"
                  }`}
                >
                  {isSelected ? "Paket Dipilih" : "Pilih Tier Ini"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Registration Form */}
      <div className="max-w-2xl mx-auto border rounded-2xl p-6 sm:p-8 bg-card shadow-xs space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-xl font-heading font-medium">Lengkapi Informasi Bisnis</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Data ini digunakan untuk verifikasi akun reseller dan pencatatan faktur kemitraan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Info Akun Login */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Lengkap</Label>
              <Input value={user.name || "Customer BCL"} disabled className="bg-muted/40 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email Akun</Label>
              <Input value={user.email || ""} disabled className="bg-muted/40 text-xs" />
            </div>
          </div>

          {/* Form Usaha */}
          <div className="space-y-1.5">
            <Label htmlFor="businessName" className="text-xs">
              Nama Usaha / Nama Toko Online <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="businessName"
                placeholder="Contoh: Highland Outdoor Gear Store"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessType" className="text-xs">Model Bisnis</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  id="businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Reseller Toko Online">Reseller Toko Online (Shopee/Tokopedia)</option>
                  <option value="Toko Fisik / Retail Outdoor">Toko Fisik / Retail Outdoor</option>
                  <option value="Dropshipper">Dropshipper Mandiri</option>
                  <option value="Komunitas / Operator Trip">Komunitas / Operator Trip Pendakian</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber" className="text-xs">Nomor WhatsApp Aktif</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phoneNumber"
                  placeholder="08123456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="rounded-xl p-4 bg-muted/40 border space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Paket Kemitraan:</span>
              <span className="font-semibold text-foreground">{activeTierConfig.name}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Masa Berlaku:</span>
              <span>{activeTierConfig.durationDays} Hari</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Hak Diskon Katalog:</span>
              <span className="font-bold text-emerald-700">{activeTierConfig.discountPct}%</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold text-sm text-foreground">
              <span>Biaya Pendaftaran:</span>
              <span className="text-primary font-bold">{formatRupiah(activeTierConfig.price)}</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !businessName.trim()}
              className="w-full h-12 text-sm font-medium"
            >
              {isSubmitting ? (
                "Memproses Pendaftaran..."
              ) : (
                <>
                  <span>Lanjut ke Pembayaran ({formatRupiah(activeTierConfig.price)})</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mt-3">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Pembayaran manual via transfer bank. Diverifikasi dalam 1x24 jam kerja.</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
