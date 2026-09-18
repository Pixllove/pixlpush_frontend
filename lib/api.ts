export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) throw new Error('Something went wrong. Please try again.');
  return response.json();
}

export const campaignsApi = {
  get: () => apiRequest('/api/campaigns'),
  post: (body: unknown) => apiRequest('/api/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  put: (body: unknown) => apiRequest('/api/campaigns', { method: 'PUT', body: JSON.stringify(body) }),
  patch: (body: unknown) => apiRequest('/api/campaigns', { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (body: unknown) => apiRequest('/api/campaigns', { method: 'DELETE', body: JSON.stringify(body) }),
};
