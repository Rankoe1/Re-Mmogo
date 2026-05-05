import { API_BASE_URL } from "../config/api";

class ApiClient {
  getToken() {
    return localStorage.getItem("re-mmogo-token");
  }

  async request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    const token = this.getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      throw new Error(payload?.message || "Request failed.");
    }

    return payload;
  }

  get(path) {
    return this.request(path, { method: "GET" });
  }

  post(path, body) {
    return this.request(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  put(path, body) {
    return this.request(path, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }

  delete(path) {
    return this.request(path, { method: "DELETE" });
  }
}

export default new ApiClient();
