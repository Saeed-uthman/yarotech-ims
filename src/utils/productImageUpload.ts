// Existing remote image URLs are display values, never fetched or re-uploaded.
// Only a new local file (FileReader data URI) becomes a multipart image upload.
export function productWriteBody(payload: Record<string, unknown>, image?: string): Record<string, unknown> | FormData {
  if (image === '') return { ...payload, image: null };
  if (!image?.startsWith('data:')) return payload;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match) throw new Error('Choose a JPEG, PNG or WebP product photo.');
  if (match[2].length > 4 * 1024 * 1024 * 4 / 3 + 4) throw new Error('Product photo must be 4 MB or smaller.');
  const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
  const body = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });
  body.append('image', new Blob([bytes], { type: match[1] }), 'product.' + match[1].split('/')[1]);
  return body;
}
