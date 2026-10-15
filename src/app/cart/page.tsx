"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { PAYMENT_CONFIG } from "@/lib/payment-config";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const subtotal = getTotalPrice();
  const shipping = subtotal > 0 ? PAYMENT_CONFIG.flatShippingFee : 0;
  const total = subtotal + shipping;

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-muted/20 py-12 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl text-center">
          <p className="text-muted-foreground">Memuat keranjang belanja...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-muted/20 py-12 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <h1 className="text-3xl md:text-4xl font-heading font-medium tracking-tight mb-10">
            Your Cart
          </h1>
          <div className="bg-background border border-border p-12 text-center rounded-lg max-w-md mx-auto flex flex-col items-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" strokeWidth={1} />
            <h2 className="text-xl font-heading font-medium mb-2">Keranjang Anda masih kosong</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Jelajahi koleksi gear outdoor ultralight kami dan tambahkan perlengkapan terbaik ke keranjang.
            </p>
            <Button size="lg" className="rounded-none w-full" render={<Link href="/shop" />}>
              Mulai Belanja
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-12 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <h1 className="text-3xl md:text-4xl font-heading font-medium tracking-tight mb-10">
          Your Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-background border border-border">
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b text-sm font-medium tracking-widest uppercase text-muted-foreground">
                <div className="col-span-6">Product</div>
                <div className="col-span-3 text-center">Quantity</div>
                <div className="col-span-3 text-right">Total</div>
              </div>

              {/* Items */}
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 items-center">
                    {/* Product Info */}
                    <div className="col-span-1 md:col-span-6 flex gap-4">
                      <div className="relative h-24 w-24 bg-muted flex-shrink-0 overflow-hidden border">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted">
                            <ShoppingCart className="h-6 w-6 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-heading font-medium text-lg mb-1 leading-snug">
                          {item.name}
                        </h3>
                        {item.variantName && (
                          <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/20 w-fit mb-1">
                            {item.variantName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Harga Satuan: {formatRupiah(item.price)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1 md:col-span-3 flex items-center md:justify-center gap-4">
                      <div className="flex items-center border border-border">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="p-2 hover:bg-muted transition-colors disabled:opacity-40"
                          aria-label="Kurangi kuantitas"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.stock > 0 ? item.quantity >= item.stock : false}
                          className="p-2 hover:bg-muted transition-colors disabled:opacity-40"
                          aria-label="Tambah kuantitas"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Price & Remove */}
                    <div className="col-span-1 md:col-span-3 flex items-center justify-between md:flex-col md:items-end md:justify-center gap-4">
                      <span className="font-medium text-lg">
                        {formatRupiah(item.price * item.quantity)}
                      </span>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                        aria-label={`Hapus ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="md:hidden">Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <Link href="/shop" className="font-medium hover:underline underline-offset-4">
                &larr; Lanjut Belanja
              </Link>
              <button 
                onClick={clearCart}
                className="text-muted-foreground hover:text-destructive transition-colors text-sm"
              >
                Kosongkan Keranjang
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 bg-background border border-border p-6 md:p-8 sticky top-24">
            <h2 className="text-xl font-heading font-medium mb-6">Ringkasan Pesanan</h2>
            
            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Biaya Pengiriman (Flat)</span>
                <span className="font-medium">{formatRupiah(shipping)}</span>
              </div>
            </div>
            
            <div className="border-t border-border pt-6 mb-8">
              <div className="flex justify-between items-end">
                <span className="font-heading font-medium text-lg">Total</span>
                <span className="font-medium text-2xl">{formatRupiah(total)}</span>
              </div>
            </div>
            
            <Button size="lg" className="w-full rounded-none h-14 text-base" render={<Link href="/checkout" />}>
              Lanjut ke Checkout
            </Button>
            
            <div className="mt-6 text-center text-xs text-muted-foreground flex flex-col gap-2">
              <p>Pembayaran manual melalui transfer bank setelah pesanan dibuat.</p>
              <p>Pengiriman aman ke seluruh wilayah Indonesia.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
