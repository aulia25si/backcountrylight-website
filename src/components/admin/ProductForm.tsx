"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProduct, createProduct } from "@/app/actions/products";
import imageCompression from "browser-image-compression";
import { X } from "lucide-react";
import { ProductVariantsEditor, ProductOption, ProductVariant } from "./ProductVariantsEditor";

type Category = { id: string; name: string };
type Brand = { id: string; name: string };
type ProductData = {
  id: string;
  sku?: string | null;
  name: string;
  slug?: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  brandId: string;
  image: string;
  images?: string[];
  isFeatured: boolean;
  options?: any[];
  variants?: any[];
};

interface ProductFormProps {
  categories: Category[];
  brands: Brand[];
  initialData?: ProductData;
}

export function ProductForm({ categories, brands, initialData }: ProductFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialData?.image || null);
  
  // Detailed Images State
  const [detailedFiles, setDetailedFiles] = useState<File[]>([]);
  const [detailedPreviews, setDetailedPreviews] = useState<string[]>([]);
  const [existingDetailedImages, setExistingDetailedImages] = useState<string[]>(initialData?.images || []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [nameInput, setNameInput] = useState(initialData?.name || "");
  const slugPreview = nameInput.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "");
  
  // Base Price for variants
  const [basePrice, setBasePrice] = useState<number>(initialData?.price || 0);

  // Options & Variants State
  const [options, setOptions] = useState<ProductOption[]>(
    initialData?.options?.map(opt => ({ name: opt.name, values: opt.values })) || []
  );
  const getIdFromUrl = (url: string | null | undefined) => {
    if (!url) return "";
    if (url === initialData?.image) return "main";
    const existingIndex = (initialData?.images || []).indexOf(url);
    if (existingIndex !== -1) return `existing-${existingIndex}`;
    return url;
  };

  const [variants, setVariants] = useState<ProductVariant[]>(
    initialData?.variants?.map(v => ({
      options: v.options,
      price: v.price?.toString() || "",
      stock: v.stock?.toString() || "0",
      sku: v.sku || "",
      imageUrl: getIdFromUrl(v.imageUrl),
    })) || []
  );

  const availableImages = useMemo(() => {
    const images = [];
    if (preview) {
      images.push({ id: "main", url: preview, label: "Main Image" });
    }
    existingDetailedImages.forEach((url, i) => {
      images.push({ id: `existing-${i}`, url, label: `Image ${i + 1}` });
    });
    detailedPreviews.forEach((url, i) => {
      images.push({ id: `new-${i}`, url, label: `New Image ${i + 1}` });
    });
    return images;
  }, [preview, existingDetailedImages, detailedPreviews]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleDetailedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    const totalImages = existingDetailedImages.length + detailedFiles.length + newFiles.length;
    
    if (totalImages > 5) {
      setError("You can only have up to 5 detailed images in total.");
      return;
    }
    
    setError("");
    const previews = newFiles.map(f => URL.createObjectURL(f));
    setDetailedFiles(prev => [...prev, ...newFiles]);
    setDetailedPreviews(prev => [...prev, ...previews]);
  };

  const removeDetailedFile = (index: number) => {
    setDetailedFiles(prev => prev.filter((_, i) => i !== index));
    setDetailedPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingDetailedImage = (index: number) => {
    setExistingDetailedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      
      const compressionOptions = {
        maxSizeMB: 0.5, // 500KB
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };

      // 1. Upload main image
      if (file) {
        const compressedFile = await imageCompression(file, compressionOptions);
        const uploadData = new FormData();
        uploadData.append("file", compressedFile, compressedFile.name);
        
        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadData });
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to upload image (Status: ${uploadRes.status})`);
        }
        
        const { url } = await uploadRes.json();
        formData.append("image", url);
      } else if (!initialData) {
        throw new Error("Please select a main image to upload.");
      }

      // 2. Upload new detailed images sequentially
      const newUrls: string[] = [];
      for (const detailedFile of detailedFiles) {
        const compressed = await imageCompression(detailedFile, compressionOptions);
        const uploadData = new FormData();
        uploadData.append("file", compressed, compressed.name);
        
        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadData });
        if (!uploadRes.ok) {
          throw new Error("Failed to upload one of the detailed images.");
        }
        
        const { url } = await uploadRes.json();
        newUrls.push(url);
      }

      // Append all existing and new detailed images to FormData
      existingDetailedImages.forEach(url => formData.append("images", url));
      newUrls.forEach(url => formData.append("images", url));

      // Append Options & Variants
      if (options.length > 0) {
        formData.append("options", JSON.stringify(options.filter(o => o.name && o.values.length > 0)));
      }
      
      const urlMap: Record<string, string> = {
        "main": file ? formData.get("image") as string : (initialData?.image || ""),
      };
      existingDetailedImages.forEach((url, i) => { urlMap[`existing-${i}`] = url; });
      newUrls.forEach((url, i) => { urlMap[`new-${i}`] = url; });

      if (variants.length > 0) {
        const parsedVariants = variants.map(v => {
          let realImageUrl = v.imageUrl;
          if (v.imageUrl && urlMap[v.imageUrl]) {
            realImageUrl = urlMap[v.imageUrl];
          }
          return {
            ...v,
            price: v.price ? parseInt(v.price, 10) : null,
            stock: parseInt(v.stock, 10) || 0,
            imageUrl: realImageUrl,
          };
        });
        formData.append("variants", JSON.stringify(parsedVariants));
      }

      // 3. Call Server Action
      let result;
      if (initialData) {
        result = await updateProduct(initialData.id, formData);
      } else {
        result = await createProduct(formData);
      }
      
      if (result?.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm border border-destructive/20">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Product Information Card */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Product Information</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Title <span className="text-destructive">*</span></Label>
                <Input 
                  id="name" 
                  name="name" 
                  required 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. 4Flex for Windmaster - SOD-460" 
                  disabled={isSubmitting} 
                  className="bg-zinc-50/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input 
                  id="slug" 
                  value={initialData?.slug || slugPreview} 
                  readOnly 
                  disabled 
                  className="bg-zinc-100 text-zinc-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  required
                  defaultValue={initialData?.description || ""}
                  disabled={isSubmitting}
                  placeholder="Detailed product description..." 
                  className="min-h-[250px] bg-zinc-50/50 resize-y"
                />
              </div>
            </div>
          </div>

          <ProductVariantsEditor 
            options={options} 
            setOptions={setOptions} 
            variants={variants} 
            setVariants={setVariants} 
            basePrice={basePrice}
            availableImages={availableImages}
          />

          {/* Product Images Card */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Product Images</h2>
              <span className="text-xs text-zinc-400">{existingDetailedImages.length + detailedFiles.length + (preview ? 1 : 0)} / 6 images</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Main Image */}
              <div className="relative aspect-square rounded-md border-2 border-zinc-200 overflow-hidden group bg-zinc-50">
                {preview ? (
                  <>
                    <img src={preview} alt="Main Preview" className="object-cover w-full h-full" />
                    <div className="absolute top-2 left-2 bg-zinc-900 text-white text-[10px] font-medium px-2 py-0.5 rounded tracking-wider">
                      MAIN
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-zinc-400">
                    <span className="text-sm">No Main</span>
                  </div>
                )}
              </div>

              {/* Existing Detailed Images */}
              {existingDetailedImages.map((url, i) => (
                <div key={`existing-${i}`} className="relative aspect-square rounded-md border border-zinc-200 overflow-hidden group bg-zinc-50">
                  <img src={url} alt={`Existing Detailed ${i}`} className="object-cover w-full h-full" />
                  <button 
                    type="button" 
                    onClick={() => removeExistingDetailedImage(i)}
                    className="absolute top-2 right-2 bg-white/90 text-zinc-900 rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {/* New Detailed Images */}
              {detailedPreviews.map((url, i) => (
                <div key={`new-${i}`} className="relative aspect-square rounded-md border-2 border-primary/50 overflow-hidden group bg-zinc-50">
                  <img src={url} alt={`New Detailed ${i}`} className="object-cover w-full h-full opacity-80" />
                  <button 
                    type="button" 
                    onClick={() => removeDetailedFile(i)}
                    className="absolute top-2 right-2 bg-white/90 text-zinc-900 rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Add Image Button */}
              <div className="relative aspect-square rounded-md border-2 border-dashed border-zinc-300 hover:border-zinc-400 transition-colors bg-zinc-50/50 flex flex-col items-center justify-center overflow-hidden">
                <span className="text-2xl text-zinc-400 mb-1">+</span>
                <span className="text-xs text-zinc-500 font-medium">Add Image</span>
                
                <input 
                  type="file" 
                  accept="image/*"
                  multiple={!!preview}
                  required={!initialData && !preview}
                  onChange={(e) => {
                    if (!preview) {
                      handleFileChange(e);
                    } else {
                      handleDetailedFileChange(e);
                    }
                  }}
                  disabled={isSubmitting || (preview ? existingDetailedImages.length + detailedFiles.length >= 5 : false)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              Upload up to 6 product images (1 Main, 5 Additional). 
            </p>
          </div>
        </div>

        {/* Right Column - Metadata & Actions */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Pricing & Stock Card */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Pricing & Stock</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (IDR) <span className="text-destructive">*</span></Label>
                <Input 
                  id="price" 
                  name="price" 
                  type="number" 
                  required 
                  min="0" 
                  value={basePrice || ""} 
                  onChange={(e) => setBasePrice(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 340000" 
                  disabled={isSubmitting} 
                  className="bg-zinc-50/50" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="comparePrice" className="text-zinc-400">Compare at Price (IDR)</Label>
                <Input id="comparePrice" type="number" disabled placeholder="0" className="bg-zinc-100 text-zinc-400 cursor-not-allowed" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock <span className="text-destructive">*</span></Label>
                <Input id="stock" name="stock" type="number" required min="0" defaultValue={initialData?.stock ?? 0} disabled={isSubmitting} className="bg-zinc-50/50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-zinc-400">Weight (grams)</Label>
                <Input id="weight" type="number" disabled placeholder="100" className="bg-zinc-100 text-zinc-400 cursor-not-allowed" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input id="sku" name="sku" defaultValue={initialData?.sku || ""} placeholder="e.g. SOD-460" disabled={isSubmitting} className="bg-zinc-50/50" />
              </div>
            </div>
          </div>

          {/* Organization Card */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Organization</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category <span className="text-destructive">*</span></Label>
                <select 
                  id="categoryId" 
                  name="categoryId" 
                  required 
                  defaultValue={initialData?.categoryId || ""}
                  disabled={isSubmitting}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandId">Brand <span className="text-destructive">*</span></Label>
                <select 
                  id="brandId" 
                  name="brandId" 
                  required 
                  defaultValue={initialData?.brandId || ""}
                  disabled={isSubmitting}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a brand</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t mt-4">
                <div className="flex items-center justify-between bg-green-50/50 p-3 rounded-md border border-green-100">
                  <Label htmlFor="isFeatured" className="font-medium cursor-pointer text-green-700">Status (Active)</Label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="isFeatured" 
                      name="isFeatured" 
                      defaultChecked={initialData ? initialData.isFeatured : true}
                      disabled={isSubmitting}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <Button type="button" variant="outline" className="w-full bg-white" onClick={() => window.history.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
