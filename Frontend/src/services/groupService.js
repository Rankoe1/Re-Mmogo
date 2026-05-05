import apiClient from "./ApiClient";

class GroupService {
  getGroups() {
    return apiClient.get("/groups");
  }

  createGroup(payload) {
    return apiClient.post("/groups", payload);
  }
}

export default new GroupService();
