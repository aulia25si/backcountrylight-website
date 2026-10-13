"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

export type ProductOption = {
  name: string;
  values: string[];
  inputValue?: string;
};

export type ProductVariant = {
  options: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
  imageUrl?: string;
};

interface ProductVariantsEditorProps {
  options: ProductOption[];
  setOptions: (options: ProductOption[]) => void;
  variants: ProductVariant[];
  setVariants: (variants: ProductVariant[]) => void;
  basePrice: number;
  availableImages?: { id: string; url: string; label: string }[];
}

export function ProductVariantsEditor({ options, setOptions, variants, setVariants, basePrice, availableImages }: ProductVariantsEditorProps) {
  const [hasVariants, setHasVariants] = useState(options.length > 0);

  // When options change, generate new variants matrix
  useEffect(() => {
    if (!hasVariants || options.length === 0) {
      setVariants([]);
      return;
    }

    // Generate cartesian product
    const generateCombinations = (opts: ProductOption[]): Record<string, string>[] => {
      const validOpts = opts.filter(o => o.name && o.values.length > 0);
      if (validOpts.length === 0) return [];
      if (validOpts.length === 1) {
        return validOpts[0].values.map(v => ({ [validOpts[0].name]: v }));
      }
      
      const rest = generateCombinations(validOpts.slice(1));
      const result: Record<string, string>[] = [];
      
      for (const val of validOpts[0].values) {
        for (const combo of rest) {
          result.push({ [validOpts[0].name]: val, ...combo });
        }
      }
      return result;
    };

    const newCombinations = generateCombinations(options);
    
    // Merge with existing variants to preserve price/stock/sku
    const newVariants = newCombinations.map(combo => {
      // Find matching existing variant
      const existing = variants.find(v => {
        return Object.keys(combo).every(k => v.options[k] === combo[k]) &&
               Object.keys(v.options).every(k => v.options[k] === combo[k]);
      });
      
      if (existing) return existing;
      
      return {
        options: combo,
        price: "", // empty means fallback to base price
        stock: "0",
        sku: "",
        imageUrl: "",
      };
    });
    
    setVariants(newVariants);
  }, [options, hasVariants]);

  const addOption = () => {
    setOptions([...options, { name: "", values: [] }]);
  };

  const removeOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const updateOptionName = (index: number, name: string) => {
    const newOptions = [...options];
    newOptions[index].name = name;
    setOptions(newOptions);
  };

  const updateOptionValues = (index: number, valuesStr: string) => {
    const newOptions = [...options];
    newOptions[index].inputValue = valuesStr;
    newOptions[index].values = valuesStr.split(",").map(s => s.trim()).filter(Boolean);
    setOptions(newOptions);
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Product Variants</h2>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasVariants"
            checked={hasVariants}
            onChange={(e) => {
              setHasVariants(e.target.checked);
              if (!e.target.checked) setOptions([]);
            }}
            className="rounded border-zinc-300 w-4 h-4 text-primary focus:ring-primary"
          />
          <Label htmlFor="hasVariants" className="text-sm font-medium cursor-pointer">This product has variants</Label>
        </div>
      </div>

      {hasVariants && (
        <div className="space-y-6 border-t pt-6">
          {/* Options Builder */}
          <div className="space-y-4">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-4 items-start bg-zinc-50/50 p-4 rounded-lg border border-dashed">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-zinc-500">Option Name</Label>
                  <Input
                    placeholder="e.g., Size, Color"
                    value={opt.name}
                    onChange={(e) => updateOptionName(i, e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="flex-[2] space-y-2">
                  <Label className="text-xs text-zinc-500">Option Values (comma separated)</Label>
                  <Input
                    placeholder="e.g., S, M, L"
                    value={opt.inputValue !== undefined ? opt.inputValue : opt.values.join(", ")}
                    onChange={(e) => updateOptionValues(i, e.target.value)}
                    className="bg-white"
                  />
                </div>
                <Button variant="ghost" size="icon" className="mt-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeOption(i)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addOption} className="w-full border-dashed">
              <Plus className="w-4 h-4 mr-2" /> Add another option
            </Button>
          </div>

          {/* Variants Table */}
          {variants.length > 0 && (
            <div className="space-y-4 pt-4">
              <Label className="text-xs text-zinc-500 uppercase">Available Combinations</Label>
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-500 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Variant</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Image URL</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Price (IDR)</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Stock</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, i) => (
                      <tr key={i} className="border-b last:border-0 bg-white">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {Object.entries(v.options).map(([k, val]) => (
                              <span key={k} className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md text-xs border">
                                {val}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={v.imageUrl || ""}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[i] = { ...newVariants[i], imageUrl: e.target.value };
                              setVariants(newVariants);
                            }}
                            className="flex h-8 w-40 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">No Image</option>
                            {availableImages?.map(img => (
                              <option key={img.id} value={img.id}>{img.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Input 
                            type="number" 
                            placeholder={basePrice ? basePrice.toString() : "Base"} 
                            value={v.price} 
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[i] = { ...newVariants[i], price: e.target.value };
                              setVariants(newVariants);
                            }}
                            className="w-32 h-8 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input 
                            type="number" 
                            value={v.stock} 
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[i] = { ...newVariants[i], stock: e.target.value };
                              setVariants(newVariants);
                            }}
                            className="w-24 h-8 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input 
                            value={v.sku} 
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[i] = { ...newVariants[i], sku: e.target.value };
                              setVariants(newVariants);
                            }}
                            className="w-32 h-8 text-sm"
                            placeholder="Optional SKU"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
