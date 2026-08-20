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
  ApiResponse 
} from '../types';
import { mockRepository } from './mockRepository';

/**
 * Authentication & User Management Service
 * Provides standard API endpoints for user authentication, registration,
 * and administrator approval workflows. Ready for Django REST Framework backend.
 */
class AuthService {
  /**
   * Submit user login credentials
   * Enforces account status rules: PENDING, REJECTED, SUSPENDED accounts are blocked.
   */
  public async login(input: LoginInput): Promise<AuthResponse> {
    return mockRepository.login(input);
  }

  /**
   * Submit new user registration
   * Defaults to PENDING status and CASHIER role (Registration != Access).
   */
  public async register(input: RegisterInput): Promise<AuthResponse> {
    return mockRepository.register(input);
  }

  /**
   * Fetch all registered users with optional status, role, and search filters
   * (Admin Only)
   */
  public async getUsers(params?: UserFilterParams): Promise<ApiResponse<UserAccount[]>> {
    return mockRepository.getUsers(params);
  }

  /**
   * Fetch single user details by ID
   */
  public async getUserById(userId: string): Promise<ApiResponse<UserAccount>> {
    return mockRepository.getUserById(userId);
  }

  /**
   * Administrator Action: Approve pending user registration
   */
  public async approveUser(input: ApproveUserInput): Promise<ApiResponse<UserAccount>> {
    return mockRepository.approveUser(input);
  }

  /**
   * Administrator Action: Reject pending user registration with optional reason
   */
  public async rejectUser(input: RejectUserInput): Promise<ApiResponse<UserAccount>> {
    return mockRepository.rejectUser(input);
  }

  /**
   * Administrator Action: Suspend active user account
   */
  public async suspendUser(input: SuspendUserInput): Promise<ApiResponse<UserAccount>> {
    return mockRepository.suspendUser(input);
  }

  /**
   * Administrator Action: Reactivate suspended user account
   */
  public async reactivateUser(input: ReactivateUserInput): Promise<ApiResponse<UserAccount>> {
    return mockRepository.reactivateUser(input);
  }

  /**
   * Get total count of pending registration requests awaiting admin approval
   */
  public async getPendingUserCount(): Promise<number> {
    return mockRepository.getPendingUserCount();
  }

  /**
   * Simulate Password Reset Request (Forgot Password)
   */
  public async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    await new Promise((res) => setTimeout(res, 400));
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) {
      return { success: false, message: 'Please enter your registered email address.' };
    }
    return {
      success: true,
      message: `If an account with email ${normalized} exists, password reset instructions have been forwarded to the system administrator.`,
    };
  }
}

export const authService = new AuthService();
