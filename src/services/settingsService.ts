import {
  SystemSettings,
  UpdateSettingsInput,
  ChangePasswordInput,
  UserRole,
  ApiResponse,
} from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class SettingsService {
  private cacheKey = 'settings:current';

  /**
   * Fetch current system preferences & configurations
   * Cached for fast subsequent views; supports deduplication
   */
  public async getSettings(forceRefresh = false): Promise<ApiResponse<SystemSettings>> {
    if (forceRefresh) {
      apiCache.invalidate('settings:');
    }

    return apiCache.deduplicate(this.cacheKey, async () => {
      const response = await mockRepository.getSettings();
      if (response.success && response.data) {
        apiCache.set(this.cacheKey, response, 60 * 1000); // 60s TTL
      }
      return response;
    });
  }

  /**
   * Update system preferences (strictly validated)
   */
  public async updateSettings(
    input: UpdateSettingsInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<SystemSettings>> {
    const response = await mockRepository.updateSettings(input, role);
    if (response.success) {
      apiCache.invalidate('settings:');
      apiCache.set(this.cacheKey, response, 60 * 1000);
    }
    return response;
  }

  /**
   * Reset all settings to system defaults (Admin only)
   */
  public async resetSettings(role: UserRole = 'admin'): Promise<ApiResponse<SystemSettings>> {
    const response = await mockRepository.resetSettings(role);
    if (response.success) {
      apiCache.invalidate('settings:');
      apiCache.set(this.cacheKey, response, 60 * 1000);
    }
    return response;
  }

  /**
   * Change user password
   */
  public async changePassword(
    input: ChangePasswordInput,
    role: UserRole
  ): Promise<ApiResponse<boolean>> {
    return mockRepository.changePassword(input, role);
  }
}

export const settingsService = new SettingsService();
