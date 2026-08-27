import { 
  Product, 
  ProductPriceAdjustment, 
  CreatePriceAdjustmentInput, 
  PriceHistoryTimelinePoint, 
  ProductPriceHistorySummary,
  ApiResponse,
  UserRole
} from '../types';
import { api, ApiError, toCamelCaseKeys } from './apiClient';

export class PriceHistoryService {
  private mapAdjustment(raw: any, product: Product, variant: Product['variants'][number]): ProductPriceAdjustment {
    const item = toCamelCaseKeys(raw);
    return {
      id: String(item.id),
      productId: product.id,
      variantId: variant.id,
      companyName: variant.companyName,
      oldBasePrice: Number(item.oldBasePrice || 0),
      newBasePrice: Number(item.newBasePrice || 0),
      oldMinSellingPrice: Number(item.oldMinSellingPrice || 0),
      newMinSellingPrice: Number(item.newMinSellingPrice || 0),
      oldDefaultSellingPrice: Number(item.oldDefaultSellingPrice || 0),
      newDefaultSellingPrice: Number(item.newDefaultSellingPrice || 0),
      oldMaxSellingPrice: Number(item.oldMaxSellingPrice || 0),
      newMaxSellingPrice: Number(item.newMaxSellingPrice || 0),
      oldSellingPrice: Number(item.oldDefaultSellingPrice || 0),
      newSellingPrice: Number(item.newDefaultSellingPrice || 0),
      changeType: item.changeType,
      reason: item.reason || '',
      adjustedBy: item.adjustedByName || 'Administrator',
      effectiveDate: item.effectiveDate,
      createdAt: item.createdAt,
    };
  }

  /**
   * Get all historical price adjustments for a product
   */
  public async getProductPriceHistory(
    product: Product,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<ProductPriceAdjustment[]>> {
    try {
      const response = await api.get<any>(`/products/${product.id}/`);
      const detail = toCamelCaseKeys(response.data);
      const variantsById = new Map(product.variants.map((variant) => [variant.id, variant]));
      const adjustments = (detail.variants || []).flatMap((rawVariant: any) => {
        const variant = variantsById.get(String(rawVariant.id));
        if (!variant) return [];
        return (rawVariant.priceHistory || []).map((raw: any) => this.mapAdjustment(raw, product, variant));
      });
      adjustments.sort((a: ProductPriceAdjustment, b: ProductPriceAdjustment) =>
        new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
      );
      return { success: true, data: adjustments, message: response.message };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to retrieve product price history.');
    }
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

    const newDefaultSelling = input.newDefaultSellingPrice ? Number(input.newDefaultSellingPrice) : Number(input.newSellingPrice);
    const newBase = Number(input.newBasePrice);
    const newMinSelling = input.newMinSellingPrice ? Number(input.newMinSellingPrice) : (variant.minSellingPrice || Math.round(newBase * 1.15));
    const newMaxSelling = input.newMaxSellingPrice ? Number(input.newMaxSellingPrice) : (variant.maxSellingPrice || Math.round(newDefaultSelling * 1.25));

    try {
      const response = await api.post<any>(`/products/variants/${variant.id}/price-adjustment/`, {
        newBasePrice: newBase,
        newMinSellingPrice: newMinSelling,
        newDefaultSellingPrice: newDefaultSelling,
        newMaxSellingPrice: newMaxSelling,
        reason: input.reason.trim() || 'Manual pricing adjustment by administrator',
      });
      const updatedVariant = toCamelCaseKeys(response.data);
      const latest = updatedVariant.priceHistory?.[0];
      if (!latest) throw new Error('Backend did not return the recorded price adjustment.');
      return { success: true, data: this.mapAdjustment(latest, product, variant), message: response.message };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to record price adjustment.');
    }
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
    // Historical price records are immutable server data and cannot be reset by the client.
  }
}

export const priceHistoryService = new PriceHistoryService();
