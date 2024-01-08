export async function fetchJson<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T | unknown | null> {
  const response = await fetch(url, options);
  if (response.status === 204) {
    return null;
  }
  return response.json();
}
