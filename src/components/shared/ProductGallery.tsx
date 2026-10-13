"use client";
import Image from "next/image";
import { useState, useEffect } from "react";

export function ProductGallery({ images }: { images: string[] }) {
  const [mainImage, setMainImage] = useState(images[0]);

  useEffect(() => {
    const handleVariantImageChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setMainImage(customEvent.detail);
      }
    };
    window.addEventListener('variantImageChange', handleVariantImageChange);
    return () => window.removeEventListener('variantImageChange', handleVariantImageChange);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/5] bg-muted w-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 font-mono text-xs z-0">
          [Image Placeholder]
        </div>
        {mainImage && (
          <Image 
            src={mainImage} 
            alt="Product image" 
            fill 
            className="object-cover z-10 opacity-0 data-[loaded=true]:opacity-100 transition-opacity duration-300" 
            onLoad={(e) => e.currentTarget.setAttribute('data-loaded', 'true')} 
            onError={(e) => e.currentTarget.style.display = 'none'} 
          />
        )}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {images.map((img, i) => (
          <div 
            key={i} 
            className={`relative aspect-square bg-muted cursor-pointer overflow-hidden border-2 transition-colors ${mainImage === img ? 'border-foreground' : 'border-transparent hover:border-border'}`}
            onClick={() => setMainImage(img)}
          >
             <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 font-mono text-[10px] z-0">
               [Thumb]
             </div>
             <Image 
               src={img} 
               alt={`Thumbnail ${i+1}`} 
               fill 
               className="object-cover z-10 opacity-0 data-[loaded=true]:opacity-100" 
               onLoad={(e) => e.currentTarget.setAttribute('data-loaded', 'true')} 
               onError={(e) => e.currentTarget.style.display = 'none'} 
             />
          </div>
        ))}
      </div>
    </div>
  );
}
