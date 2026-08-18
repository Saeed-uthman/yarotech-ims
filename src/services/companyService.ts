import { CompanyEntity, ApiResponse } from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class CompanyService {
  public async getCompanies(): Promise<ApiResponse<CompanyEntity[]>> {
    const key = apiCache.generateKey('companies:list');
    return apiCache.deduplicate(key, () => mockRepository.getCompanies());
  }
}

export const companyService = new CompanyService();
