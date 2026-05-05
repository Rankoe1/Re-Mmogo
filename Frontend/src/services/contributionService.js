import apiClient from "./ApiClient";

class ContributionService {
  getContributions() {
    return apiClient.get("/contributions");
  }

  createContribution(payload) {
    return apiClient.post("/contributions", payload);
  }

  getBalances() {
    return apiClient.get("/balances");
  }
}

export default new ContributionService();
