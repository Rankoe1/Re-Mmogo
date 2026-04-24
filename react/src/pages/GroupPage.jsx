import React, { Component } from "react";
import FormMessage from "../components/common/FormMessage";
import groupService from "../services/groupService";
import { hasErrors, validateRequired } from "../utils/validators";

class GroupPage extends Component {
  state = {
    groups: [],
    form: {
      name: "",
      description: "",
      monthlyContribution: "1000",
      yearlyInterestTarget: "5000",
      signatoryOne: "",
      signatoryTwo: ""
    },
    errors: {},
    loading: true,
    formError: "",
    success: ""
  };

  componentDidMount() {
    this.loadGroups();
  }

  loadGroups = async () => {
    this.setState({ loading: true });

    try {
      const groups = await groupService.getGroups();
      this.setState({ groups: groups || [], loading: false });
    } catch (error) {
      this.setState({ loading: false, formError: "Unable to load groups yet." });
    }
  };

  handleChange = (event) => {
    const { name, value } = event.target;
    this.setState((current) => ({
      form: {
        ...current.form,
        [name]: value
      }
    }));
  };

  handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateRequired(
      ["name", "monthlyContribution", "yearlyInterestTarget", "signatoryOne", "signatoryTwo"],
      this.state.form
    );

    if (this.state.form.signatoryOne === this.state.form.signatoryTwo) {
      errors.signatoryTwo = "Choose a different second signatory.";
    }

    if (hasErrors(errors)) {
      this.setState({ errors, formError: "", success: "" });
      return;
    }

    try {
      await groupService.createGroup(this.state.form);
      this.setState({
        form: {
          name: "",
          description: "",
          monthlyContribution: "1000",
          yearlyInterestTarget: "5000",
          signatoryOne: "",
          signatoryTwo: ""
        },
        errors: {},
        formError: "",
        success: "Group registered successfully."
      });
      this.loadGroups();
    } catch (error) {
      this.setState({ formError: error.message || "Unable to create group.", success: "" });
    }
  };

  render() {
    const { groups, form, errors, loading, formError, success } = this.state;

    return (
      <section>
        <h2>Groups</h2>
        <p>Register motshelo groups and keep signatory details ready for approvals.</p>

        <div className="two-column">
          <div>
            <h3>Register Group</h3>
            <form onSubmit={this.handleSubmit} noValidate>
              <label htmlFor="name">Group Name</label>
              <input id="name" name="name" value={form.name} onChange={this.handleChange} />
              {errors.name && <small>{errors.name}</small>}

              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" value={form.description} onChange={this.handleChange} />

              <label htmlFor="monthlyContribution">Monthly Contribution</label>
              <input
                id="monthlyContribution"
                name="monthlyContribution"
                type="number"
                value={form.monthlyContribution}
                onChange={this.handleChange}
              />

              <label htmlFor="yearlyInterestTarget">Yearly Interest Target</label>
              <input
                id="yearlyInterestTarget"
                name="yearlyInterestTarget"
                type="number"
                value={form.yearlyInterestTarget}
                onChange={this.handleChange}
              />

              <label htmlFor="signatoryOne">First Signatory</label>
              <input id="signatoryOne" name="signatoryOne" value={form.signatoryOne} onChange={this.handleChange} />
              {errors.signatoryOne && <small>{errors.signatoryOne}</small>}

              <label htmlFor="signatoryTwo">Second Signatory</label>
              <input id="signatoryTwo" name="signatoryTwo" value={form.signatoryTwo} onChange={this.handleChange} />
              {errors.signatoryTwo && <small>{errors.signatoryTwo}</small>}

              <button type="submit">Save Group</button>
            </form>

            <FormMessage error={formError} success={success} />
          </div>

          <div>
            <h3>Existing Groups</h3>
            {loading ? (
              <p>Loading groups...</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contribution</th>
                    <th>Interest Target</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan="3">No groups found.</td>
                    </tr>
                  ) : (
                    groups.map((group) => (
                      <tr key={group.id}>
                        <td>{group.name}</td>
                        <td>{group.monthlyContribution}</td>
                        <td>{group.yearlyInterestTarget}</td>
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

export default GroupPage;
