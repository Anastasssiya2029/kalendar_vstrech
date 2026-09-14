function snakeToCamel(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(snakeToCamel);
  if (typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      snakeToCamel(nested),
    ]));
  }
  return value;
}

const DATE_ONLY_WIRE_FIELDS = new Set([
  "date",
  "original_date",
  "old_date",
  "new_date",
  "due_date",
  "paid_date",
]);

function formatLocalDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function camelToSnake(value: any, wireField?: string): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(camelToSnake);
  if (value instanceof Date) {
    return wireField && DATE_ONLY_WIRE_FIELDS.has(wireField)
      ? formatLocalDateOnly(value)
      : value;
  }
  if (typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      return [snakeKey, camelToSnake(nested, snakeKey)];
    }));
  }
  return value;
}

class ApiService {
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Не удалось выполнить запрос");
    return snakeToCamel(payload) as T;
  }

  private schoolPath(schoolId: string, resource: string) {
    return `/api/schools/${encodeURIComponent(schoolId)}/${resource}`;
  }

  async login(email: string, password: string) {
    return this.request<{ user: any; school: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    await this.request<void>("/api/auth/logout", { method: "POST" });
  }

  async getCurrentUser() {
    return this.request<{ user: any; school: any }>("/api/auth/me");
  }

  async updateProfile(data: { name: string; email: string }) {
    return this.request<{ user: any }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getTelegramStatus() {
    return this.request<{
      telegram: {
        configured: boolean;
        connected: boolean;
        connectedAt?: string;
        botUsername?: string;
      };
    }>("/api/auth/telegram");
  }

  async createTelegramConnectUrl() {
    return this.request<{ url: string; expiresInMinutes: number }>("/api/auth/telegram/connect", {
      method: "POST",
      body: "{}",
    });
  }

  async disconnectTelegram() {
    await this.request<void>("/api/auth/telegram", { method: "DELETE" });
  }

  async getSchools() {
    return this.request<{ schools: any[] }>("/api/schools");
  }

  async getSchool(schoolId: string) {
    return this.request<any>(`/api/schools/${encodeURIComponent(schoolId)}`);
  }

  async createSchool(data: { name: string; description?: string }) {
    return this.request<{ school: any }>("/api/schools", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSchool(schoolId: string, data: { name: string; adminName?: string; adminEmail?: string }) {
    return this.request<{ school: any }>(`/api/schools/${encodeURIComponent(schoolId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getClients(schoolId: string, managerId?: string) {
    const search = managerId ? `?managerId=${encodeURIComponent(managerId)}` : "";
    return this.request<{ clients: any[] }>(this.schoolPath(schoolId, `clients${search}`));
  }

  async createClient(schoolId: string, clientData: any) {
    return this.request<{ client: any }>(this.schoolPath(schoolId, "clients"), {
      method: "POST",
      body: JSON.stringify(camelToSnake(clientData)),
    });
  }

  async updateClient(schoolId: string, clientId: string, clientData: any) {
    return this.request<{ client: any }>(this.schoolPath(schoolId, `clients/${encodeURIComponent(clientId)}`), {
      method: "PATCH",
      body: JSON.stringify(camelToSnake(clientData)),
    });
  }

  async deleteClient(schoolId: string, clientId: string) {
    await this.request<void>(this.schoolPath(schoolId, `clients/${encodeURIComponent(clientId)}`), { method: "DELETE" });
  }

  async getMeetings(schoolId: string, filters: Record<string, string | boolean | undefined> = {}) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) search.set(key, String(value));
    const suffix = search.size ? `?${search}` : "";
    return this.request<{ meetings: any[] }>(this.schoolPath(schoolId, `meetings${suffix}`));
  }

  async createMeeting(schoolId: string, meetingData: any) {
    return this.request<{ meeting: any }>(this.schoolPath(schoolId, "meetings"), {
      method: "POST",
      body: JSON.stringify(camelToSnake(meetingData)),
    });
  }

  async bookTimeSlot(schoolId: string, clientId: string, slotId: string) {
    return this.request<{ meeting: any; timeSlot: any; client: any }>(this.schoolPath(schoolId, "bookings"), {
      method: "POST",
      body: JSON.stringify(camelToSnake({ clientId, slotId })),
    });
  }

  async updateMeeting(schoolId: string, meetingId: string, data: any) {
    return this.request<{ meeting: any }>(this.schoolPath(schoolId, `meetings/${encodeURIComponent(meetingId)}`), {
      method: "PATCH",
      body: JSON.stringify(camelToSnake(data)),
    });
  }

  async deleteMeeting(schoolId: string, meetingId: string) {
    await this.request<void>(this.schoolPath(schoolId, `meetings/${encodeURIComponent(meetingId)}`), { method: "DELETE" });
  }

  async getTimeSlots(schoolId: string, filters: Record<string, string | boolean | undefined> = {}) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) search.set(key, String(value));
    const suffix = search.size ? `?${search}` : "";
    return this.request<{ timeSlots: any[] }>(this.schoolPath(schoolId, `time_slots${suffix}`));
  }

  async createTimeSlot(schoolId: string, slotData: any) {
    return this.request<{ timeSlot: any }>(this.schoolPath(schoolId, "time_slots"), {
      method: "POST",
      body: JSON.stringify(camelToSnake(slotData)),
    });
  }

  async updateTimeSlot(schoolId: string, slotId: string, data: any) {
    return this.request<{ timeSlot: any }>(this.schoolPath(schoolId, `time_slots/${encodeURIComponent(slotId)}`), {
      method: "PATCH",
      body: JSON.stringify(camelToSnake(data)),
    });
  }

  async deleteTimeSlot(schoolId: string, slotId: string) {
    await this.request<void>(this.schoolPath(schoolId, `time_slots/${encodeURIComponent(slotId)}`), { method: "DELETE" });
  }

  async getTariffs(schoolId: string) {
    return this.request<{ tariffs: any[] }>(this.schoolPath(schoolId, "tariffs"));
  }

  async createTariff(schoolId: string, tariffData: any) {
    return this.request<{ tariff: any }>(this.schoolPath(schoolId, "tariffs"), {
      method: "POST",
      body: JSON.stringify(camelToSnake(tariffData)),
    });
  }

  async updateTariff(schoolId: string, tariffId: string, data: any) {
    return this.request<{ tariff: any }>(this.schoolPath(schoolId, `tariffs/${encodeURIComponent(tariffId)}`), {
      method: "PATCH",
      body: JSON.stringify(camelToSnake(data)),
    });
  }

  async getPayments(schoolId: string, clientId?: string) {
    const suffix = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    return this.request<{ payments: any[] }>(this.schoolPath(schoolId, `payments${suffix}`));
  }

  async createPayment(schoolId: string, paymentData: any) {
    return this.request<{ payment: any }>(this.schoolPath(schoolId, "payments"), {
      method: "POST",
      body: JSON.stringify(camelToSnake(paymentData)),
    });
  }

  async getManagers(schoolId: string) {
    return this.request<{ managers: any[] }>(this.schoolPath(schoolId, "users?role=manager"));
  }

  async getSchoolMembers(schoolId: string) {
    return this.request<{ members: any[] }>(this.schoolPath(schoolId, "users"));
  }

  async createUser(userData: { email: string; name: string; schoolId: string; password: string; role: 'manager' | 'admin' | 'super_admin' }) {
    return this.request<{ user: any }>(this.schoolPath(userData.schoolId, "users"), {
      method: "POST",
      body: JSON.stringify({ email: userData.email, name: userData.name, password: userData.password, role: userData.role }),
    });
  }

  async updateUser(schoolId: string, userId: string, data: { name?: string; email?: string; password?: string; role?: 'manager' | 'admin' | 'super_admin' }) {
    return this.request<{ user: any }>(this.schoolPath(schoolId, `users/${encodeURIComponent(userId)}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteUser(schoolId: string, userId: string) {
    return this.request<void>(this.schoolPath(schoolId, `users/${encodeURIComponent(userId)}`), {
      method: "DELETE",
    });
  }
}

export const apiService = new ApiService();
