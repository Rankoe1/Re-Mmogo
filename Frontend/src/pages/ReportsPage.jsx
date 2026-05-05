import React, { Component } from "react";
import FormMessage from "../components/common/FormMessage";
import groupService from "../services/groupService";
import reportService from "../services/reportService";

class ReportsPage extends Component {
  state = {
    groups: [],
    selectedGroupId: "",
    report: null,
    loading: true,
    error: ""
  };

  async componentDidMount() {
    try {
      const groups = await groupService.getGroups();
      this.setState({
        groups: groups || [],
        selectedGroupId: groups?.[0]?.id || "",
        loading: false
      });
    } catch (error) {
      this.setState({ loading: false, error: "Groups could not be loaded for reporting." });
    }
  }

  handleChange = (event) => {
    this.setState({ selectedGroupId: event.target.value });
  };

  handleSubmit = async (event) => {
    event.preventDefault();

    if (!this.state.selectedGroupId) {
      this.setState({ error: "Select a group to generate a report." });
      return;
    }

    try {
      const report = await reportService.getYearEndReport(this.state.selectedGroupId);
      this.setState({ report, error: "" });
    } catch (error) {
      this.setState({
        error: error.message || "Year-end reporting will work once the backend endpoint is ready.",
        report: null
      });
    }
  };

  renderReport() {
    const { report } = this.state;

    if (!report) {
      return (
        <p>
          Generate a year-end report to see totals, interest summaries, and who
          earned the most or least interest.
        </p>
      );
    }

    return (
      <div className="report-block">
        <p>Total Savings: {report.totalSavings}</p>
        <p>Total Loans: {report.totalLoans}</p>
        <p>Highest Interest Member: {report.highestInterestMember}</p>
        <p>Lowest Interest Member: {report.lowestInterestMember}</p>
        <p>Projected Payouts: {report.projectedPayouts}</p>
      </div>
    );
  }

  render() {
    const { groups, selectedGroupId, loading, error } = this.state;

    return (
      <section>
        <h2>Reports</h2>
        <p>Generate year-end views for member returns and interest performance.</p>

        {loading ? (
          <p>Loading report options...</p>
        ) : (
          <form onSubmit={this.handleSubmit}>
            <label htmlFor="selectedGroupId">Group</label>
            <select id="selectedGroupId" value={selectedGroupId} onChange={this.handleChange}>
              <option value="">Select a group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <button type="submit">Generate Report</button>
          </form>
        )}

        <FormMessage error={error} />
        {this.renderReport()}
      </section>
    );
  }
}

export default ReportsPage;
