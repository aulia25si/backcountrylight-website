"use client";

import { useTransition } from "react";
import * as DropdownMenu from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, CheckCircle2, Clock, Truck, PackageCheck, XCircle } from "lucide-react";
import { updateOrderStatus } from "@/app/actions/order";
import { toast } from "sonner";
import { OrderStatus } from "@prisma/client";

interface OrderStatusDropdownProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export function OrderStatusDropdown({ orderId, currentStatus }: OrderStatusDropdownProps) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (newStatus === currentStatus) return;

    startTransition(async () => {
  try {
    const result = await updateOrderStatus(orderId, newStatus);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      `Status pesanan berhasil diubah menjadi ${getStatusLabel(newStatus)}`
    );
  } catch {
    toast.error("Gagal mengubah status pesanan. Silakan coba lagi.");
  }
});
  };

  const getStatusBadgeStyle = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      case "PROCESSING":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case "SHIPPED":
        return "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100";
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return "Pending Transfer";
      case "PROCESSING":
        return "Pembayaran Valid";
      case "SHIPPED":
        return "Dikirim";
      case "DELIVERED":
        return "Selesai";
      case "CANCELLED":
        return "Dibatalkan";
      default:
        return status;
    }
  };

  return (
    <DropdownMenu.DropdownMenu>
      <DropdownMenu.DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={`h-8 text-xs font-semibold gap-1.5 border transition-colors ${getStatusBadgeStyle(currentStatus)}`}
            disabled={isPending}
          />
        }
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span>{getStatusLabel(currentStatus)}</span>
        )}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenu.DropdownMenuTrigger>

      <DropdownMenu.DropdownMenuContent align="end" className="w-56">
    {/* FIX: DropdownMenuLabel harus berada dalam DropdownMenuGroup */}
    <DropdownMenu.DropdownMenuGroup>
      <DropdownMenu.DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
        Ubah Status Transaksi
      </DropdownMenu.DropdownMenuLabel>
    </DropdownMenu.DropdownMenuGroup>

    <DropdownMenu.DropdownMenuSeparator />

    <DropdownMenu.DropdownMenuItem
      onClick={() => handleStatusChange("PENDING")}
      disabled={isPending}
      className="flex items-center gap-2 cursor-pointer text-xs"
    >
      <Clock className="h-3.5 w-3.5 text-amber-600" />
      <span>Pending (Menunggu Transfer)</span>
    </DropdownMenu.DropdownMenuItem>

    <DropdownMenu.DropdownMenuItem
      onClick={() => handleStatusChange("PROCESSING")}
      disabled={isPending}
      className="flex items-center gap-2 cursor-pointer text-xs font-medium text-blue-700"
    >
      <PackageCheck className="h-3.5 w-3.5 text-blue-600" />
      <span>Verifikasi Pembayaran (Processing)</span>
    </DropdownMenu.DropdownMenuItem>

    <DropdownMenu.DropdownMenuItem
      onClick={() => handleStatusChange("SHIPPED")}
      disabled={isPending}
      className="flex items-center gap-2 cursor-pointer text-xs"
    >
      <Truck className="h-3.5 w-3.5 text-purple-600" />
      <span>Kirim Pesanan (Shipped)</span>
    </DropdownMenu.DropdownMenuItem>

    <DropdownMenu.DropdownMenuItem
      onClick={() => handleStatusChange("DELIVERED")}
      disabled={isPending}
      className="flex items-center gap-2 cursor-pointer text-xs text-emerald-700"
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      <span>Tandai Selesai (Delivered)</span>
    </DropdownMenu.DropdownMenuItem>

    <DropdownMenu.DropdownMenuSeparator />

    <DropdownMenu.DropdownMenuItem
      onClick={() => handleStatusChange("CANCELLED")}
      disabled={isPending}
      className="flex items-center gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
    >
      <XCircle className="h-3.5 w-3.5" />
      <span>Batalkan Pesanan (Restock)</span>
    </DropdownMenu.DropdownMenuItem>
  </DropdownMenu.DropdownMenuContent>
</DropdownMenu.DropdownMenu>
  );
}
