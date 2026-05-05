import apiClient from "./ApiClient";

class MemberService {
  getMembers() {
    return apiClient.get("/members");
  }

  createMember(payload) {
    return apiClient.post("/members", payload);
  }
}

export default new MemberService();
