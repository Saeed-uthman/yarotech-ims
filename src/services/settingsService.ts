import {
  SystemSettings,
  UpdateSettingsInput,
  ChangePasswordInput,
  UserRole,
  ApiResponse,
} from '../types';
import {
  api,
  ApiError,
  resolveApiAssetUrl,
  toCamelCaseKeys,
  toSnakeCaseKeys,
} from './apiClient';
import { apiCache } from './apiCache';


function dataUrlToBlob(dataUrl: string): { blob: Blob; extension: string } {
  const [metadata, encoded] = dataUrl.split(',', 2);
  const mimeType = metadata.match(/^data:([^;]+);base64$/)?.[1] || 'image/png';
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return {
    blob: new Blob([bytes], { type: mimeType }),
    extension: mimeType.split('/')[1]?.replace('svg+xml', 'svg') || 'png',
  };
}


export class SettingsService {
  private cacheKey = 'settings:current';

  private mapSettings(raw: any): SystemSettings {
    const data = toCamelCaseKeys(raw || {});
    return {
      id: String(data.id || 1),
      pharmacyName: data.pharmacyName || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      logo: resolveApiAssetUrl(data.logo),
      businessDescription: data.businessDescription || '',
      currency: data.currency || 'NGN',
      currencySymbol: data.currencySymbol || '₦',
      showDecimals: data.showDecimals ?? true,
      vatEnabled: data.vatEnabled ?? false,
      vatRate: Number(data.vatRate || 0),
      allowWalkingSales: data.allowWalkingSales ?? true,
      allowCreditSales: data.allowCreditSales ?? true,
      requireCustomerForCredit: data.requireCustomerForCredit ?? true,
      requireSaleConfirmation: data.requireSaleConfirmation ?? false,
      lowStockThreshold: Number(data.lowStockThreshold || 0),
      allowNegativeStock: data.allowNegativeStock ?? false,
      requireAdminStockAdjustment: data.requireAdminStockAdjustment ?? true,
      receiptLogo: data.receiptLogo ?? true,
      receiptPhone: data.receiptPhone ?? true,
      receiptAddress: data.receiptAddress ?? true,
      receiptCashier: data.receiptCashier ?? true,
      receiptCustomer: data.receiptCustomer ?? true,
      receiptDatetime: data.receiptDatetime ?? true,
      receiptNumber: data.receiptNumber ?? true,
      receiptFooter: data.receiptFooter || '',
      lowStockNotifications: data.lowStockNotifications ?? true,
      outOfStockNotifications: data.outOfStockNotifications ?? true,
      newDebtNotifications: data.newDebtNotifications ?? true,
      largeTransactionAlert: data.largeTransactionAlert ?? false,
      largeTransactionThreshold: Number(data.largeTransactionThreshold || 0),
      theme: data.theme || 'system',
      language: data.language || 'English',
      sessionTimeout: data.sessionTimeout || '30m',
      updatedAt: data.updatedAt || '',
      updatedBy: data.updatedByName || '',
    };
  }

  public async getSettings(forceRefresh = false): Promise<ApiResponse<SystemSettings>> {
    if (forceRefresh) apiCache.invalidate(this.cacheKey);

    return apiCache.deduplicate(this.cacheKey, async () => {
      try {
        const response = await api.get<any>('/settings/');
        const result: ApiResponse<SystemSettings> = {
          success: true,
          data: this.mapSettings(response.data),
          message: response.message,
        };
        apiCache.set(this.cacheKey, result, 60 * 1000);
        return result;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new Error('Failed to load system settings.');
      }
    });
  }

  public async updateSettings(
    input: UpdateSettingsInput,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<SystemSettings>> {
    try {
      const { logo, ...settingsInput } = input;
      let response: any;

      if (logo?.startsWith('data:')) {
        const formData = new FormData();
        const snakeCaseInput = toSnakeCaseKeys(settingsInput);
        Object.entries(snakeCaseInput).forEach(([key, value]) => {
          if (value !== undefined && value !== null) formData.append(key, String(value));
        });
        const { blob, extension } = dataUrlToBlob(logo);
        formData.append('logo', blob, `pharmacy-logo.${extension}`);
        response = await api.patchForm<any>('/settings/', formData);
      } else {
        response = await api.patch<any>('/settings/', {
          ...settingsInput,
          ...(logo === '' ? { clearLogo: true } : {}),
        });
      }

      const result: ApiResponse<SystemSettings> = {
        success: true,
        data: this.mapSettings(response.data),
        message: response.message,
      };
      apiCache.invalidateByPrefix('settings:');
      apiCache.invalidateByPrefix('dashboard:');
      apiCache.set(this.cacheKey, result, 60 * 1000);
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to update system settings.');
    }
  }

  public async resetSettings(_role: UserRole = 'admin'): Promise<ApiResponse<SystemSettings>> {
    try {
      const response = await api.post<any>('/settings/reset/');
      const result: ApiResponse<SystemSettings> = {
        success: true,
        data: this.mapSettings(response.data),
        message: response.message,
      };
      apiCache.invalidateByPrefix('settings:');
      apiCache.invalidateByPrefix('dashboard:');
      apiCache.set(this.cacheKey, result, 60 * 1000);
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to reset system settings.');
    }
  }

  public async changePassword(
    input: ChangePasswordInput,
    _role: UserRole
  ): Promise<ApiResponse<boolean>> {
    if (input.newPassword !== input.confirmPassword) {
      return { success: false, data: false, message: 'New password confirmation does not match.' };
    }
    try {
      const response = await api.post<any>('/auth/change-password/', {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });
      return { success: true, data: true, message: response.message };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to change password.');
    }
  }
}

export const settingsService = new SettingsService();
