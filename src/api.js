import { API_BASE_URL, REQUEST_TIMEOUT_MS, SLOW_REQUEST_MS } from './config.js';

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

export function createApi({ baseUrl = API_BASE_URL, fetchImpl = (...args) => fetch(...args),
  timeoutMs = REQUEST_TIMEOUT_MS, slowMs = SLOW_REQUEST_MS, onSlow = () => {}, storage,
  cryptoImpl = globalThis.crypto } = {}) {
  const keys = new Map();
  // Store only a digest and random request key; no address or financial inputs.
  async function requestKey(path, payload) {
    const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
    const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
    const name = `deal-hunter:${baseUrl}:${path}:${hash}`;
    if (keys.has(name)) return keys.get(name);
    let key;
    try { key = storage?.getItem(name); } catch { /* Storage can be disabled. */ }
    if (!key || !/^[0-9a-f-]{36}$/i.test(key)) key = cryptoImpl.randomUUID();
    keys.set(name, key);
    try { storage?.setItem(name, key); } catch { /* In-memory keys still protect retries. */ }
    return key;
  }

  async function request(path, payload) {
    const headers = { Accept: 'application/json' };
    if (payload !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Idempotency-Key'] = await requestKey(path, payload);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const slow = setTimeout(onSlow, slowMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: payload === undefined ? 'GET' : 'POST', headers,
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
        signal: controller.signal, credentials: 'omit', cache: 'no-store',
      });
      let data;
      try { data = await response.json(); } catch { throw new ApiError('The service returned an unreadable response. Try again shortly.'); }
      if (!response.ok) {
        if (response.status === 422) {
          const fields = Array.isArray(data.detail) ? [...new Set(data.detail.map(item => (item.loc || []).slice(1).join(' ')))].filter(Boolean).join(', ') : '';
          throw new ApiError(`The service could not validate these inputs${fields ? `: ${fields}` : ''}. Review the form and try again.`, 422);
        }
        if (response.status === 409) throw new ApiError('This saved request conflicts with an existing record. Reload saved deals before trying different inputs.', 409);
        if (response.status === 404) throw new ApiError('This saved deal is no longer available. Refresh the list.', 404);
        throw new ApiError('The analysis service is temporarily unavailable. Your browser calculation is still available.', response.status);
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (controller.signal.aborted) throw new ApiError('The service took too long to confirm. A save may have completed: refresh saved deals or retry the same inputs safely. Your browser calculation remains available.');
      throw new ApiError('Could not reach the analysis service. Check your connection and retry the same inputs safely. Your browser calculation remains available.');
    } finally {
      clearTimeout(timeout); clearTimeout(slow);
    }
  }

  return {
    async save({ property, analysis }) {
      // Wake a sleeping Render instance before any write. POSTs are never blindly retried.
      await request('/health');
      const savedProperty = await request('/api/properties', property);
      if (!Number.isInteger(savedProperty.id)) throw new ApiError('The service did not confirm the property. Retry the same inputs safely.');
      const deal = await request('/api/deals/analyze', { ...analysis, property_id: savedProperty.id });
      if (!Number.isInteger(deal.id)) throw new ApiError('The service did not confirm the analysis. Refresh saved deals or retry safely.');
      return deal;
    },
    list: () => request('/api/deals'),
    summary: id => {
      if (!/^\d+$/.test(String(id))) throw new ApiError('Select a saved deal first.');
      return request(`/api/deals/${id}/summary`);
    },
  };
}
