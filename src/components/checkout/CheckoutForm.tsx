"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrder } from "@/app/actions/order";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { AlertCircle, CreditCard, ShieldCheck } from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/payment-config";

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
}

export function CheckoutForm({ 
  addresses, 
  email 
}: { 
  addresses: Address[], 
  email: string 
}) {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses.find(a => a.isDefault)?.id || addresses[0]?.id || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  const subtotal = getTotalPrice();
  const shipping = subtotal > 0 ? PAYMENT_CONFIG.flatShippingFee : 0;
  const total = subtotal + shipping;

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;

    if (items.length === 0) {
      toast.error("Keranjang belanja Anda kosong.");
      return;
    }

    if (!selectedAddressId) {
      toast.error("Silakan pilih alamat pengiriman.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await createOrder({
        addressId: selectedAddressId,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
        })),
      });

      if (result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
      } else if (result.orderId) {
        toast.success("Pesanan berhasil dibuat!");
        clearCart();
        router.push(`/orders/${result.orderId}`);
      } else {
        toast.error("Terjadi kendala saat memproses pesanan.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses pesanan.");
      setIsSubmitting(false);
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7 space-y-10">
        
        {/* Contact Info */}
        <div>
          <h2 className="text-xl font-heading font-medium mb-4">Informasi Kontak</h2>
          <div className="space-y-2">
            <Label htmlFor="email">Email Akun</Label>
            <Input id="email" value={email} disabled className="bg-muted/50 text-muted-foreground" />
          </div>
        </div>

        {/* Shipping Address */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-heading font-medium">Alamat Pengiriman</h2>
            {addresses.length > 0 && (
              <Link href="/account/address" className="text-sm text-primary hover:underline">
                Kelola Alamat
              </Link>
            )}
          </div>
          
          {addresses.length === 0 ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Belum ada alamat pengiriman</p>
                <p className="text-sm mt-1 mb-3">Anda harus menambahkan alamat pengiriman sebelum dapat membuat pesanan.</p>
                <Button size="sm" render={<Link href="/account/address" />}>
                  Tambah Alamat di Profil
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pilih Alamat Tujuan</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                >
                  {addresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.firstName} {addr.lastName} - {addr.street}, {addr.city} ({addr.postalCode}) {addr.isDefault ? "[Default]" : ""}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Preview of selected address */}
              {selectedAddress && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Nama Depan</Label>
                    <Input value={selectedAddress.firstName} disabled className="bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Belakang</Label>
                    <Input value={selectedAddress.lastName} disabled className="bg-muted/30" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Alamat Lengkap</Label>
                    <Input value={selectedAddress.street} disabled className="bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Kota / Kabupaten</Label>
                    <Input value={selectedAddress.city} disabled className="bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Kode Pos</Label>
                    <Input value={selectedAddress.postalCode} disabled className="bg-muted/30" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Method Notice */}
        <div className="border rounded-lg p-5 bg-card space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-medium text-lg">Metode Pembayaran: Transfer Bank Manual</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pembayaran dilakukan via transfer manual ke rekening bank resmi Backcountry Light. Rincian nomor rekening, nominal tepat, dan panduan konfirmasi pembayaran akan ditampilkan langsung pada halaman konfirmasi setelah pesanan Anda dibuat.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Verifikasi manual oleh tim Backcountry Light dalam 1x24 jam kerja.</span>
          </div>
        </div>
      </div>

      {/* Right Column: Order Summary */}
      <div className="lg:col-span-5">
        <div className="bg-muted/30 border rounded-lg p-6 sticky top-24">
          <h2 className="text-xl font-heading font-medium mb-6">Ringkasan Pesanan</h2>
          
          <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-start text-sm gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="text-muted-foreground font-mono mt-0.5">{item.quantity}x</span>
                  <div>
                    <span className="line-clamp-1 font-medium">{item.name}</span>
                    {item.variantName && (
                      <span className="text-xs text-muted-foreground block">{item.variantName}</span>
                    )}
                  </div>
                </div>
                <span className="font-medium shrink-0">{formatRupiah(item.price * item.quantity)}</span>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">Tidak ada barang di keranjang</p>
            )}
          </div>
          
          <div className="space-y-3 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal Barang</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ongkos Kirim (Flat)</span>
              <span>{formatRupiah(shipping)}</span>
            </div>
            <div className="flex justify-between font-medium text-lg pt-3 border-t">
              <span>Total Pembayaran</span>
              <span>{formatRupiah(total)}</span>
            </div>
          </div>
          
          <div className="mt-8">
            <Button 
              size="lg" 
              className="w-full h-14 text-base"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || items.length === 0 || addresses.length === 0}
            >
              {isSubmitting ? "Memproses Pesanan..." : "Buat Pesanan (Place Order)"}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Dengan membuat pesanan, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi Backcountry Light.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
