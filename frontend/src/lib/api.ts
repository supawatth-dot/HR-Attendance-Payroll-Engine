import axios from 'axios';
import { getToken, clearToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

console.log('API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      clearToken();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

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
  const res = await api.get('/employees', { params });
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
  return api.post('/import/attendance', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(pct);
      }
    },
  });
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

export interface OverviewResponse {
  range: { startDate: string; endDate: string };
  kpis: {
    employees: number;
    leaveDays: number;
    lateCount: number;
    workingHours: number;
    otHours: number;
    mealTotal: number;
    absentDays: number;
  };
  byDepartment: {
    department: string;
    employees: number;
    workingHours: number;
    otHours: number;
    lateCount: number;
    mealTotal: number;
  }[];
  trend: { date: string; lateCount: number; otHours: number }[];
}

export async function getOverview(startDate?: string, endDate?: string): Promise<OverviewResponse> {
  const res = await api.get('/dashboard/overview', { params: { startDate, endDate } });
  return res.data;
}
