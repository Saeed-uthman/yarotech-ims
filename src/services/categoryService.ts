import { CategoryEntity, ApiResponse } from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class CategoryService {
  public async getCategories(): Promise<ApiResponse<CategoryEntity[]>> {
    const key = apiCache.generateKey('categories:list');
    return apiCache.deduplicate(key, () => mockRepository.getCategories());
  }
}

export const categoryService = new CategoryService();
