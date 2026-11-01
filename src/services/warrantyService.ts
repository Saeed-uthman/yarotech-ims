import { ApiResponse, WarrantyVerificationRecord } from '../types';
import { api, ApiError } from './apiClient';

export class WarrantyService {
  public async verifyWarranty(query: string): Promise<ApiResponse<WarrantyVerificationRecord[]>> {
    try {
      const trimmed = query.trim();
      if (!trimmed) {
        return { success: true, data: [] };
      }
      const res = await api.get<any>('/sales/verify-warranty/', { query: trimmed });
      const results = res.data?.results || [];
      return {
        success: true,
        data: results,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to verify warranty.');
    }
  }
}

export const warrantyService = new WarrantyService();

