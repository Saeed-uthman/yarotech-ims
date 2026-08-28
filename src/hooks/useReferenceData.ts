import { useState, useEffect, useCallback } from 'react';
import { ProductCategory, Company } from '../types';
import { categoryService, companyService } from '../services';

export function useReferenceData() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadRefs = useCallback(async () => {
    setIsLoading(true);
    try {
      const [catsRes, compsRes] = await Promise.all([
        categoryService.getCategories(),
        companyService.getCompanies(),
      ]);
      setCategories(catsRes.data || []);
      setCompanies(compsRes.data || []);
    } catch (err) {
      console.error('Failed to load reference data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  return { categories, companies, isLoading, refetch: loadRefs };
}
