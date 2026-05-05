import React, { Component } from "react";
import { Link, Navigate } from "react-router-dom";
import FormMessage from "../components/common/FormMessage";
import { AuthContext } from "../context/AuthContext";
import { hasErrors, validateEmail, validateRequired } from "../utils/validators";

class RegisterPage extends Component {
  static contextType = AuthContext;

  state = {
    form: {
      fullName: "",
      email: "",
      password: "",
      role: "member"
    },
    errors: {},
    isSubmitting: false,
    formError: ""
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

  validateForm() {
    const errors = validateRequired(["fullName", "email", "password", "role"], this.state.form);
    const emailError = validateEmail(this.state.form.email);

    if (emailError) {
      errors.email = emailError;
    }

    if (String(this.state.form.password).length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    return errors;
  }

  handleSubmit = async (event) => {
    event.preventDefault();
    const errors = this.validateForm();

    if (hasErrors(errors)) {
      this.setState({ errors, formError: "" });
      return;
    }

    this.setState({ isSubmitting: true, errors: {}, formError: "" });

    try {
      await this.context.register(this.state.form);
    } catch (error) {
      this.setState({ formError: error.message || "Unable to register." });
    } finally {
      this.setState({ isSubmitting: false });
    }
  };

  render() {
    if (this.context.isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }

    const { form, errors, isSubmitting, formError } = this.state;

    return (
      <main className="public-page">
        <h1>Create Account</h1>
        <form onSubmit={this.handleSubmit} noValidate>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            value={form.fullName}
            onChange={this.handleChange}
            aria-invalid={Boolean(errors.fullName)}
          />
          {errors.fullName && <small>{errors.fullName}</small>}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={this.handleChange}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <small>{errors.email}</small>}

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={this.handleChange}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <small>{errors.password}</small>}

          <label htmlFor="role">Role</label>
          <select id="role" name="role" value={form.role} onChange={this.handleChange}>
            <option value="member">Member</option>
            <option value="signatory">Signatory</option>
            <option value="admin">Admin</option>
          </select>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <FormMessage error={formError} />
        <p>
          Already registered? <Link to="/login">Login here</Link>
        </p>
      </main>
    );
  }
}

export default RegisterPage;
