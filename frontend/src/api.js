// Thin fetch wrapper; throws Error(message) using the API's { error } body.
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Please try again.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  dashboard: () => request('/api/dashboard'),
  books: (q = '') => request(`/api/books?q=${encodeURIComponent(q)}`),
  createBook: (body) => request('/api/books', { method: 'POST', body }),
  updateBook: (id, body) => request(`/api/books/${id}`, { method: 'PUT', body }),
  deleteBook: (id) => request(`/api/books/${id}`, { method: 'DELETE' }),
  members: () => request('/api/members'),
  createMember: (body) => request('/api/members', { method: 'POST', body }),
  updateMember: (id, body) => request(`/api/members/${id}`, { method: 'PUT', body }),
  deleteMember: (id) => request(`/api/members/${id}`, { method: 'DELETE' }),
  loans: (status = 'active') => request(`/api/loans?status=${status}`),
  overdue: () => request('/api/loans/overdue'),
  issue: (body) => request('/api/loans/issue', { method: 'POST', body }),
  returnLoan: (id) => request(`/api/loans/${id}/return`, { method: 'POST' }),
};

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');
export const fmtMoney = (n) => Number(n || 0).toFixed(2);
