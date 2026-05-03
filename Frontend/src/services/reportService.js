import apiClient from "./ApiClient";

class ReportService {
  getYearEndReport(groupId) {
    return apiClient.get(`/reports/year-end?groupId=${groupId}`);
  }
}

export default new ReportService();
