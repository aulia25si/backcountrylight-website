"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { 
  Search, 
  Award, 
  Plus, 
  Edit3, 
  UserX, 
  ShieldCheck, 
  Clock, 
  Settings2, 
  Check, 
  X, 
  Eye, 
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  adminAssignMembership, 
  adminUpdateMembership, 
  adminRevokeMembership, 
  approveMembershipPayment, 
  rejectMembershipPayment 
} from "@/app/actions/membership";
import { toast } from "sonner";
import { MembershipTierType, MembershipStatus } from "@prisma/client";

interface MembershipItem {
  id: string;
  userId: string;
  tierType: MembershipTierType;
  status: MembershipStatus;
  discountPct: number;
  startDate: string | null;
  expiresAt: string | null;
  businessName: string | null;
  businessType: string | null;
  phoneNumber: string | null;
  adminNotes: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface MembershipOrderItem {
  id: string;
  amount: number;
  tierType: MembershipTierType;
  durationDays: number;
  paymentStatus: string;
  senderName: string | null;
  senderBank: string | null;
  transferAmount: number | null;
  paymentProofUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface TierConfigItem {
  id: string;
  type: MembershipTierType;
  name: string;
  price: number;
  durationDays: number;
  discountPct: number;
  description: string | null;
}

interface CustomerOption {
  id: string;
  name: string | null;
  email: string | null;
}

interface AdminMembershipClientViewProps {
  initialMemberships: MembershipItem[];
  initialPendingOrders: MembershipOrderItem[];
  tiers: TierConfigItem[];
  availableCustomers: CustomerOption[];
}

export function AdminMembershipClientView({
  initialMemberships,
  initialPendingOrders,
  tiers,
  availableCustomers,
}: AdminMembershipClientViewProps) {
  const [activeTab, setActiveTab] = useState<"members" | "pending" | "tiers">("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<MembershipItem | null>(null);

  // Form states for manual assignment
  const [assignUserId, setAssignUserId] = useState(availableCustomers[0]?.id || "");
  const [assignTier, setAssignTier] = useState<MembershipTierType>("SILVER");
  const [assignDuration, setAssignDuration] = useState("365");
  const [assignNotes, setAssignNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Form states for edit
  const [editTier, setEditTier] = useState<MembershipTierType>("SILVER");
  const [editStatus, setEditStatus] = useState<MembershipStatus>("ACTIVE");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Filtered members
  const filteredMemberships = useMemo(() => {
    return initialMemberships.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = m.user.name?.toLowerCase().includes(q) || false;
        const matchesEmail = m.user.email?.toLowerCase().includes(q) || false;
        const matchesBusiness = m.businessName?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesEmail && !matchesBusiness) return false;
      }
      if (tierFilter !== "all" && m.tierType !== tierFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      return true;
    });
  }, [initialMemberships, searchQuery, tierFilter, statusFilter]);

  // Handle Manual Assign
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId) {
      toast.error("Silakan pilih customer.");
      return;
    }

