import React, { Component } from "react";
import FormMessage from "../components/common/FormMessage";
import loanService from "../services/loanService";
import memberService from "../services/memberService";
import { hasErrors, validateMinNumber, validateRequired } from "../utils/validators";

class LoanPage extends Component {
  state = {
    members: [],
    loans: [],
    form: {
      memberId: "",
      amount: "",
      reason: "",
      requestedDate: "",
      signatoryOneApproved: false,
      signatoryTwoApproved: false
    },
    errors: {},
    loading: true,
    formError: "",
    success: ""
  };

  async componentDidMount() {
    await Promise.all([this.loadMembers(), this.loadLoans()]);
  }

  loadMembers = async () => {
    try {
      const members = await memberService.getMembers();
      this.setState((current) => ({
        members: members || [],
        form: {
          ...current.form,
          memberId: current.form.memberId || members?.[0]?.id || ""
        }
      }));
    } catch (error) {
      this.setState({ formError: "Members could not be loaded." });
    }
  };

  loadLoans = async () => {
    try {
      const loans = await loanService.getLoans();
      this.setState({ loans: loans || [], loading: false });
    } catch (error) {
      this.setState({ loading: false, formError: "Loan data is waiting for backend connection." });
    }
  };

  handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    this.setState((current) => ({
      form: {
        ...current.form,
        [name]: type === "checkbox" ? checked : value
      }
    }));
  };

  handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateRequired(["memberId", "amount", "reason", "requestedDate"], this.state.form);
    const amountError = validateMinNumber(this.state.form.amount, 1);

    if (amountError) {
      errors.amount = amountError;
    }

    if (hasErrors(errors)) {
      this.setState({ errors, formError: "", success: "" });
      return;
    }

    try {
      await loanService.createLoan(this.state.form);
      this.setState({
        form: {
          ...this.state.form,
          amount: "",
          reason: "",
          requestedDate: "",
          signatoryOneApproved: false,
          signatoryTwoApproved: false
        },
        errors: {},
        formError: "",
        success: "Loan request submitted. Backend approval can enforce the two-signatory rule."
      });
      this.loadLoans();
    } catch (error) {
      this.setState({ formError: error.message || "Unable to create loan.", success: "" });
    }
  };

  render() {
    const { members, loans, form, errors, loading, formError, success } = this.state;

    return (
      <section>
        <h2>Loans</h2>
        <p>Record loans for members and keep approval fields ready for signatory workflows.</p>

        <div className="two-column">
          <div>
            <h3>Create Loan</h3>
            <form onSubmit={this.handleSubmit} noValidate>
              <label htmlFor="memberId">Member</label>
              <select id="memberId" name="memberId" value={form.memberId} onChange={this.handleChange}>
                <option value="">Select a member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
              {errors.memberId && <small>{errors.memberId}</small>}

              <label htmlFor="amount">Loan Amount</label>
              <input id="amount" name="amount" type="number" value={form.amount} onChange={this.handleChange} />
              {errors.amount && <small>{errors.amount}</small>}

              <label htmlFor="reason">Reason</label>
              <textarea id="reason" name="reason" value={form.reason} onChange={this.handleChange} />
              {errors.reason && <small>{errors.reason}</small>}

              <label htmlFor="requestedDate">Request Date</label>
              <input id="requestedDate" name="requestedDate" type="date" value={form.requestedDate} onChange={this.handleChange} />
              {errors.requestedDate && <small>{errors.requestedDate}</small>}

              <fieldset>
                <legend>Approval Snapshot</legend>
                <label>
                  <input
                    type="checkbox"
                    name="signatoryOneApproved"
                    checked={form.signatoryOneApproved}
                    onChange={this.handleChange}
                  />
                  First signatory approved
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="signatoryTwoApproved"
                    checked={form.signatoryTwoApproved}
                    onChange={this.handleChange}
                  />
                  Second signatory approved
                </label>
              </fieldset>

              <button type="submit">Save Loan</button>
            </form>

            <FormMessage error={formError} success={success} />
          </div>

          <div>
            <h3>Loan List</h3>
            {loading ? (
              <p>Loading loans...</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan="3">No loans found.</td>
                    </tr>
                  ) : (
                    loans.map((loan) => (
                      <tr key={loan.id}>
                        <td>{loan.memberName}</td>
                        <td>{loan.amount}</td>
                        <td>{loan.status || "Pending"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    );
  }
}

export default LoanPage;
