export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has("content-type") && options?.body && typeof options.body === "string") {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let json: { data?: T; error?: { message?: string } } | null = null;
  try {
    json = await response.json();
  } catch {
    // Body is empty or non-JSON
  }

  if (!response.ok) {
    const message = json?.error?.message || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  if (json && "data" in json) {
    return json.data as T;
  }
  return json as unknown as T;
}
