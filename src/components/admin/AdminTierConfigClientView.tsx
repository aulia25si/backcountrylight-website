"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { updateTierConfig } from "@/app/actions/membership";
import { toast } from "sonner";
import { ArrowLeft, Save, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import { MembershipTierType } from "@prisma/client";

interface TierItem {
  id: string;
  type: MembershipTierType;
  name: string;
  price: number;
  durationDays: number;
  discountPct: number;
  description: string | null;
  benefits: string[];
}

export function AdminTierConfigClientView({ initialTiers }: { initialTiers: TierItem[] }) {
  const router = useRouter();
  const [tiers, setTiers] = useState(initialTiers);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const handleFieldChange = (type: MembershipTierType, field: string, value: any) => {
    setTiers((prev) =>
      prev.map((t) => (t.type === type ? { ...t, [field]: value } : t))
    );
  };

  const handleSaveTier = async (tier: TierItem) => {
    try {
      setIsSaving(tier.type);
      const res = await updateTierConfig({
        tierType: tier.type,
        price: Number(tier.price),
        durationDays: Number(tier.durationDays),
        discountPct: Number(tier.discountPct),
        description: tier.description || "",
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success(`Konfigurasi tier ${tier.name} berhasil diperbarui!`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui tier.");
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/membership"
          className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors mb-2"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Kembali ke Dashboard Membership
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Pengaturan Harga & Durasi Tier Membership
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Sesuaikan harga pendaftaran, masa berlaku hari, serta persentase diskon reseller tanpa hardcoding di UI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div key={tier.id} className="border border-zinc-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="font-heading font-semibold text-base text-zinc-900">{tier.name}</h2>
                <span className="text-[11px] font-mono text-zinc-400 font-medium">TIER {tier.type}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {tier.discountPct}% Diskon
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-zinc-700">Harga Membership (IDR)</label>
                <input
                  type="number"
                  value={tier.price}
                  onChange={(e) => handleFieldChange(tier.type, "price", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                />
                <span className="text-[10px] text-zinc-400">Preview: {formatRupiah(tier.price)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700">Durasi (Hari)</label>
                  <input
                    type="number"
                    value={tier.durationDays}
                    onChange={(e) => handleFieldChange(tier.type, "durationDays", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700">Diskon (%)</label>
                  <input
                    type="number"
                    value={tier.discountPct}
                    onChange={(e) => handleFieldChange(tier.type, "discountPct", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700">Deskripsi Singkat</label>
                <textarea
                  value={tier.description || ""}
                  onChange={(e) => handleFieldChange(tier.type, "description", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSaveTier(tier)}
                disabled={isSaving === tier.type}
                className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSaving === tier.type ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
