/**
 * Server-side SAP API client.
 * Used by the MCP server and server components only — never import in client components.
 */

const SAP_BASE_URL = process.env.SAP_BASE_URL || "https://interface-v2.nordtek.hu/v1";
const SAP_CLIENT_ID = process.env.SAP_CLIENT_ID || "";
const SAP_API_KEY = process.env.SAP_API_KEY || "";

function authHeader(): string {
  const encoded = Buffer.from(`${SAP_CLIENT_ID}:${SAP_API_KEY}`).toString("base64");
  return `Basic ${encoded}`;
}

function baseHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: authHeader(),
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra,
  };
}

async function handleResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SAP ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function sapGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${SAP_BASE_URL}${path}`, {
    method: "GET",
    headers: baseHeaders(),
    cache: "no-store",
  });
  return handleResponse(res) as Promise<T>;
}

export async function sapPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${SAP_BASE_URL}${path}`, {
    method: "POST",
    headers: baseHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return handleResponse(res) as Promise<T>;
}

export async function sapPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${SAP_BASE_URL}${path}`, {
    method: "PATCH",
    headers: baseHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return handleResponse(res) as Promise<T>;
}

export async function sapDelete<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${SAP_BASE_URL}${path}`, {
    method: "DELETE",
    headers: baseHeaders(),
    cache: "no-store",
  });
  return handleResponse(res) as Promise<T>;
}

/**
 * Multipart upload (for invoice PDF)
 */
export async function sapPostFormData<T = unknown>(path: string, formData: FormData): Promise<T> {
  const encoded = Buffer.from(`${SAP_CLIENT_ID}:${SAP_API_KEY}`).toString("base64");
  const res = await fetch(`${SAP_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encoded}`,
      Accept: "application/json",
      // Do NOT set Content-Type for multipart — let fetch set it with boundary
    },
    body: formData,
    cache: "no-store",
  });
  return handleResponse(res) as Promise<T>;
}
