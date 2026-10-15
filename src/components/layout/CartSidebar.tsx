"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Plus, Minus, X } from "lucide-react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";
import Image from "next/image";
import { formatRupiah } from "@/lib/utils";

export function CartSidebar() {
  const { items, removeItem, updateQuantity, getTotalItems, getTotalPrice, isOpen, setIsOpen } = useCartStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger className="relative inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 w-9 transition-colors" aria-label="Cart">
        <ShoppingCart className="h-5 w-5" />
        {isHydrated && totalItems > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {totalItems}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md border-l border-border bg-background p-0">
        <div className="p-6 pb-2">
          <SheetHeader className="text-left">
            <SheetTitle className="font-heading font-medium text-2xl">Your Cart</SheetTitle>
          </SheetHeader>
        </div>
        
        {!isHydrated || items.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/20 mb-2" strokeWidth={1} />
            <h3 className="text-xl font-heading font-medium">Your cart is empty</h3>
            <p className="text-muted-foreground text-sm max-w-[250px]">
              Looks like you haven't added any ultralight gear to your cart yet.
            </p>
            <Button variant="outline" className="mt-4 rounded-none" render={<Link href="/shop" onClick={() => setIsOpen(false)} />}>
              Start Shopping
            </Button>
          </div>
        ) : (
          /* Cart Items */
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            <div className="flex flex-col gap-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded bg-muted/50 border shrink-0">
                    {item.image ? (
                      <Image 
                        src={item.image} 
                        alt={item.name} 
                        fill 
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-medium text-sm line-clamp-2 leading-snug">{item.name}</h4>
                        {item.variantName && (
                          <span className="text-xs text-muted-foreground block mt-0.5">{item.variantName}</span>
                        )}
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center border rounded-md">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.stock > 0 ? item.quantity >= item.stock : false}
                          className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="font-medium text-sm">{formatRupiah(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        {isHydrated && items.length > 0 && (
          <div className="p-6 pt-4 border-t border-border mt-auto bg-background">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Subtotal</span>
              <span className="font-heading font-medium text-lg">{formatRupiah(totalPrice)}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Pengiriman dihitung saat checkout (Flat Rp 25.000).</p>
            <div className="flex flex-col gap-2">
              <Button size="lg" className="w-full rounded-none h-14 text-base bg-foreground text-background hover:bg-foreground/90" render={<Link href="/checkout" onClick={() => setIsOpen(false)} />}>
                Go to Checkout
              </Button>
              <Button variant="outline" className="w-full rounded-none h-10 text-sm" render={<Link href="/cart" onClick={() => setIsOpen(false)} />}>
                View Cart Page
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
