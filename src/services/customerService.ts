import {
  Customer,
  CustomerFilterParams,
  CustomerSummaryKPIs,
  CustomerSale,
  CustomerDebtPayment,
  CreateCustomerInput,
  UpdateCustomerInput,
  DebtPaymentInput,
  UserRole,
  ApiResponse,
} from '../types';
import { api, ApiError, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

// ==========================================
// Backend → Frontend Transform Helpers
// ==========================================

function mapBackendCustomer(raw: any): Customer {
  const c = toCamelCaseKeys(raw);
  return {
    id: String(c.id),
    name: c.name || '',
    phone: c.phone || '',
    address: c.address || '',
    email: c.email || '',
    notes: c.notes || '',
    status: c.status === 'Active' ? 'Active' : 'Inactive',
    totalPurchases: Number(c.totalPurchases || 0),
    totalDebt: 0,
    amountPaid: Number(c.amountPaid || 0),
    outstandingDebt: Number(c.outstandingDebt || 0),
    salesCount: Number(c.salesCount || 0),
    lastPurchaseDate: undefined,
    createdAt: c.createdAt || '',
    updatedAt: c.updatedAt || '',
  };
}

function mapBackendCustomerList(raw: any): Customer {
  const c = toCamelCaseKeys(raw);
  const lastPurchase = c.lastPurchaseDate || '';
  const lastPurchaseDateObj = lastPurchase ? new Date(lastPurchase) : undefined;
  const lastPurchaseDateStr = lastPurchaseDateObj
    ? lastPurchaseDateObj.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined;
  return {
    id: String(c.id),
    name: c.name || '',
    phone: c.phone || '',
    address: '',
    email: c.email || '',
    notes: '',
    status: c.status === 'Active' ? 'Active' : 'Inactive',
    totalPurchases: Number(c.totalPurchases || 0),
    totalDebt: 0,
    amountPaid: Number(c.amountPaid || 0),
    outstandingDebt: Number(c.outstandingDebt || 0),
    salesCount: Number(c.salesCount || 0),
    lastPurchaseDate: lastPurchaseDateStr,
    createdAt: c.createdAt || '',
    updatedAt: c.updatedAt || '',
  };
}

function mapBackendDebtPayment(raw: any): CustomerDebtPayment {
  const p = toCamelCaseKeys(raw);
  const createdAt = p.createdAt || '';
  const dateObj = createdAt ? new Date(createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: String(p.id),
    receiptNumber: p.receiptNumber || '',
    customerId: String(p.customer || ''),
    customerName: p.customerName || '',
    customerPhone: p.customerPhone || '',
    amount: Number(p.amount || 0),
    paymentDate: dateStr,
    rawDate: createdAt,
    paymentMethod: p.paymentMethod || 'CASH',
    balanceBefore: Number(p.balanceBefore || 0),
    balanceAfter: Number(p.balanceAfter || 0),
    referenceNotes: p.referenceNotes || '',
    recordedBy: p.recordedByName || '',
    createdAt: createdAt,
  };
}

function mapBackendSale(raw: any): CustomerSale {
  const s = toCamelCaseKeys(raw);
  const createdAt = s.createdAt || '';
  const dateObj = createdAt ? new Date(createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: String(s.id),
    invoiceNumber: s.invoiceNumber || `Sale #${s.id}`,
    date: dateStr,
    rawDate: createdAt,
    customerId: null,
    customerName: '',
    items: [],
    itemCount: 0,
    subtotal: Number(s.subtotal || 0),
    discount: Number(s.discount || 0),
    total: Number(s.totalAmount || 0),
    amountPaid: Number(s.amountPaid || 0),
    outstandingAmount: Number(s.outstandingAmount || 0),
    paymentStatus: s.paymentStatus || 'PAID',
    paymentMethod: s.paymentMethod || 'CASH',
    servedBy: '',
    status: s.status || 'COMPLETED',
  };
}

// ==========================================
// Client-Side Pagination
// ==========================================

function paginate<T>(items: T[], page: number, limit: number): { data: T[]; meta: { currentPage: number; perPage: number; total: number; lastPage: number } } {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const start = (safePage - 1) * limit;
  return { data: items.slice(start, start + limit), meta: { currentPage: safePage, perPage: limit, total, lastPage } };
}

// ==========================================
// Customer Service
// ==========================================

export class CustomerService {
  /**
   * Fetch customers from backend
   */
  public async getCustomers(
    params?: Partial<CustomerFilterParams>,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Customer[]>> {
    const key = apiCache.generateKey('customers:list', {
      search: params?.search || '',
      status: params?.status || 'all',
      debtStatus: params?.debtStatus || 'all',
      page: params?.page || 1,
      limit: params?.limit || 10,
    });

    return apiCache.deduplicate(key, async () => {
      try {
        const queryParams: Record<string, any> = {};
        if (params?.search) queryParams.search = params.search;
        if (params?.status && params.status !== 'all') {
          queryParams.status = params.status === 'active' ? 'Active' : 'Inactive';
        }
        if (params?.debtStatus && params.debtStatus !== 'all') {
          if (params.debtStatus === 'has_debt') queryParams.debt_status = 'with_debt';
        }

        const res = await api.get<any>('/customers/', queryParams);
        let customers: Customer[] = (res.data || []).map(mapBackendCustomerList);

        // If debt_status filter is active, the backend already filtered
        // For has_debt, the backend returns CustomerDetailSerializer with outstanding_debt
        if (params?.debtStatus === 'has_debt') {
          customers = (res.data || []).map(mapBackendCustomer);
        }

        // Client-side sorting
        const sortBy = params?.sortBy || 'name';
        const sortOrder = params?.sortOrder || 'asc';
        customers.sort((a, b) => {
          let cmp = 0;
          switch (sortBy) {
            case 'name': cmp = a.name.localeCompare(b.name); break;
            case 'debt': cmp = a.outstandingDebt - b.outstandingDebt; break;
            case 'purchases': cmp = a.totalPurchases - b.totalPurchases; break;
            case 'date': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
            default: cmp = a.name.localeCompare(b.name);
          }
          return sortOrder === 'asc' ? cmp : -cmp;
        });

        const { data, meta } = paginate(customers, params?.page || 1, params?.limit || 10);
        const response: ApiResponse<Customer[]> = { success: true, data, meta };
        apiCache.set(key, response, 30 * 1000);
        return response;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch customers.');
      }
    });
  }

  /**
   * Get single customer by ID from backend
   */
  public async getCustomerById(
    id: string
  ): Promise<ApiResponse<Customer | null>> {
    const key = apiCache.generateKey(`customer:${id}`);
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>(`/customers/${id}/`);
        const customer = mapBackendCustomer(res.data);
        return { success: true, data: customer };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return { success: false, data: null, message: 'Customer not found.' };
      }
    });
  }

  /**
   * Check if phone number is duplicate (client-side check)
   */
  public async checkDuplicatePhone(phone: string, excludeId?: string): Promise<boolean> {
    try {
      const res = await this.getCustomers({ search: phone, limit: 100 });
      const customers = res.data || [];
      return customers.some((c) => c.phone === phone && c.id !== excludeId);
    } catch {
      return false;
    }
  }

  /**
   * Create new customer via backend
   */
  public async createCustomer(
    input: CreateCustomerInput
  ): Promise<ApiResponse<Customer>> {
    try {
      const payload = {
        name: input.name,
        phone: input.phone,
        email: input.email || '',
        address: input.address || '',
        notes: input.notes || '',
      };

      const res = await api.post<any>('/customers/', payload);
      const customer = mapBackendCustomer(res.data);
      apiCache.invalidateByPrefix('customers:');
      return { success: true, data: customer, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to create customer.');
    }
  }

  /**
   * Update customer via backend
   */
  public async updateCustomer(
    id: string,
    input: UpdateCustomerInput
  ): Promise<ApiResponse<Customer>> {
    try {
      const payload: any = {};
      if (input.name !== undefined) payload.name = input.name;
      if (input.phone !== undefined) payload.phone = input.phone;
      if (input.email !== undefined) payload.email = input.email;
      if (input.address !== undefined) payload.address = input.address;
      if (input.notes !== undefined) payload.notes = input.notes;

      const res = await api.patch<any>(`/customers/${id}/`, payload);
      const customer = mapBackendCustomer(res.data);
      apiCache.invalidateByPrefix('customers:');
      apiCache.invalidateByPrefix(`customer:${id}`);
      return { success: true, data: customer, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to update customer.');
    }
  }

  /**
   * Toggle customer status via backend
   */
  public async deactivateCustomer(
    id: string
  ): Promise<ApiResponse<Customer>> {
    try {
      const res = await api.post<any>(`/customers/${id}/toggle-status/`);
      const customer = mapBackendCustomer(res.data);
      apiCache.invalidateByPrefix('customers:');
      apiCache.invalidateByPrefix(`customer:${id}`);
      return { success: true, data: customer, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to toggle customer status.');
    }
  }

  /**
   * Activate customer (uses same toggle endpoint)
   */
  public async activateCustomer(
    id: string
  ): Promise<ApiResponse<Customer>> {
    return this.deactivateCustomer(id);
  }

  /**
   * Get customer sales history from backend
   */
  public async getCustomerSales(
    customerId: string,
    _page = 1,
    _limit = 10
  ): Promise<ApiResponse<CustomerSale[]>> {
    const key = apiCache.generateKey(`customer:sales:${customerId}`);
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>(`/customers/${customerId}/sales/`);
        const sales = (res.data || []).map(mapBackendSale);
        return { success: true, data: sales };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return { success: false, data: [], message: 'Failed to fetch sales history.' };
      }
    });
  }

  /**
   * Get customer debt payments from backend
   */
  public async getCustomerDebtPayments(
    customerId: string
  ): Promise<ApiResponse<CustomerDebtPayment[]>> {
    const key = apiCache.generateKey(`customer:debt_payments:${customerId}`);
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>(`/customers/${customerId}/payments/`);
        const payments = (res.data || []).map(mapBackendDebtPayment);
        return { success: true, data: payments };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return { success: false, data: [], message: 'Failed to fetch debt payments.' };
      }
    });
  }

  /**
   * Record debt payment via backend
   */
  public async recordDebtPayment(
    input: DebtPaymentInput,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<{ customer: Customer; payment: CustomerDebtPayment }>> {
    try {
      const payload = {
        customer_id: Number(input.customerId),
        amount: input.amount,
        payment_method: input.paymentMethod,
        reference_notes: input.referenceNotes || '',
      };

      const res = await api.post<any>('/payments/debt-payment/', payload);
      const payment = mapBackendDebtPayment(res.data);

      // Fetch updated customer
      const custRes = await this.getCustomerById(input.customerId);
      const customer = custRes.data!;

      apiCache.invalidateByPrefix('customers:');
      apiCache.invalidateByPrefix(`customer:${input.customerId}`);

      return {
        success: true,
        data: { customer, payment },
        message: res.message,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to record debt payment.');
    }
  }

  /**
   * Get customer KPIs from backend
   */
  public async getCustomerKPIs(): Promise<ApiResponse<CustomerSummaryKPIs>> {
    const key = apiCache.generateKey('customers:kpis');
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>('/customers/summary-kpis/');
        const d = toCamelCaseKeys(res.data || res);
        const kpis: CustomerSummaryKPIs = {
          totalCustomers: Number(d.totalCustomers || 0),
          activeCustomers: Number(d.activeCustomers || 0),
          inactiveCustomers: Number(d.inactiveCustomers || 0),
          customersWithDebt: Number(d.totalDebtors || 0),
          totalOutstandingDebt: Number(d.totalOutstandingAmount || 0),
          totalCustomerPurchases: 0,
        };
        apiCache.set(key, { success: true, data: kpis }, 30 * 1000);
        return { success: true, data: kpis };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch customer KPIs.');
      }
    });
  }
}

export const customerService = new CustomerService();
