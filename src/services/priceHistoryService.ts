import { 
  Product, 
  ProductPriceAdjustment, 
  CreatePriceAdjustmentInput, 
  PriceHistoryTimelinePoint, 
  ProductPriceHistorySummary,
  ApiResponse,
  UserRole
} from '../types';
import { mockRepository } from './mockRepository';

const STORAGE_KEY = 'stitch_pharmacy_db_price_history';

export class PriceHistoryService {
  private getStoredAdjustments(): ProductPriceAdjustment[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveAdjustments(adjustments: ProductPriceAdjustment[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adjustments));
    } catch (err) {
      console.error('Failed to save price history adjustments', err);
    }
  }

  /**
   * Generates realistic seeded price history adjustments for a product if none exist
   */
  private generateDefaultHistoryForProduct(product: Product): ProductPriceAdjustment[] {
    const adjustments: ProductPriceAdjustment[] = [];
    const now = new Date();

    product.variants.forEach((variant, vIdx) => {
      const currentSelling = variant.sellingPrice;
      const currentBase = variant.basePrice > 0 ? variant.basePrice : Math.round(currentSelling * 0.72);

      // Milestone 1: 9 months ago (Initial catalog entry)
      const date1 = new Date(now);
      date1.setMonth(now.getMonth() - 9);
      date1.setDate(Math.max(1, 10 + (vIdx * 3)));
      const base1 = Math.round(currentBase * 0.78);
      const sell1 = Math.round(currentSelling * 0.80);

      adjustments.push({
        id: `adj-init-${product.id}-${variant.id}`,
        productId: product.id,
        variantId: variant.id,
        companyName: variant.companyName,
        oldBasePrice: 0,
        newBasePrice: base1,
        oldSellingPrice: 0,
        newSellingPrice: sell1,
        changeType: 'INITIAL',
        reason: 'Initial pharmaceutical catalog price onboarding',
        adjustedBy: 'System Administrator (Initial Batch)',
        effectiveDate: date1.toISOString().split('T')[0],
        createdAt: date1.toISOString(),
      });

      // Milestone 2: 5 months ago (Manufacturer cost revision)
      const date2 = new Date(now);
      date2.setMonth(now.getMonth() - 5);
      date2.setDate(Math.max(1, 14 + (vIdx * 2)));
      const base2 = Math.round(currentBase * 0.88);
      const sell2 = Math.round(currentSelling * 0.89);

      adjustments.push({
        id: `adj-rev1-${product.id}-${variant.id}`,
        productId: product.id,
        variantId: variant.id,
        companyName: variant.companyName,
        oldBasePrice: base1,
        newBasePrice: base2,
        oldSellingPrice: sell1,
        newSellingPrice: sell2,
        changeType: 'SUPPLIER_REVISION',
        reason: 'Manufacturer wholesale tariff update & active ingredient cost revision',
        adjustedBy: 'Dr. Chidi Okafor (Chief Pharmacist)',
        effectiveDate: date2.toISOString().split('T')[0],
        createdAt: date2.toISOString(),
      });

      // Milestone 3: 2 months ago (Inflation & FX index adjustment)
      const date3 = new Date(now);
      date3.setMonth(now.getMonth() - 2);
      date3.setDate(Math.max(1, 5 + (vIdx * 4)));
      const base3 = Math.round(currentBase * 0.95);
      const sell3 = Math.round(currentSelling * 0.96);

      adjustments.push({
        id: `adj-rev2-${product.id}-${variant.id}`,
        productId: product.id,
        variantId: variant.id,
        companyName: variant.companyName,
        oldBasePrice: base2,
        newBasePrice: base3,
        oldSellingPrice: sell2,
        newSellingPrice: sell3,
        changeType: 'INCREASE',
        reason: 'National drug pricing guideline realignment & logistics surcharge',
        adjustedBy: 'Administrator',
        effectiveDate: date3.toISOString().split('T')[0],
        createdAt: date3.toISOString(),
      });

      // Milestone 4: 3 weeks ago (Current active price stabilization)
      const date4 = new Date(now);
      date4.setDate(now.getDate() - 21);
      
      adjustments.push({
        id: `adj-curr-${product.id}-${variant.id}`,
        productId: product.id,
        variantId: variant.id,
        companyName: variant.companyName,
        oldBasePrice: base3,
        newBasePrice: currentBase,
        oldSellingPrice: sell3,
        newSellingPrice: currentSelling,
        changeType: currentSelling >= sell3 ? 'INCREASE' : 'DECREASE',
        reason: 'Commercial margin optimization and supplier invoice re-verification',
        adjustedBy: 'Pharmacy Inventory Controller',
        effectiveDate: date4.toISOString().split('T')[0],
        createdAt: date4.toISOString(),
      });
    });

    return adjustments;
  }

  /**
   * Get all historical price adjustments for a product
   */
  public async getProductPriceHistory(
    product: Product,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<ProductPriceAdjustment[]>> {
    let allStored = this.getStoredAdjustments();
    let productAdjustments = allStored.filter((a) => a.productId === product.id);

    if (productAdjustments.length === 0) {
      // Seed default history for this product
      const seeded = this.generateDefaultHistoryForProduct(product);
      allStored = [...allStored, ...seeded];
      this.saveAdjustments(allStored);
      productAdjustments = seeded;
    }

    // Sort descending by effective date
    productAdjustments.sort(
      (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    );

    // Apply role-based redaction on base prices for cashiers
    const processed = productAdjustments.map((item) => {
      if (role === 'cashier') {
        return {
          ...item,
          oldBasePrice: 0,
          newBasePrice: 0,
        };
      }
      return item;
    });

    return {
      success: true,
      data: processed,
      message: 'Product price history retrieved successfully.',
    };
  }

  /**
   * Record a new price adjustment for a product variant
   */
  public async addPriceAdjustment(
    product: Product,
    input: CreatePriceAdjustmentInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<ProductPriceAdjustment>> {
    const variant = product.variants.find((v) => v.id === input.variantId);
    if (!variant) {
      throw new Error(`Variant ${input.variantId} not found on product ${product.id}`);
    }

    const oldSelling = variant.sellingPrice;
    const oldBase = variant.basePrice;
    const newSelling = Number(input.newSellingPrice);
    const newBase = Number(input.newBasePrice);

    let changeType: ProductPriceAdjustment['changeType'] = 'INCREASE';
    if (newSelling < oldSelling) {
      changeType = 'DECREASE';
    } else if (newSelling === oldSelling && newBase !== oldBase) {
      changeType = 'CORRECTION';
    }

    const now = new Date();
    const effectiveDate = input.effectiveDate || now.toISOString().split('T')[0];

    const newAdjustment: ProductPriceAdjustment = {
      id: `adj-custom-${Date.now()}`,
      productId: product.id,
      variantId: variant.id,
      companyName: variant.companyName,
      oldBasePrice: oldBase,
      newBasePrice: newBase,
      oldSellingPrice: oldSelling,
      newSellingPrice: newSelling,
      changeType,
      reason: input.reason.trim() || 'Manual pricing adjustment by staff',
      adjustedBy: input.adjustedBy || (role === 'admin' ? 'Administrator' : 'Authorized Staff'),
      effectiveDate,
      createdAt: now.toISOString(),
    };

    // Save adjustment
    const allStored = this.getStoredAdjustments();
    allStored.push(newAdjustment);
    this.saveAdjustments(allStored);

    // Update variant price in repository
    await mockRepository.updateVariant(
      product.id,
      variant.id,
      {
        basePrice: newBase,
        sellingPrice: newSelling,
      },
      role
    );

    return {
      success: true,
      data: role === 'cashier' ? { ...newAdjustment, oldBasePrice: 0, newBasePrice: 0 } : newAdjustment,
      message: 'Price adjustment recorded successfully and updated in product catalog.',
    };
  }

  /**
   * Builds chart timeline data and summary metrics for visualization
   */
  public generateChartData(
    product: Product,
    adjustments: ProductPriceAdjustment[],
    timeRange: '30d' | '90d' | '6m' | '1y' | 'all' = 'all',
    selectedVariantId?: string,
    role: UserRole = 'admin'
  ): { timeline: PriceHistoryTimelinePoint[]; summary: ProductPriceHistorySummary } {
    const now = new Date();
    let cutoffDate = new Date(0);

    if (timeRange === '30d') {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 30);
    } else if (timeRange === '90d') {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 90);
    } else if (timeRange === '6m') {
      cutoffDate = new Date(now);
      cutoffDate.setMonth(now.getMonth() - 6);
    } else if (timeRange === '1y') {
      cutoffDate = new Date(now);
      cutoffDate.setFullYear(now.getFullYear() - 1);
    }

    // Filter adjustments by selected variant if provided
    let filteredAdjustments = adjustments.filter(
      (a) => new Date(a.effectiveDate) >= cutoffDate
    );

    if (selectedVariantId && selectedVariantId !== 'all') {
      filteredAdjustments = filteredAdjustments.filter((a) => a.variantId === selectedVariantId);
    }

    // Sort ascending for chronological graph
    const sorted = [...filteredAdjustments].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );

    // Group adjustments by date to form timeline points
    const dateMap = new Map<string, ProductPriceAdjustment[]>();

    sorted.forEach((adj) => {
      const dStr = adj.effectiveDate;
      const list = dateMap.get(dStr) || [];
      list.push(adj);
      dateMap.set(dStr, list);
    });

    // If today's date is not in map, append current state as latest point
    const todayStr = now.toISOString().split('T')[0];
    if (!dateMap.has(todayStr)) {
      dateMap.set(todayStr, []);
    }

    // Track active prices for each variant as we step through time
    const variantPriceState: Record<string, { selling: number; base: number; companyName: string }> = {};

    // Initialize variant state with initial values
    product.variants.forEach((v) => {
      variantPriceState[v.id] = {
        selling: v.sellingPrice,
        base: v.basePrice,
        companyName: v.companyName,
      };
    });

    const allDates = Array.from(dateMap.keys()).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const timeline: PriceHistoryTimelinePoint[] = [];

    allDates.forEach((dStr) => {
      const adjs = dateMap.get(dStr) || [];
      adjs.forEach((adj) => {
        if (variantPriceState[adj.variantId]) {
          variantPriceState[adj.variantId].selling = adj.newSellingPrice;
          variantPriceState[adj.variantId].base = adj.newBasePrice;
        } else {
          variantPriceState[adj.variantId] = {
            selling: adj.newSellingPrice,
            base: adj.newBasePrice,
            companyName: adj.companyName,
          };
        }
      });

      const relevantVariants = selectedVariantId && selectedVariantId !== 'all'
        ? [variantPriceState[selectedVariantId]].filter(Boolean)
        : Object.values(variantPriceState);

      const count = relevantVariants.length || 1;
      const totalSelling = relevantVariants.reduce((acc, v) => acc + v.selling, 0);
      const totalBase = relevantVariants.reduce((acc, v) => acc + v.base, 0);

      const avgSelling = Math.round(totalSelling / count);
      const avgBase = role === 'admin' ? Math.round(totalBase / count) : 0;
      const avgMargin = avgSelling - avgBase;
      const marginPct = avgBase > 0 ? Number(((avgMargin / avgBase) * 100).toFixed(1)) : 0;

      const dateObj = new Date(dStr);
      const displayDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: allDates.length > 8 ? '2-digit' : undefined,
      });

      const point: PriceHistoryTimelinePoint = {
        date: dStr,
        displayDate,
        timestamp: dateObj.getTime(),
        avgSellingPrice: avgSelling,
        avgBasePrice: avgBase,
        avgMargin,
        marginPct,
      };

      // Populate variant-specific prices for multi-line comparison
      Object.entries(variantPriceState).forEach(([vId, state]) => {
        const key = `${state.companyName}_selling`;
        point[key] = state.selling;
        if (role === 'admin') {
          point[`${state.companyName}_base`] = state.base;
        }
      });

      timeline.push(point);
    });

    // Calculate Summary Metrics
    const allSellingPrices = sorted.map((a) => a.newSellingPrice);
    if (allSellingPrices.length === 0) {
      allSellingPrices.push(...product.variants.map((v) => v.sellingPrice));
    }

    const allBasePrices = sorted.map((a) => a.newBasePrice);
    if (allBasePrices.length === 0) {
      allBasePrices.push(...product.variants.map((v) => v.basePrice));
    }

    const currentAvgSelling =
      product.variants.reduce((sum, v) => sum + v.sellingPrice, 0) / (product.variants.length || 1);
    const currentAvgBase =
      product.variants.reduce((sum, v) => sum + v.basePrice, 0) / (product.variants.length || 1);

    const initialAvgSelling = timeline.length > 0 ? timeline[0].avgSellingPrice : currentAvgSelling;
    const netChangeAmount = currentAvgSelling - initialAvgSelling;
    const netChangePercent =
      initialAvgSelling > 0 ? Number(((netChangeAmount / initialAvgSelling) * 100).toFixed(1)) : 0;

    const highestSellingPrice = Math.max(...allSellingPrices, currentAvgSelling);
    const lowestSellingPrice = Math.min(...allSellingPrices, currentAvgSelling);
    const highestBasePrice = Math.max(...allBasePrices, currentAvgBase);
    const lowestBasePrice = Math.min(...allBasePrices, currentAvgBase);

    const currentGrossMargin = currentAvgSelling - currentAvgBase;
    const currentMarginPercent =
      currentAvgBase > 0 ? Number(((currentGrossMargin / currentAvgBase) * 100).toFixed(1)) : 0;

    const lastAdj = sorted.length > 0 ? sorted[sorted.length - 1] : undefined;

    const summary: ProductPriceHistorySummary = {
      currentAvgSelling: Math.round(currentAvgSelling),
      currentAvgBase: Math.round(currentAvgBase),
      initialAvgSelling: Math.round(initialAvgSelling),
      netChangeAmount: Math.round(netChangeAmount),
      netChangePercent,
      highestSellingPrice,
      lowestSellingPrice,
      highestBasePrice,
      lowestBasePrice,
      currentGrossMargin: Math.round(currentGrossMargin),
      currentMarginPercent,
      totalAdjustmentsCount: sorted.length,
      lastAdjustmentDate: lastAdj?.effectiveDate,
      lastAdjustmentReason: lastAdj?.reason,
    };

    return { timeline, summary };
  }

  public resetPriceHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}

export const priceHistoryService = new PriceHistoryService();
