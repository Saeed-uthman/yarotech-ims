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

  /**
   * Resolve a manufacturer name to its database record, creating it when an
   * administrator explicitly enters a new name in a product/variant form.
   */
  public async getOrCreateCompany(name: string): Promise<CompanyEntity> {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (!cleanName) throw new Error('Select or enter a company/manufacturer.');

    const companiesResponse = await this.getCompanies();
    if (!companiesResponse.success) {
      throw new Error(companiesResponse.message || 'Unable to load companies.');
    }

    const existing = (companiesResponse.data || []).find(
      (company) => company.name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase()
    );
    if (existing) {
      if (existing.status !== 'Active') {
        throw new Error(`${existing.name} exists but is inactive. Reactivate it before adding this variant.`);
      }
      return existing;
    }

    try {
      const res = await api.post<any>('/companies/', {
        name: cleanName,
        code: '',
        country: 'Nigeria',
      });
      const camel = toCamelCaseKeys(res.data);
      const company: CompanyEntity = {
        ...camel,
        id: String(camel.id),
        status: camel.isActive ? 'Active' : 'Inactive',
      };
      apiCache.invalidateByPrefix('companies:');
      return company;
    } catch (err) {
      // A concurrent request may have created the same unique company name.
      if (err instanceof ApiError && err.status === 400) {
        apiCache.invalidateByPrefix('companies:');
        const refreshed = await this.getCompanies();
        const concurrentMatch = (refreshed.data || []).find(
          (company) => company.name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase()
        );
        if (concurrentMatch) return concurrentMatch;
      }
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to create the company/manufacturer.');
    }
  }
}

export const companyService = new CompanyService();
