import React, { Component } from "react";
import FormMessage from "../components/common/FormMessage";
import groupService from "../services/groupService";
import memberService from "../services/memberService";
import { hasErrors, validateEmail, validateRequired } from "../utils/validators";

class MemberPage extends Component {
  state = {
    groups: [],
    members: [],
    form: {
      fullName: "",
      email: "",
      phoneNumber: "",
      groupId: ""
    },
    errors: {},
    loading: true,
    formError: "",
    success: ""
  };

  async componentDidMount() {
    await Promise.all([this.loadGroups(), this.loadMembers()]);
  }

  loadGroups = async () => {
    try {
      const groups = await groupService.getGroups();
      this.setState((current) => ({
        groups: groups || [],
        form: {
          ...current.form,
          groupId: current.form.groupId || groups?.[0]?.id || ""
        }
      }));
    } catch (error) {
      this.setState({ formError: "Groups could not be loaded." });
    }
  };

  loadMembers = async () => {
    try {
      const members = await memberService.getMembers();
      this.setState({ members: members || [], loading: false });
    } catch (error) {
      this.setState({ loading: false, formError: "Unable to load members yet." });
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
    const errors = validateRequired(["fullName", "email", "groupId"], this.state.form);
    const emailError = validateEmail(this.state.form.email);

    if (emailError) {
      errors.email = emailError;
    }

    if (hasErrors(errors)) {
      this.setState({ errors, formError: "", success: "" });
      return;
    }

    try {
      await memberService.createMember(this.state.form);
      this.setState({
        form: {
          fullName: "",
          email: "",
          phoneNumber: "",
          groupId: this.state.form.groupId
        },
        errors: {},
        formError: "",
        success: "Member enrolled successfully."
      });
      this.loadMembers();
    } catch (error) {
      this.setState({ formError: error.message || "Unable to enroll member.", success: "" });
    }
  };

  render() {
    const { groups, members, form, errors, loading, formError, success } = this.state;

    return (
      <section>
        <h2>Members</h2>
        <p>Enroll members into a registered motshelo group.</p>

        <div className="two-column">
          <div>
            <h3>Enroll Member</h3>
            <form onSubmit={this.handleSubmit} noValidate>
              <label htmlFor="fullName">Full Name</label>
              <input id="fullName" name="fullName" value={form.fullName} onChange={this.handleChange} />
              {errors.fullName && <small>{errors.fullName}</small>}

              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={this.handleChange} />
              {errors.email && <small>{errors.email}</small>}

              <label htmlFor="phoneNumber">Phone Number</label>
              <input id="phoneNumber" name="phoneNumber" value={form.phoneNumber} onChange={this.handleChange} />

              <label htmlFor="groupId">Group</label>
              <select id="groupId" name="groupId" value={form.groupId} onChange={this.handleChange}>
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {errors.groupId && <small>{errors.groupId}</small>}

              <button type="submit">Add Member</button>
            </form>

            <FormMessage error={formError} success={success} />
          </div>

          <div>
            <h3>Member List</h3>
            {loading ? (
              <p>Loading members...</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Group</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan="3">No members found.</td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id}>
                        <td>{member.fullName}</td>
                        <td>{member.email}</td>
                        <td>{member.groupName || member.group?.name || member.groupId}</td>
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

export default MemberPage;
