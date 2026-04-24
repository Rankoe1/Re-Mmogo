import React, { Component } from "react";
import contributionService from "../services/contributionService";
import groupService from "../services/groupService";
import loanService from "../services/loanService";
import memberService from "../services/memberService";

class DashboardPage extends Component {
  state = {
    summary: {
      groups: 0,
      members: 0,
      contributions: 0,
      loans: 0
    },
    error: ""
  };

  async componentDidMount() {
    try {
      const [groups, members, contributions, loans] = await Promise.all([
        groupService.getGroups(),
        memberService.getMembers(),
        contributionService.getContributions(),
        loanService.getLoans()
      ]);

      this.setState({
        summary: {
          groups: groups?.length || 0,
          members: members?.length || 0,
          contributions: contributions?.length || 0,
          loans: loans?.length || 0
        }
      });
    } catch (error) {
      this.setState({
        error: "Dashboard summary will appear once the backend endpoints are connected."
      });
    }
  }

  renderCard(title, value, description) {
    return (
      <article className="card">
        <h2>{title}</h2>
        <p>{value}</p>
        <p>{description}</p>
      </article>
    );
  }

  render() {
    const { summary, error } = this.state;

    return (
      <section>
        <h2>Dashboard</h2>
        <p>Quick overview of the motshelo system.</p>
        {error && <p role="alert">{error}</p>}

        <div className="grid">
          {this.renderCard("Registered Groups", summary.groups, "View and create motshelo groups.")}
          {this.renderCard("Members", summary.members, "Track the people enrolled in groups.")}
          {this.renderCard("Contributions", summary.contributions, "Monitor monthly savings payments.")}
          {this.renderCard("Loans", summary.loans, "Review loans and approval progress.")}
        </div>
      </section>
    );
  }
}

export default DashboardPage;
