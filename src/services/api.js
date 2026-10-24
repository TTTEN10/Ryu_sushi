const API_BASE = '/api';

async function request(endpoint, data) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export const submitContact = (data) => request('/contact', data);
export const subscribeNewsletter = (data) => request('/newsletter', data);
