import apiClient from "./ApiClient";

class LoanService {
  getLoans() {
    return apiClient.get("/loans");
  }

  createLoan(payload) {
    return apiClient.post("/loans", payload);
  }

  approveLoan(loanId, payload) {
    return apiClient.put(`/loans/${loanId}/approval`, payload);
  }
}

export default new LoanService();
