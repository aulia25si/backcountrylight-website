import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string; // Unique cart line item ID (e.g. `productId:variantId` or `productId`)
  productId: string;
  variantId?: string | null;
  variantName?: string | null;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, 'quantity' | 'id'> & { id?: string; quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      
      addItem: (newItem) => set((state) => {
        const lineItemId = newItem.id || (newItem.variantId ? `${newItem.productId}:${newItem.variantId}` : newItem.productId);
        const resolvedItem: CartItem = {
          ...newItem,
          id: lineItemId,
          productId: newItem.productId || lineItemId,
          variantId: newItem.variantId || null,
          variantName: newItem.variantName || null,
          quantity: newItem.quantity || 1,
        };

        const existingIndex = state.items.findIndex((item) => 
          item.id === lineItemId || 
          (item.productId === resolvedItem.productId && (item.variantId || null) === (resolvedItem.variantId || null))
        );
        const addQty = newItem.quantity || 1;
        
        if (existingIndex > -1) {
          const existing = state.items[existingIndex];
          const maxStock = resolvedItem.stock > 0 ? resolvedItem.stock : existing.stock;
          const newQuantity = maxStock > 0 ? Math.min(existing.quantity + addQty, maxStock) : existing.quantity + addQty;
          
          const updatedItems = [...state.items];
          updatedItems[existingIndex] = {
            ...existing,
            ...resolvedItem,
            id: lineItemId,
            quantity: newQuantity,
          };
          return { items: updatedItems };
        }
        
        // New item
        return {
          items: [...state.items, resolvedItem],
        };
      }),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),
      
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id === id) {
            const maxStock = item.stock > 0 ? item.stock : 999;
            const validQuantity = Math.max(1, Math.min(quantity, maxStock));
            return { ...item, quantity: validQuantity };
          }
          return item;
        }),
      })),
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
    }),
    {
      name: 'bcl-cart-storage',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState || !Array.isArray(persistedState.items)) {
          return { items: [], isOpen: false };
        }

        const sanitizedItems = persistedState.items
          .map((item: any) => {
            const rawId = String(item.id || '');
            let pId = item.productId || rawId;
            let vId = item.variantId || null;

            if (!item.productId && rawId.includes(':')) {
              const parts = rawId.split(':');
              pId = parts[0];
              vId = parts[1] || null;
            }

            const lineItemId = vId ? `${pId}:${vId}` : pId;

            return {
              ...item,
              id: lineItemId,
              productId: pId,
              variantId: vId,
              variantName: item.variantName || null,
              quantity: Math.max(1, Number(item.quantity) || 1),
            };
          })
          .filter((item: any) => Boolean(item.productId));

        return {
          ...persistedState,
          items: sanitizedItems,
        };
      },
    }
  )
);
