const DEFAULT_BASE_URL = "https://pm.trlabs.my";

export async function pmFetch<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const token = process.env["PM_TOKEN"];
  const baseUrl = process.env["PM_BASE_URL"] ?? DEFAULT_BASE_URL;

  if (!token) {
    throw new Error(
      "PM_TOKEN required; create one at https://pm.trlabs.my/settings/api-tokens"
    );
  }

  const url = `${baseUrl}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(init?.body !== undefined
        ? { body: JSON.stringify(init.body) }
        : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`PM API unreachable: ${message}`);
  }

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // ignore body read errors
    }
    throw new Error(
      `PM API error ${response.status}: ${body || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
