import { getToken, clearToken } from './auth';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

type RequestOptions = {
  body?: BodyInit | Record<string, any>;
  headers?: Record<string, string>;
  params?: Record<string, any>;
};

type ApiResponse<T = any> = {
  data: T;
  status: number;
  headers: Headers;
};

class ApiError extends Error {
  response?: { status: number; data: any };

  constructor(message: string, response?: { status: number; data: any }) {
    super(message);
    this.name = 'ApiError';
    this.response = response;
  }
}

function buildUrl(path: string, params?: Record<string, any>) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  if (contentType.startsWith('text/')) {
    return response.text();
  }

  if (response.status === 204) {
    return null;
  }

  return response.blob();
}

async function request<T = any>(method: string, path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(path, options.params), {
    method,
    headers,
    body,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      clearToken();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    throw new ApiError(
      typeof data === 'object' && data && 'message' in data ? String(data.message) : `Request failed with status ${response.status}`,
      { status: response.status, data }
    );
  }

  return { data: data as T, status: response.status, headers: response.headers };
}

const api = {
  get: <T = any>(path: string, options: Omit<RequestOptions, 'body'> = {}) => request<T>('GET', path, options),
  post: <T = any>(path: string, body?: RequestOptions['body'], options: Omit<RequestOptions, 'body'> = {}) =>
    request<T>('POST', path, { ...options, body }),
  put: <T = any>(path: string, body?: RequestOptions['body'], options: Omit<RequestOptions, 'body'> = {}) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T = any>(path: string, body?: RequestOptions['body'], options: Omit<RequestOptions, 'body'> = {}) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T = any>(path: string, options: Omit<RequestOptions, 'body'> = {}) => request<T>('DELETE', path, options),
};

export default api;

export async function getAttendanceResults(params?: any) {
  const res = await api.get('/attendance/results', { params });
  return res.data;
}

export async function runAttendanceEngine(startDate: string, endDate: string) {
  const res = await api.post('/attendance/run', { startDate, endDate });
  return res.data;
}

export async function getEmployees(params?: any) {
  const normalizedParams = { ...params };
  if (normalizedParams?.pageSize && !normalizedParams.limit) {
    normalizedParams.limit = normalizedParams.pageSize;
  }

  const res = await api.get('/employees', { params: normalizedParams });
  return res.data;
}

export async function createEmployee(data: any) {
  const res = await api.post('/employees', data);
  return res.data;
}

export async function deleteEmployee(id: number | string) {
  const res = await api.delete(`/employees/${id}`);
  return res.data;
}

export async function importAttendance(file: File, onProgress?: (pct: number) => void) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/import/attendance', formData, {
    headers: {},
  });

  onProgress?.(100);
  return response;
}

export async function getDepartments() {
  const res = await api.get('/departments');
  return res.data;
}

export async function getShifts() {
  const res = await api.get('/shifts');
  return res.data;
}

export async function getRuleCategories() {
  const res = await api.get('/rules/categories');
  return res.data;
}

export async function getRuleDefinitions(categoryId?: number) {
  const res = await api.get('/rules/definitions', { params: { categoryId } });
  return res.data;
}

export async function getRuleVersions(definitionId?: number) {
  const res = await api.get('/rules/versions', { params: { definitionId } });
  return res.data;
}

export async function upsertRuleValues(versionId: number, values: any[]) {
  const res = await api.put(`/rules/versions/${versionId}/values`, { values });
  return res.data;
}

export async function getPayrollBatches() {
  const res = await api.get('/payroll/batches');
  return res.data;
}

export async function generatePayroll(periodStart: string, periodEnd: string) {
  const res = await api.post('/payroll/generate', { periodStart, periodEnd });
  return res.data;
}

export async function getAuditLogs(params?: any) {
  const res = await api.get('/audit', { params });
  return res.data;
}
