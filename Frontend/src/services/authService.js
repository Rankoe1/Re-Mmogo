import apiClient from "./ApiClient";

class AuthService {
  saveSession(session) {
    localStorage.setItem("re-mmogo-token", session.token);
    localStorage.setItem("re-mmogo-user", JSON.stringify(session.user));
  }

  getStoredSession() {
    const token = localStorage.getItem("re-mmogo-token");
    const user = localStorage.getItem("re-mmogo-user");

    if (!token || !user) {
      return null;
    }

    return {
      token,
      user: JSON.parse(user)
    };
  }

  async login(credentials) {
    const session = await apiClient.post("/auth/login", credentials);
    this.saveSession(session);
    return session;
  }

  async register(payload) {
    const session = await apiClient.post("/auth/register", payload);
    this.saveSession(session);
    return session;
  }

  logout() {
    localStorage.removeItem("re-mmogo-token");
    localStorage.removeItem("re-mmogo-user");
  }
}

export default new AuthService();
