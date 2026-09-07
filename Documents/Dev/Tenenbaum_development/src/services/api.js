/**
 * Thin API client for the Express backend. All calls hit the `/api` prefix,
 * which Vite proxies to the local server in development and which is served
 * from the same origin in production.
 */

const BASE = import.meta.env.VITE_API_BASE || "/api";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

export function submitContact(payload) {
  return post("/contact", payload);
}

export function subscribeNewsletter(email) {
  return post("/newsletter", { email });
}
