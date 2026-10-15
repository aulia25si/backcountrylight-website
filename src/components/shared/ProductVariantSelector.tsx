"use client";

import { useState, useMemo, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";
import { AddToCartButton } from "@/components/shared/AddToCartButton";

interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  stock: number;
  options: any; // JSON
  imageUrl?: string | null;
}

interface ProductVariantSelectorProps {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    image: string;
    options: ProductOption[];
    variants: ProductVariant[];
  };
}

export function ProductVariantSelector({ product }: ProductVariantSelectorProps) {
  // Initialize with the first available option for each if they exist
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.options.forEach(opt => {
      if (opt.values.length > 0) {
        initial[opt.name] = opt.values[0];
      }
    });
    return initial;
  });

  const activeVariant = useMemo(() => {
    if (product.variants.length === 0) return null;
    return product.variants.find(v => {
      const vOpts = v.options as Record<string, string>;
      return Object.keys(selectedOptions).every(k => vOpts[k] === selectedOptions[k]);
    });
  }, [selectedOptions, product.variants]);

  useEffect(() => {
    if (activeVariant?.imageUrl) {
      window.dispatchEvent(new CustomEvent('variantImageChange', { detail: activeVariant.imageUrl }));
    }
  }, [activeVariant]);

  const hasVariants = product.variants.length > 0;
  const isCombinationAvailable = !hasVariants || !!activeVariant;
  const displayPrice = activeVariant?.price ?? product.price;
  const displayStock = hasVariants ? (activeVariant ? activeVariant.stock : 0) : product.stock;
  
  // Format variant name to show in cart
  const variantName = activeVariant ? Object.values(selectedOptions).join(" / ") : "";

  return (
    <div className="flex flex-col">
      <div className="text-2xl font-medium mb-6">
        {formatRupiah(displayPrice)}
      </div>

      {product.options.length > 0 && (
        <div className="space-y-6 mb-8">
          {product.options.map((opt) => (
            <div key={opt.id} className="space-y-3">
              <div className="font-medium">
                Pilih {opt.name}: <span className="text-muted-foreground font-normal">{selectedOptions[opt.name]}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((val) => {
                  const isSelected = selectedOptions[opt.name] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.name]: val }))}
                      className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasVariants && !activeVariant && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md mb-6">
          Kombinasi pilihan varian ini saat ini tidak tersedia. Silakan pilih opsi lain.
        </div>
      )}

      <div className="space-y-4 mb-10">
        <AddToCartButton 
          product={{
            id: activeVariant ? `${product.id}:${activeVariant.id}` : product.id,
            productId: product.id,
            variantId: activeVariant ? activeVariant.id : null,
            variantName: activeVariant ? variantName : null,
            name: product.name,
            price: displayPrice,
            image: activeVariant?.imageUrl || product.image,
            stock: isCombinationAvailable ? displayStock : 0,
          }} 
        />
        {isCombinationAvailable && displayStock > 0 && displayStock < 10 && (
          <p className="text-sm text-destructive font-medium">Tersisa {displayStock} item!</p>
        )}
      </div>
    </div>
  );
}
