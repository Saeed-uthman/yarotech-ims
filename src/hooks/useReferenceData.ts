import { useState, useEffect } from 'react';
import { ProductCategory, Company } from '../types';
import { categoryService, companyService } from '../services';

export function useReferenceData() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRefs() {
      try {
        const [catsRes, compsRes] = await Promise.all([
          categoryService.getCategories(),
          companyService.getCompanies(),
        ]);
        if (isMounted) {
          setCategories(catsRes.data);
          setCompanies(compsRes.data);
        }
      } catch (err) {
        console.error('Failed to load reference data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRefs();

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, companies, isLoading };
}
