import {
  UserAccount,
  RegisterInput,
  LoginInput,
  ApproveUserInput,
  RejectUserInput,
  SuspendUserInput,
  ReactivateUserInput,
  UserFilterParams,
  AuthResponse,
  ApiResponse,
} from '../types';
import { api, ApiError, toCamelCaseKeys, setTokens, clearTokens } from './apiClient';

/**
 * Authentication & User Management Service
 * Calls Django REST Framework backend via apiClient.
 */
class AuthService {
  /**
   * Submit user login credentials.
   * Backend returns { success, data: { refresh, access, user }, message }
   */
  public async login(input: LoginInput): Promise<AuthResponse> {
    try {
      const res = await api.post<any>('/auth/login/', {
        email: input.email,
        password: input.password,
      });

      // Backend wraps in { success, data: { refresh, access, user }, message }
      const payload = res.data || res;
      const userData = toCamelCaseKeys(payload.user || payload);
      const accessToken = payload.access || payload.token;
      const refreshToken = payload.refresh;

      setTokens(accessToken, refreshToken);

      return {
        success: true,
        user: userData as UserAccount,
        token: accessToken,
        message: res.message || 'Login successful.',
      };
    } catch (err) {
      if (err instanceof ApiError) {
        const errorCode = this.mapBackendError(err);
        return {
          success: false,
          message: err.message,
          errorCode,
        };
      }
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }
  }

  /**
   * Submit new user registration.
   * Backend returns { success, data: UserSerializer, message }
   */
  public async register(input: RegisterInput): Promise<AuthResponse> {
    try {
      const res = await api.post<any>('/auth/register/', {
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        password: input.password,
      });

      const userData = toCamelCaseKeys(res.data || res);

      return {
        success: true,
        user: userData as UserAccount,
        message: res.message || 'Registration submitted successfully.',
      };
    } catch (err) {
      if (err instanceof ApiError) {
        const errorCode = this.mapBackendError(err);
        return {
          success: false,
          message: err.message,
          errorCode,
        };
      }
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Fetch the currently authenticated user's profile (uses /auth/me/).
   * Separate from getUserById because "me" is a dedicated backend route.
   */
  public async getCurrentUser(): Promise<ApiResponse<UserAccount>> {
    try {
      const res = await api.get<any>('/auth/me/');
      const userData = toCamelCaseKeys(res.data || res);
      return { success: true, data: userData as UserAccount, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, message: err.message, error: err.message };
      }
      return { success: false, message: 'Failed to load current user.' };
    }
  }

  /**
   * Fetch all registered users with optional filters (Admin Only).
   */
  public async getUsers(params?: UserFilterParams): Promise<ApiResponse<UserAccount[]>> {
    try {
      const queryParams: Record<string, any> = {};
      if (params?.search) queryParams.search = params.search;
      if (params?.status && params.status !== 'all') queryParams.status = params.status;
      if (params?.role && params.role !== 'all') queryParams.role = params.role;

      const res = await api.get<any>('/users/', queryParams);
      const data = Array.isArray(res.data) ? res.data.map(toCamelCaseKeys) : [];

      return { success: true, data: data as UserAccount[], message: res.message };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, message: err.message, error: err.message };
      }
      return { success: false, message: 'Failed to load users.' };
    }
  }

  /**
   * Fetch single user details by ID.
   */
  public async getUserById(userId: string): Promise<ApiResponse<UserAccount>> {
    try {
      const res = await api.get<any>(`/users/${userId}/`);
      const userData = toCamelCaseKeys(res.data || res);

      return { success: true, data: userData as UserAccount, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, message: err.message, error: err.message };
      }
      return { success: false, message: 'Failed to load user.' };
    }
  }

  /**
   * Administrator Action: Approve pending user registration.
   */
  public async approveUser(input: ApproveUserInput): Promise<ApiResponse<UserAccount>> {
    try {
      const res = await api.post<any>(`/users/${input.userId}/approve/`, {
        assigned_role: input.assignedRole || 'cashier',
      });
      const userData = toCamelCaseKeys(res.data || res);

      return { success: true, data: userData as UserAccount, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, message: err.message, error: err.message };
      }
      return { success: false, message: 'Failed to approve user.' };
    }
  }

  /**
   * Administrator Action: Reject pending user registration.
   */
  public async rejectUser(input: RejectUserInput): Promise<ApiResponse<UserAccount>> {
    try {
      const res = await api.post<any>(`/users/${input.userId}/reject/`, {
        reason: input.reason || 'No reason provided',
      });
      const userData = toCamelCaseKeys(res.data || res);

      return { success: true, data: userData as UserAccount, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, message: err.message, error: err.message };
      }
      return { success: false, message: 'Failed to reject user.' };
    }
  }

  /**
   * Administrator Action: Suspend active user account.
   */
  public async suspendUser(input: SuspendUserInput): Promise<ApiResponse<UserAccount>> {
    try {
      const res = await api.post<any>(`/users/${input.userId}/suspend/`);
      const userData = toCamelCaseKeys(res.data || res);

      return { success: true, data: userData as UserAccount, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, message: err.message, error: err.message };
      }
      return { success: false, message: 'Failed to suspend user.' };
    }
  }

  /**
   * Administrator Action: Reactivate suspended user account.
   */
  public async reactivateUser(input: ReactivateUserInput): Promise<ApiResponse<UserAccount>> {
    try {
      const res = await api.post<any>(`/users/${input.userId}/reactivate/`);
      const userData = toCamelCaseKeys(res.data || res);

      return { success: true, data: userData as UserAccount, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, message: err.message, error: err.message };
      }
      return { success: false, message: 'Failed to reactivate user.' };
    }
  }

  /**
   * Get total count of pending registration requests.
   */
  public async getPendingUserCount(): Promise<number> {
    try {
      const res = await api.get<any>('/users/', { status: 'PENDING' });
      if (Array.isArray(res.data)) {
        return res.data.length;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Simulate Password Reset Request (not yet implemented in backend).
   */
  public async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) {
      return { success: false, message: 'Please enter your registered email address.' };
    }
    return {
      success: true,
      message: `If an account with email ${normalized} exists, password reset instructions have been forwarded to the system administrator.`,
    };
  }

  /**
   * Map backend error codes to frontend errorCode enum.
   */
  private mapBackendError(err: ApiError): AuthResponse['errorCode'] {
    const msg = err.message.toLowerCase();
    if (msg.includes('pending')) return 'PENDING';
    if (msg.includes('rejected')) return 'REJECTED';
    if (msg.includes('suspended')) return 'SUSPENDED';
    if (msg.includes('invalid') || msg.includes('password') || msg.includes('credential')) return 'INVALID_CREDENTIALS';
    if (msg.includes('already exists') || msg.includes('duplicate')) return 'EMAIL_EXISTS';
    if (msg.includes('validation')) return 'VALIDATION_ERROR';
    return 'INVALID_CREDENTIALS';
  }
}

export const authService = new AuthService();
