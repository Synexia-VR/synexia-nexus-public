export const API_BASE_URL = "/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAuthToken(): string | null {
  return accessToken;
}

export function setAuthToken(token: string | null): void {
  accessToken = token;
}

export interface RefreshResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export async function refreshAccessToken(): Promise<RefreshResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as RefreshResponse;
    accessToken = data.accessToken;
    return data;
  } catch {
    return null;
  }
}

async function doRefresh(): Promise<string | null> {
  const result = await refreshAccessToken();
  return result?.accessToken ?? null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (accessToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retryOnUnauthorized && accessToken) {
    const newToken = await doRefresh();
    if (newToken) {
      return apiRequest<T>(path, options, false);
    }
  }

  if (!res.ok) {
    let errorBody: any = null;
    try {
      errorBody = await res.json();
    } catch {
      // ignore
    }
    const err = new Error(
      errorBody?.error || `Request failed with status ${res.status}`
    ) as any;
    (err as any).status = res.status;
    (err as any).body = errorBody;
    throw err;
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }
  accessToken = null;
}
