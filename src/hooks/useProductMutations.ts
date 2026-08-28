import { useState } from 'react';
import {
  Product,
  ProductCreateInput,
  ProductUpdateInput,
  ProductVariantInput,
  CompanyVariant,
  UserRole,
} from '../types';
import { productService, productVariantService } from '../services';

interface MutationOptions {
  onOptimistic?: (optimisticStatus: 'Active' | 'Inactive') => void;
  onRollback?: (previousStatus: 'Active' | 'Inactive') => void;
  onSuccess?: (product: Product) => void;
  onError?: (error: Error) => void;
}

export function useProductMutations() {
  const [isMutating, setIsMutating] = useState<boolean>(false);

  /**
   * Create Product (Form submission -> Service -> DB -> Invalidate Cache)
   */
  const createProduct = async (
    input: ProductCreateInput,
    role: UserRole = 'admin'
  ): Promise<Product> => {
    setIsMutating(true);
    try {
      const res = await productService.createProduct(input, role);
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  /**
   * Update Product
   */
  const updateProduct = async (
    id: string,
    updates: ProductUpdateInput,
    role: UserRole = 'admin'
  ): Promise<Product> => {
    setIsMutating(true);
    try {
      const res = await productService.updateProduct(id, updates, role);
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  /**
   * Deactivate Product with Optimistic Update and Controlled Rollback
   */
  const deactivateProduct = async (
    product: Product,
    role: UserRole = 'admin',
    options?: MutationOptions
  ): Promise<Product> => {
    setIsMutating(true);
    // 1. Optimistic UI update
    options?.onOptimistic?.('Inactive');

    try {
      const res = await productService.deactivateProduct(product.id, role);
      options?.onSuccess?.(res.data);
      return res.data;
    } catch (err: any) {
      // 2. Rollback to previous state on failure
      options?.onRollback?.(product.status);
      options?.onError?.(err);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  /**
   * Activate Product with Optimistic Update and Controlled Rollback
   */
  const activateProduct = async (
    product: Product,
    role: UserRole = 'admin',
    options?: MutationOptions
  ): Promise<Product> => {
    setIsMutating(true);
    // 1. Optimistic UI update
    options?.onOptimistic?.('Active');

    try {
      const res = await productService.activateProduct(product.id, role);
      options?.onSuccess?.(res.data);
      return res.data;
    } catch (err: any) {
      // 2. Rollback to previous state on failure
      options?.onRollback?.(product.status);
      options?.onError?.(err);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  /**
   * Add Variant (Authoritative financial operation - no optimistic guessing)
   */
  const addVariant = async (
    productId: string,
    input: ProductVariantInput,
    role: UserRole = 'admin'
  ): Promise<Product> => {
    setIsMutating(true);
    try {
      const res = await productVariantService.createVariant(productId, input, role);
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  /**
   * Update Variant (Authoritative financial operation)
   */
  const updateVariant = async (
    productId: string,
    variantId: string,
    updates: Partial<CompanyVariant>,
    role: UserRole = 'admin'
  ): Promise<Product> => {
    setIsMutating(true);
    try {
      const res = await productVariantService.updateVariant(productId, variantId, updates, role);
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  /**
   * Delete Variant
   */
  const deleteVariant = async (
    productId: string,
    variantId: string,
    role: UserRole = 'admin'
  ): Promise<Product> => {
    setIsMutating(true);
    try {
      const res = await productVariantService.deleteVariant(productId, variantId, role);
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    isMutating,
    createProduct,
    updateProduct,
    deactivateProduct,
    activateProduct,
    addVariant,
    updateVariant,
    deleteVariant,
  };
}
