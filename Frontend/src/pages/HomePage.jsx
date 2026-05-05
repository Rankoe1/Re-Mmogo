import React, { Component } from "react";
import { Link } from "react-router-dom";

class HomePage extends Component {
  render() {
    return (
      <main className="public-page">
        <h1>Re-Mmogo WebApp</h1>
        <p>
          A simple WebApp for managing motshelo groups, members, loans,
          contributions, balances, and reports.
        </p>
        <div className="action-row">
          <Link to="/login">Login</Link>
          <Link to="/register">Create Account</Link>
        </div>
      </main>
    );
  }
}

export default HomePage;
