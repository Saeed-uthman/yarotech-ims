import { useState, useEffect, useCallback } from 'react';
import { Product, UserRole } from '../types';
import { productService, apiCache } from '../services';

export function useProductDetails(productId: string | null, role: UserRole = 'admin') {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(
    async (forceFresh: boolean = false) => {
      if (!productId) {
        setProduct(null);
        return;
      }

      const cacheKey = apiCache.generateKey(`product:${productId}`, { role });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached.data) {
          setProduct(cached.data.data);
          if (!cached.isStale) {
            setIsLoading(false);
            return;
          }
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await productService.getProductById(productId, role);
        setProduct(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load product details');
      } finally {
        setIsLoading(false);
      }
    },
    [productId, role]
  );

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    product,
    isLoading,
    error,
    refetch: fetchDetails,
    setProduct,
  };
}
