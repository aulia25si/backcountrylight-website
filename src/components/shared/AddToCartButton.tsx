"use client";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface AddToCartButtonProps {
  product: {
    id?: string;
    productId: string;
    variantId?: string | null;
    variantName?: string | null;
    name: string;
    price: number;
    image: string | null;
    stock: number;
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem, openCart } = useCartStore();

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      productId: product.productId,
      variantId: product.variantId || null,
      variantName: product.variantName || null,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
      quantity: 1,
    });
    
    const displayLabel = product.variantName ? `${product.name} (${product.variantName})` : product.name;
    toast.success("Added to cart", {
      description: `${displayLabel} has been added to your cart.`,
    });
    
    openCart();
  };

  return (
    <Button 
      size="lg" 
      className="w-full rounded-none h-14 text-base"
      onClick={handleAddToCart}
      disabled={product.stock <= 0}
    >
      <ShoppingCart className="mr-2 h-5 w-5" />
      {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
    </Button>
  );
}
