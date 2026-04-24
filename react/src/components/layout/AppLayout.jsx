import React, { Component } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

class AppLayout extends Component {
  static contextType = AuthContext;

  render() {
    const { user, logout } = this.context;

    return (
      <div className="app-shell">
        <header className="app-header">
          <div>
            <h1>Re-Mmogo</h1>
            <p>Manage your motshelo groups in one place.</p>
          </div>
          <div>
            <p>{user?.fullName || user?.email || "Signed in"}</p>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <nav aria-label="Primary navigation" className="app-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/groups">Groups</NavLink>
          <NavLink to="/members">Members</NavLink>
          <NavLink to="/contributions">Contributions</NavLink>
          <NavLink to="/loans">Loans</NavLink>
          <NavLink to="/reports">Reports</NavLink>
        </nav>

        <main className="app-main">{this.props.children}</main>
      </div>
    );
  }
}

export default AppLayout;
