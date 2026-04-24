import React, { Component } from "react";
import { Link, Navigate } from "react-router-dom";
import FormMessage from "../components/common/FormMessage";
import { AuthContext } from "../context/AuthContext";
import { hasErrors, validateEmail, validateRequired } from "../utils/validators";

class LoginPage extends Component {
  static contextType = AuthContext;

  state = {
    form: {
      email: "",
      password: ""
    },
    errors: {},
    isSubmitting: false,
    formError: "",
    success: ""
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
    const errors = validateRequired(["email", "password"], this.state.form);
    const emailError = validateEmail(this.state.form.email);

    if (emailError) {
      errors.email = emailError;
    }

    return errors;
  }

  handleSubmit = async (event) => {
    event.preventDefault();
    const errors = this.validateForm();

    if (hasErrors(errors)) {
      this.setState({ errors, formError: "", success: "" });
      return;
    }

    this.setState({ isSubmitting: true, errors: {}, formError: "", success: "" });

    try {
      await this.context.login(this.state.form);
      this.setState({ success: "Login successful." });
    } catch (error) {
      this.setState({ formError: error.message || "Unable to login." });
    } finally {
      this.setState({ isSubmitting: false });
    }
  };

  render() {
    if (this.context.isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }

    const { form, errors, isSubmitting, formError, success } = this.state;

    return (
      <main className="public-page">
        <h1>Login</h1>
        <form onSubmit={this.handleSubmit} noValidate>
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

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <FormMessage error={formError} success={success} />
        <p>
          Need an account? <Link to="/register">Register here</Link>
        </p>
      </main>
    );
  }
}

export default LoginPage;
