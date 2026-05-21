export async function fetchJson(path, { signal } = {}) {
  const res = await fetch(path, { signal, headers: { Accept: "application/json" } });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`Request failed for ${path}: ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}
