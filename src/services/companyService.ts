import { CompanyEntity, ApiResponse } from '../types';
import { api, ApiError, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

export class CompanyService {
  public async getCompanies(): Promise<ApiResponse<CompanyEntity[]>> {
    const key = apiCache.generateKey('companies:list');
    const cached = apiCache.get<ApiResponse<CompanyEntity[]>>(key);
    if (cached.data && !cached.isStale) return cached.data;

    try {
      const res = await api.get<any>('/companies/');
      const data = (Array.isArray(res.data) ? res.data : []).map((item: any) => {
        const camel = toCamelCaseKeys(item);
        return {
          ...camel,
          status: camel.isActive ? 'Active' : 'Inactive',
        };
      });

      const response: ApiResponse<CompanyEntity[]> = {
        success: true,
        data: data as CompanyEntity[],
        message: res.message,
      };
      apiCache.set(key, response, 60 * 1000);
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, message: err.message, error: err.message };
      }
      return { success: false, message: 'Failed to load companies.' };
    }
  }
}

export const companyService = new CompanyService();
