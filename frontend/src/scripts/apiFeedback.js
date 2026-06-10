const BASE_URL =
  "https://k5-teamproj.icysea-5b3a24a1.germanywestcentral.azurecontainerapps.io";

async function login(username, password) {
  const response = await fetch(`${BASE_URL}/api/v1/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Login failed (${response.status})`);
  }

  const data = await response.json();
  sessionStorage.setItem("auth_token", data.token);
}

async function getAiFeedback(fromDate, toDate) {
  const token = sessionStorage.getItem("auth_token");
  if (!token) throw new Error("No token — please log in first.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/SavedContent/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fromDate, toDate }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.generatedMessage;
  } finally {
    clearTimeout(timeout);
  }
}

export { login, getAiFeedback };
