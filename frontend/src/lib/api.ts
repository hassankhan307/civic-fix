const API_BASE = '/api/v1';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('civicfix_token');
}

export function setStoredToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('civicfix_token', token);
  }
}

export function removeStoredToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('civicfix_token');
    localStorage.removeItem('civicfix_user');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set JSON header only if not sending FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (userData: any) =>
      request<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    getMe: () => request<any>('/auth/me'),
    refresh: (refreshToken: string) =>
      request<any>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
  },
  reports: {
    getAll: (params: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
      return request<any>(`/reports?${query.toString()}`);
    },
    getById: (id: string) => request<any>(`/reports/${id}`),
    create: (formData: FormData) =>
      request<any>('/reports', {
        method: 'POST',
        body: formData,
      }),
    addComment: (reportId: string, content: string, isInternal = false) =>
      request<any>(`/reports/${reportId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, isInternal }),
      }),
    confirmResolution: (reportId: string, confirmed: boolean, confirmationNotes?: string) =>
      request<any>(`/reports/${reportId}/confirm-resolution`, {
        method: 'POST',
        body: JSON.stringify({ confirmed, confirmationNotes }),
      }),
  },
  ai: {
    analyzeImage: (formData: FormData) =>
      request<any>('/ai/analyze-image', {
        method: 'POST',
        body: formData,
      }),
    checkDuplicates: (params: {
      latitude: number;
      longitude: number;
      category: string;
      title: string;
      description: string;
    }) =>
      request<any>('/ai/check-duplicates', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },
  admin: {
    getDashboard: () => request<any>('/admin/dashboard'),
    getReports: (params: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
      return request<any>(`/admin/reports?${query.toString()}`);
    },
    updateStatus: (id: string, payload: { status: string; comment?: string; rejectionReason?: string; resolutionNotes?: string; resolutionPhotoUrl?: string }) =>
      request<any>(`/admin/reports/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    updatePriority: (id: string, payload: { priorityScore: number; priorityLevel?: string; reason?: string }) =>
      request<any>(`/admin/reports/${id}/priority`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    assignReport: (id: string, payload: { departmentId?: string; staffId?: string; reason?: string }) =>
      request<any>(`/admin/reports/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    mergeDuplicates: (id: string, payload: { duplicateReportIds: string[]; reason?: string }) =>
      request<any>(`/admin/reports/${id}/merge`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getAnalytics: () => request<any>('/admin/analytics'),
    getMap: (params: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val) query.append(key, String(val));
      });
      return request<any>(`/admin/map?${query.toString()}`);
    },
    getHeatmap: () => request<any>('/admin/heatmap'),
    getDepartments: () => request<any>('/admin/departments'),
    getStaff: () => request<any>('/admin/staff'),
  },
  notifications: {
    getAll: (limit = 20) => request<any>(`/notifications?limit=${limit}`),
    markAsRead: (id: string) =>
      request<any>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),
    markAllAsRead: () =>
      request<any>('/notifications/read-all', {
        method: 'PATCH',
      }),
  },
};
