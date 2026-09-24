import { apiRequest } from './apiClient';
import { mapBackendProduct } from './productService';
import { Product } from '../types';

export interface PhotoSearchResult {
  matches: { product: Product; similarity: number }[];
  indexedProducts: number;
}

export async function findProductsByPhoto(image: Blob, signal: AbortSignal): Promise<PhotoSearchResult> {
  const body = new FormData();
  body.append('image', image, image.type === 'image/png' ? 'photo.png' : image.type === 'image/webp' ? 'photo.webp' : 'photo.jpg');
  const response = await apiRequest<any>('/products/photo-search/', { method: 'POST', body, signal });
  return {
    matches: (response.data.matches || []).map((match: any) => ({ product: mapBackendProduct(match.product), similarity: match.similarity })),
    indexedProducts: response.data.indexed_products,
  };
}
