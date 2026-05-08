const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

type ApiFetchOptions = RequestInit & {
  skipAuthRefresh?: boolean;
};

export const formatErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
};

export const readErrorMessage = async (
  response: Response,
  fallback: string,
) => {
  try {
    const data = (await response.json()) as {
      message?: unknown;
      error?: unknown;
    };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Ignore JSON parsing failures.
  }

  try {
    const text = await response.text();
    if (text.trim()) {
      return text;
    }
  } catch {
    // Ignore text parsing failures.
  }

  return fallback;
};

const buildUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}/${path}`;
};

export const apiFetch = async (path: string, options: ApiFetchOptions = {}) => {
  const url = buildUrl(path);
  const { skipAuthRefresh, ...fetchOptions } = options;
  const response = await fetch(url, {
    credentials: "include",
    ...fetchOptions,
  });

  if (response.status !== 401 || skipAuthRefresh) {
    return response;
  }

  const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "GET",
    credentials: "include",
  });

  if (!refreshResponse.ok) {
    return response;
  }

  const { skipAuthRefresh: _skipAuthRefresh, ...retryOptions } = options;

  return fetch(url, {
    credentials: "include",
    ...retryOptions,
  });
};
