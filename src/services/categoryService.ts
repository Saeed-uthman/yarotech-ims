import { CategoryEntity, ApiResponse } from '../types';
import { api, ApiError, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

export class CategoryService {
  public async getCategories(): Promise<ApiResponse<CategoryEntity[]>> {
    const key = apiCache.generateKey('categories:list');
    const cached = apiCache.get<ApiResponse<CategoryEntity[]>>(key);
    if (cached.data && !cached.isStale) return cached.data;

    try {
      const res = await api.get<any>('/categories/');
      const data = (Array.isArray(res.data) ? res.data : []).map((item: any) => {
        const camel = toCamelCaseKeys(item);
        return {
          ...camel,
          status: camel.isActive ? 'Active' : 'Inactive',
        };
      });

      const response: ApiResponse<CategoryEntity[]> = {
        success: true,
        data: data as CategoryEntity[],
        message: res.message,
      };
      apiCache.set(key, response, 60 * 1000);
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, message: err.message, error: err.message };
      }
      return { success: false, message: 'Failed to load categories.' };
    }
  }
}

export const categoryService = new CategoryService();
