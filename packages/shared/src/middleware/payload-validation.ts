/**
 * Message size validation middleware.
 *
 * Per architecture: shop API max 64KB, admin API max 256KB.
 */

export const MAX_SHOP_PAYLOAD_BYTES = 64 * 1024; // 64 KB
export const MAX_ADMIN_PAYLOAD_BYTES = 256 * 1024; // 256 KB

export interface PayloadValidationResult {
  valid: boolean;
  sizeBytes: number;
  maxBytes: number;
}

export function validatePayloadSize(
  payload: Uint8Array | string,
  maxBytes: number,
): PayloadValidationResult {
  const sizeBytes =
    typeof payload === 'string' ? new TextEncoder().encode(payload).byteLength : payload.byteLength;
  return {
    valid: sizeBytes <= maxBytes,
    sizeBytes,
    maxBytes,
  };
}

export function validateShopPayload(payload: Uint8Array | string): PayloadValidationResult {
  return validatePayloadSize(payload, MAX_SHOP_PAYLOAD_BYTES);
}

export function validateAdminPayload(payload: Uint8Array | string): PayloadValidationResult {
  return validatePayloadSize(payload, MAX_ADMIN_PAYLOAD_BYTES);
}