    try {
      setIsAssigning(true);
      const res = await adminAssignMembership({
        userId: assignUserId,
        tierType: assignTier,
        durationDays: parseInt(assignDuration, 10) || 365,
        adminNotes: assignNotes.trim(),
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Membership berhasil diberikan kepada customer!");
      setIsAssignModalOpen(false);
      setAssignNotes("");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal memberikan membership.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Open Edit Modal
  const openEdit = (m: MembershipItem) => {
    setSelectedMembership(m);
    setEditTier(m.tierType);
    setEditStatus(m.status);
    setEditExpiresAt(m.expiresAt ? m.expiresAt.slice(0, 10) : "");
    setEditNotes(m.adminNotes || "");
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMembership) return;

    try {
      setIsUpdating(true);
      const res = await adminUpdateMembership({
        membershipId: selectedMembership.id,
        tierType: editTier,
        status: editStatus,
        expiresAt: new Date(editExpiresAt),
        adminNotes: editNotes.trim(),
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Data membership berhasil diperbarui!");
      setIsEditModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengupdate membership.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Revoke
  const handleRevoke = async (id: string, name: string) => {
    const reason = prompt(`Cabut membership untuk ${name}? Masukkan alasan audit:`);
    if (reason === null) return;

    try {
      const res = await adminRevokeMembership(id, reason);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Membership ${name} berhasil dicabut.`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal mencabut membership.");
    }
  };

  // Handle Approve Payment
  const handleApproveOrder = async (orderId: string) => {
    if (!confirm("Setujui pembayaran dan aktifkan membership customer ini?")) return;
    try {
      const res = await approveMembershipPayment(orderId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Pembayaran berhasil disetujui! Membership telah diaktifkan.");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyetujui pembayaran.");
    }
  };

  // Handle Reject Payment
  const handleRejectOrder = async (orderId: string) => {
    const reason = prompt("Masukkan alasan penolakan bukti pembayaran:");
    if (reason === null) return;
    try {
      const res = await rejectMembershipPayment(orderId, reason);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Pembayaran berhasil ditolak.");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak pembayaran.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            Membership & Partner
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Kelola reseller, dropshipper, verifikasi pembayaran manual, dan pengaturan tier diskon.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAssignModalOpen(true)}
            className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 px-3.5 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Beri Membership Manual
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-3 transition-colors relative ${
            activeTab === "members"
              ? "text-zinc-900 font-semibold border-b-2 border-zinc-900"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Daftar Member ({initialMemberships.length})
        </button>

        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 transition-colors relative flex items-center gap-1.5 ${
            activeTab === "pending"
              ? "text-zinc-900 font-semibold border-b-2 border-zinc-900"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <span>Verifikasi Pembayaran</span>
          {initialPendingOrders.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {initialPendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("tiers")}
          className={`pb-3 transition-colors relative ${
            activeTab === "tiers"
              ? "text-zinc-900 font-semibold border-b-2 border-zinc-900"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Pengaturan Tier Diskon
        </button>
      </div>

      {/* TAB 1: DAFTAR MEMBER */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama customer, email, atau nama toko..."
                className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-md text-xs bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-800"
              />
            </div>

            <div className="w-full sm:w-36">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-md text-xs bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-800"
              >
                <option value="all">Semua Tier</option>
                <option value="SILVER">Silver (10%)</option>
                <option value="GOLD">Gold (15%)</option>
                <option value="PLATINUM">Platinum (20%)</option>
              </select>
            </div>

            <div className="w-full sm:w-36">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-md text-xs bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-800"
              >
                <option value="all">Semua Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
                <option value="REVOKED">Revoked</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">CUSTOMER & TOKO</th>
                    <th className="px-5 py-3.5">TIER</th>
                    <th className="px-5 py-3.5">HAK DISKON</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5">BERLAKU HINGGA</th>
                    <th className="px-5 py-3.5 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredMemberships.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-zinc-400">
                        Tidak ada data membership yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMemberships.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="font-semibold text-zinc-900">{m.user.name || "Customer BCL"}</p>
                          <p className="text-[11px] text-zinc-500">{m.user.email}</p>
                          {m.businessName && (
                            <span className="inline-block mt-0.5 text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {m.businessName} ({m.businessType || "Reseller"})
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-zinc-900">{m.tierType}</span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {m.discountPct}% Katalog
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                              m.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : m.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border-amber-300"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-zinc-600">
                          {m.expiresAt
                            ? new Date(m.expiresAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(m)}
                              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded"
                              title="Edit Tier / Status"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {m.status === "ACTIVE" && (
                              <button
                                onClick={() => handleRevoke(m.id, m.user.name || "Customer")}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Cabut Membership"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIKASI PEMBAYARAN MANUAL */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">ORDER ID & TANGGAL</th>
                    <th className="px-5 py-3.5">CUSTOMER</th>
                    <th className="px-5 py-3.5">TIER DIAJUKAN</th>
                    <th className="px-5 py-3.5">TAGIHAN</th>
                    <th className="px-5 py-3.5">INFO TRANSFER</th>
                    <th className="px-5 py-3.5">BUKTI TRANSFER</th>
                    <th className="px-5 py-3.5 text-right">AKSI VERIFIKASI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {initialPendingOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-zinc-400">
                        Tidak ada antrean pembayaran membership yang menunggu verifikasi.
                      </td>
                    </tr>
                  ) : (
                    initialPendingOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="font-mono font-medium text-zinc-900">#{o.id.slice(0, 8)}</p>
                          <p className="text-[11px] text-zinc-400">
                            {new Date(o.createdAt).toLocaleDateString("id-ID")}
                          </p>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="font-semibold text-zinc-900">{o.user.name}</p>
                          <p className="text-[11px] text-zinc-500">{o.user.email}</p>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-zinc-900">{o.tierType}</span>
                          <span className="text-zinc-500 text-[11px] block">{o.durationDays} Hari</span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap font-bold text-zinc-900">
                          {formatRupiah(o.amount)}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-zinc-600">
                          {o.senderName ? (
                            <>
                              <p className="font-medium text-zinc-900">{o.senderName}</p>
                              <p className="text-[11px] text-zinc-500">{o.senderBank} ({formatRupiah(o.transferAmount || o.amount)})</p>
                            </>
                          ) : (
                            <span className="text-zinc-400 italic">Belum mengisi rincian</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {o.paymentProofUrl ? (
                            <a
                              href={o.paymentProofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Lihat Bukti
                            </a>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">Belum unggah</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveOrder(o.id)}
                              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <Check className="h-3 w-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectOrder(o.id)}
                              className="py-1 px-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <X className="h-3 w-3" />
                              Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PENGATURAN TIER DISKON */}
      {activeTab === "tiers" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div key={t.id} className="border border-zinc-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-heading font-semibold text-lg text-zinc-900">{t.name}</h3>
                  <span className="text-[11px] font-mono font-medium text-zinc-400">TIER {t.type}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Diskon {t.discountPct}%
                </span>
              </div>

              <div className="space-y-2 border-t pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Biaya Membership:</span>
                  <span className="font-bold text-zinc-900">{formatRupiah(t.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Masa Aktif:</span>
                  <span className="font-medium text-zinc-900">{t.durationDays} Hari</span>
                </div>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed border-t pt-3">
                {t.description || "Tier kemitraan resmi BCL."}
              </p>

              <div className="pt-2">
                <Link
                  href={`/admin/membership/tiers`}
                  className="w-full py-2 px-3 border border-zinc-200 hover:bg-zinc-50 rounded text-xs text-center font-medium block text-zinc-700 transition-colors"
                >
                  Kelola Konfigurasi Tier
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Beri Membership Manual */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="relative max-w-md w-full bg-white rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-heading font-semibold text-base text-zinc-900">
                Beri Membership Manual
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-1 hover:bg-zinc-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">Pilih Customer Terdaftar</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  {availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || "Customer"} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">Tier Kemitraan</label>
                  <select
                    value={assignTier}
                    onChange={(e) => setAssignTier(e.target.value as MembershipTierType)}
                    className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="SILVER">Silver (10%)</option>
                    <option value="GOLD">Gold (15%)</option>
                    <option value="PLATINUM">Platinum (20%)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">Masa Aktif (Hari)</label>
                  <input
                    type="number"
                    value={assignDuration}
                    onChange={(e) => setAssignDuration(e.target.value)}
                    min={1}
                    className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">Catatan Audit Admin</label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Alasan pemberian (contoh: Mitra offline toko cabang Bandung)"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="py-2 px-3 border rounded text-zinc-600 hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="py-2 px-4 bg-zinc-900 text-white rounded font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isAssigning ? "Menyimpan..." : "Berikan Membership"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Membership */}
      {isEditModalOpen && selectedMembership && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="relative max-w-md w-full bg-white rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-heading font-semibold text-base text-zinc-900">
                  Edit Membership: {selectedMembership.user.name}
                </h3>
                <p className="text-[11px] text-zinc-400">{selectedMembership.user.email}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-zinc-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">Tier Kemitraan</label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value as MembershipTierType)}
                    className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="SILVER">Silver (10%)</option>
                    <option value="GOLD">Gold (15%)</option>
                    <option value="PLATINUM">Platinum (20%)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as MembershipStatus)}
                    className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="REVOKED">REVOKED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">Tanggal Kedaluwarsa</label>
                <input
                  type="date"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">Catatan Perubahan (Audit Log)</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Alasan perubahan tier atau tanggal..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="py-2 px-3 border rounded text-zinc-600 hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="py-2 px-4 bg-zinc-900 text-white rounded font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
