import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers, body });
  const text = await res.text();
  const payload = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : null) ?? `Request failed (${res.status})`;
    // Server says our session is no longer valid — sign out and let the
    // RequireAuth guard bounce the user back to /signin.
    if (res.status === 401 && message === "session_expired") {
      await supabase.auth.signOut();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/sign")) {
        window.location.href = "/signin";
      }
    }
    throw new ApiError(res.status, message, payload);
  }
  return payload as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, json?: unknown) =>
    request<T>(path, { method: "POST", json }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /**
   * Multipart upload. `FormData` is passed straight to fetch — we don't set
   * the `Content-Type` header so the browser picks the boundary itself.
   */
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
};
