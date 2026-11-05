import React, { useMemo, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { Button } from "./Button";
import { productAPI, Product, UpdateProductData } from "../services/api";
import { useToast } from "./ToastProvider";
import { Category } from "../types";

interface ProductFormProps {
    product?: Product;
    onSuccess?: (product: Product) => void;
    onCancel?: () => void;
}

const initialForm = {
    name: "",
    brand: "",
    category: Category.WOMEN,
    rentalPrice: "",
    retailPrice: "",
    buyPrice: "",
    isForSale: true,
    description: "",
    color: "Multi",
    occasion: "General",
};

const extractImageUrls = (response: unknown): string[] => {
    if (Array.isArray(response)) {
        return response.filter((value): value is string => typeof value === "string");
    }

    if (response && typeof response === "object") {
        const result = response as Record<string, unknown>;
        for (const key of ["images", "imageUrls", "uploadedImages", "data", "product"]) {
            if (key in result) {
                const urls = extractImageUrls(result[key]);
                if (urls.length > 0) return urls;
            }
        }
        if (typeof result.url === "string") return [result.url];
    }

    return [];
};

export const ProductForm: React.FC<ProductFormProps> = ({ product, onSuccess, onCancel }) => {
    const toast = useToast();
    const [form, setForm] = useState(() => product ? {
        name: product.name,
        brand: product.brand,
        category: product.category as Category,
        rentalPrice: String(product.rentalPrice),
        retailPrice: String(product.retailPrice),
        buyPrice: String(product.buyPrice ?? ""),
        isForSale: product.isForSale,
        description: product.description ?? "",
        color: product.color ?? "Multi",
        occasion: product.occasion ?? "General",
    } : initialForm);
    const [sizeInput, setSizeInput] = useState(product?.availableSizes.join(", ") ?? "S, M, L");
    const [existingImages, setExistingImages] = useState<string[]>(product?.images ?? []);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalImages = useMemo(() => imageFiles.length, [imageFiles.length]);

    const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []).filter((file) =>
            file.type.startsWith("image/"),
        );

        if (files.length === 0) {
            toast("Only image files can be uploaded.", "error");
            event.target.value = "";
            return;
        }

        const urls = files.map((file) => URL.createObjectURL(file));

        setImageFiles((prev) => [...prev, ...files]);
        setPreviewUrls((prev) => [...prev, ...urls]);
        event.target.value = "";
    };

    const removeImage = (index: number) => {
        const preview = previewUrls[index];
        if (preview?.startsWith("blob:")) {
            URL.revokeObjectURL(preview);
        }

        setImageFiles((prev) => prev.filter((_, idx) => idx !== index));
        setPreviewUrls((prev) => prev.filter((_, idx) => idx !== index));
    };

    const removeExistingImage = (index: number) => {
        setExistingImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (imageFiles.length + existingImages.length === 0) {
            toast("Keep at least one product image or upload a replacement.", "error");
            return;
        }

        if (!form.name.trim() || !form.brand.trim() || !form.category.trim()) {
            toast("Name, brand, and category are required.", "error");
            return;
        }

        const rentalPrice = Number(form.rentalPrice);
        const retailPrice = Number(form.retailPrice);
        const buyPrice = Number(form.buyPrice || 0);

        if (!Number.isFinite(rentalPrice) || !Number.isFinite(retailPrice)) {
            toast("Rental price and retail price must be valid numbers.", "error");
            return;
        }

        setIsSubmitting(true);

        try {
            const productData = {
                name: form.name.trim(),
                brand: form.brand.trim(),
                category: form.category,
                rentalPrice,
                retailPrice,
                buyPrice,
                isForSale: Boolean(form.isForSale),
                autoSellAfterRentals: 5,
                images: existingImages,
                description: form.description.trim(),
                color: form.color.trim() || "Multi",
                occasion: form.occasion.trim() || "General",
                availableSizes: sizeInput
                    .split(",")
                    .map((size) => size.trim())
                    .filter(Boolean),
            };

            let savedProduct: Product;
            if (product) {
                const updatedProduct = await productAPI.update(product.id, productData as UpdateProductData);
                const uploadResponse = imageFiles.length > 0
                    ? await productAPI.uploadImages(product.id, imageFiles)
                    : null;
                const uploadedImages = extractImageUrls(uploadResponse);
                const refreshedProduct = imageFiles.length > 0 && uploadedImages.length === 0
                    ? await productAPI.getById(product.id)
                    : null;
                savedProduct = {
                    ...product,
                    ...updatedProduct,
                    ...refreshedProduct,
                    images: refreshedProduct?.images ?? [...new Set([...existingImages, ...uploadedImages])],
                };
            } else {
                savedProduct = await productAPI.create({ ...productData, ownerId: 0 }, imageFiles);
            }

            if (onSuccess) {
                onSuccess(savedProduct);
            }

            setForm(initialForm);
            setSizeInput("S, M, L");
            setImageFiles([]);
            setPreviewUrls([]);
            toast(product ? "Listing updated successfully." : "Item submitted for admin approval.", "success");
        } catch (error) {
            console.error(product ? "Failed to update product." : "Failed to create product.", error);
            toast(
                error instanceof Error ? error.message : product ? "Failed to update listing." : "Failed to list item.",
                "error",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 p-8 rounded-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-2xl text-cream">{product ? "Edit Listing" : "List New Attire"}</h3>
                {onCancel && <button type="button" onClick={onCancel} className="text-sm text-cream/60 hover:text-cream">Cancel</button>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs text-cream/50 mb-1 block">Item Name</label>
                        <input
                            required
                            placeholder="e.g. Vintage Chanel Suit"
                            value={form.name}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, name: event.target.value }))
                            }
                            className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-cream/50 mb-1 block">Brand</label>
                        <input
                            required
                            placeholder="e.g. Chanel"
                            value={form.brand}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, brand: event.target.value }))
                            }
                            className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <label className="text-xs text-cream/50 mb-1 block">Category</label>
                        <select
                            value={form.category}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    category: event.target.value as Category,
                                }))
                            }
                            className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                        >
                            <option value={Category.WOMEN}>Women</option>
                            <option value={Category.MEN}>Men</option>
                            <option value={Category.ACCESSORIES}>Accessories</option>
                            <option value={Category.WATCHES}>Watches</option>
                            <option value={Category.BAGS}>Bags</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-cream/50 mb-1 block">Rent Price (₦)</label>
                        <input
                            required
                            type="number"
                            inputMode="numeric"
                            placeholder="0"
                            value={form.rentalPrice}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    rentalPrice: event.target.value,
                                }))
                            }
                            className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-cream/50 mb-1 block">Retail Price (₦)</label>
                        <input
                            required
                            type="number"
                            inputMode="numeric"
                            placeholder="0"
                            value={form.retailPrice}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    retailPrice: event.target.value,
                                }))
                            }
                            className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs text-cream/50 mb-1 block">Buy Price (₦)</label>
                        <input
                            type="number"
                            inputMode="numeric"
                            placeholder="0 (Optional)"
                            value={form.buyPrice}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, buyPrice: event.target.value }))
                            }
                            className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                        />
                    </div>

                    <div className="flex flex-col justify-end pb-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.isForSale}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        isForSale: event.target.checked,
                                    }))
                                }
                                className="w-5 h-5 accent-golden-orange"
                            />
                            <label className="text-cream text-sm">Available for Sale</label>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-cream/50 mb-1 block">Sizes (comma separated)</label>
                    <input
                        required
                        placeholder="S, M, L"
                        value={sizeInput}
                        onChange={(event) => setSizeInput(event.target.value)}
                        className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs text-cream/50 mb-1 block">Description</label>
                        <textarea
                            required
                            rows={4}
                            value={form.description}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    description: event.target.value,
                                }))
                            }
                            className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-cream/50 mb-1 block">Color</label>
                        <input
                            value={form.color}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, color: event.target.value }))
                            }
                            className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                        />

                        <label className="text-xs text-cream/50 mb-1 mt-4 block">Occasion</label>
                        <input
                            value={form.occasion}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, occasion: event.target.value }))
                            }
                            className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs text-cream/50 mb-2 block uppercase font-bold tracking-wider">
                        Product Gallery
                    </label>
                    <div className="border-2 border-dashed border-white/10 p-8 text-center cursor-pointer relative hover:border-golden-orange/50 hover:bg-white/5 transition-all group rounded-sm">
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFiles}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            id="product-form-upload"
                        />
                        <div className="pointer-events-none flex flex-col items-center">
                            <div className="bg-black/40 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                <ImageIcon className="text-cream/50" size={24} />
                            </div>
                            <p className="text-cream text-sm font-bold mb-1">Click to Upload Images</p>
                            <p className="text-cream/40 text-xs">
                                Support multiple files (JPG, PNG)
                            </p>
                        </div>
                    </div>

                    {existingImages.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[10px] text-cream/40 uppercase mb-2">Current Images</p>
                            <div className="flex flex-wrap gap-3">
                                {existingImages.map((src, index) => (
                                    <div key={`${src}-${index}`} className="relative group w-24 h-24 rounded-sm overflow-hidden border border-white/10">
                                        <img src={src} className="w-full h-full object-cover" alt={`Current product image ${index + 1}`} />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(index)}
                                            className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-1 opacity-100 transition-opacity hover:bg-red-600"
                                            title="Remove existing image"
                                            aria-label={`Remove existing image ${index + 1}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {previewUrls.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[10px] text-cream/40 uppercase mb-2">
                                Uploaded ({totalImages})
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {previewUrls.map((src, index) => (
                                    <div
                                        key={`${src}-${index}`}
                                        className="relative group w-24 h-24 rounded-sm overflow-hidden border border-white/10"
                                    >
                                        <img
                                            src={src}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            alt={`Preview ${index + 1}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                            title="Remove Image"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <Button fullWidth type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (product ? "Saving..." : "Publishing...") : (product ? "Save Changes" : "Publish Listing (Global Visibility)")}
                </Button>
            </form>
        </div>
    );
};
