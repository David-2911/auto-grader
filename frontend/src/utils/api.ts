export async function parseJsonSafe(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  // If no body (e.g., 204) return empty object
  const text = await res.text();
  if (!text) return {};
  if (!contentType.includes('application/json')) {
    // Attempt JSON parse anyway; if fail, wrap raw text
    try { return JSON.parse(text); } catch { return { raw: text }; }
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return { parseError: true, raw: text };
  }
}
