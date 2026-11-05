import React, { createContext, useContext, useState } from "react";
import { Product } from "../types";
import { productAPI } from "../services/api";

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  updateProduct: (productId: string, patch: Partial<Product>) => void;
  incrementRentalCount: (productId: string) => void;
}

const ProductContext = createContext<ProductContextType>({
  products: [],
  addProduct: () => { },
  removeProduct: () => { },
  updateProduct: () => { },
  incrementRentalCount: () => { },
});

export const useProduct = () => useContext(ProductContext);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [products, setProducts] = useState<Product[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const response = await productAPI.getAll();
        if (!cancelled) {
          setProducts(Array.isArray(response) ? response as Product[] : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load products.", error);
        }
      }
    };

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const addProduct = (newProduct: Product) => {
    // Add new product to the beginning of the list
    setProducts((prev) => [newProduct, ...prev]);
  };

  const removeProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const updateProduct = (productId: string, patch: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...patch } : p)),
    );
  };

  const incrementRentalCount = (productId: string) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id === productId) {
          const newCount = (product.rentalCount || 0) + 1;
          let isForSale = product.isForSale;

          // Fixed rule: Max 5 rentals. Then it MUST be sell only.
          const RENTAL_THRESHOLD = 5;
          if (newCount >= RENTAL_THRESHOLD) {
            isForSale = true; // Force enable sale
          }

          // Legacy: if autoSellAfterRentals was set lower than 5
          if (
            product.autoSellAfterRentals &&
            newCount >= product.autoSellAfterRentals
          ) {
            isForSale = true;
          }

          return {
            ...product,
            rentalCount: newCount,
            isForSale,
          };
        }
        return product;
      }),
    );
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        addProduct,
        removeProduct,
        updateProduct,
        incrementRentalCount,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};
