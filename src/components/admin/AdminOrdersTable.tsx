"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { Search, ChevronRight } from "lucide-react";
import { OrderStatus, PaymentStatus } from "@prisma/client";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    image: string;
  };
  variant?: {
    id: string;
    name: string;
    sku: string | null;
  } | null;
}

export interface AdminOrderListItem {
  id: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string | Date;
  shippingAddress: any;
  trackingNumber?: string | null;
  courier?: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  items: OrderItem[];
}

interface AdminOrdersTableProps {
  initialOrders: AdminOrderListItem[];
}

export function AdminOrdersTable({ initialOrders }: AdminOrdersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = useMemo(() => {
    return initialOrders.filter((order) => {
      // 1. Search Query Filter (Order ID, Email, Tracking No, Customer Name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesEmail = order.user?.email?.toLowerCase().includes(query) || false;
        const matchesName = order.user?.name?.toLowerCase().includes(query) || false;
        const matchesTracking = order.trackingNumber?.toLowerCase().includes(query) || false;

        if (!matchesId && !matchesEmail && !matchesName && !matchesTracking) {
          return false;
        }
      }

      // 2. Payment Filter
      if (paymentFilter !== "all") {
        if (order.paymentStatus !== paymentFilter) {
          return false;
        }
      }

      // 3. Order Status Filter
      if (statusFilter !== "all") {
        if (order.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [initialOrders, searchQuery, paymentFilter, statusFilter]);

  const renderPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium border border-emerald-400 text-emerald-600 bg-emerald-50/50">
            Paid
          </span>
        );
      case "PENDING_VERIFICATION":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium border border-amber-400 text-amber-600 bg-amber-50/50">
            Pending
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium border border-red-300 text-red-600 bg-red-50/50">
            Rejected
          </span>
        );
      case "UNPAID":
      default:
        return (
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium border border-zinc-200 text-zinc-500 bg-zinc-50">
            Unpaid
          </span>
        );
    }
  };

  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "SHIPPED":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium border border-purple-200 text-purple-600 bg-purple-50/50">
            Shipped
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium border border-emerald-200 text-emerald-600 bg-emerald-50/50">
            Completed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium border border-blue-200 text-blue-600 bg-blue-50/50">
            Processing
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium border border-red-200 text-red-600 bg-red-50/50">
            Cancelled
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium border border-amber-200 text-amber-600 bg-amber-50/50">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar sesuai Gambar 1 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, Email, or Tracking No."
            className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-md text-xs sm:text-sm bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          />
        </div>

        {/* Dropdown Filter Payment */}
        <div className="w-full sm:w-36">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-xs sm:text-sm bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          >
            <option value="all">all</option>
            <option value="PAID">Paid</option>
            <option value="PENDING_VERIFICATION">Pending</option>
            <option value="UNPAID">Unpaid</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Dropdown Filter Status */}
        <div className="w-full sm:w-36">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-xs sm:text-sm bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          >
            <option value="all">all</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-white text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="px-5 py-3.5">ORDER ID</th>
                <th scope="col" className="px-5 py-3.5">CUSTOMER</th>
                <th scope="col" className="px-5 py-3.5">TOTAL</th>
                <th scope="col" className="px-5 py-3.5">PAYMENT</th>
                <th scope="col" className="px-5 py-3.5">STATUS</th>
                <th scope="col" className="px-5 py-3.5">DATE</th>
                <th scope="col" className="px-5 py-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-400">
                    Tidak ada pesanan yang sesuai dengan filter atau kata kunci.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const city = order.shippingAddress?.city || "—";
                  const formattedDate = new Date(order.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const shortId = order.id.slice(0, 8);

                  return (
                    <tr key={order.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* ORDER ID */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          {shortId}...
                        </Link>
                      </td>

                      {/* CUSTOMER */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-zinc-900">
                          {order.user?.name || "Customer BCL"}
                        </div>
                        <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium mt-0.5">
                          {city}
                        </div>
                      </td>

                      {/* TOTAL */}
                      <td className="px-5 py-4 whitespace-nowrap font-semibold text-zinc-900">
                        {formatRupiah(order.totalAmount)}
                      </td>

                      {/* PAYMENT */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {renderPaymentBadge(order.paymentStatus)}
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {renderStatusBadge(order.status)}
                      </td>

                      {/* DATE */}
                      <td className="px-5 py-4 whitespace-nowrap text-zinc-600">
                        {formattedDate}
                      </td>

                      {/* DETAIL ACTION */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-xs"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
