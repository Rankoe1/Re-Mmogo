import React, { Component } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

class ProtectedRoute extends Component {
  static contextType = AuthContext;

  render() {
    return this.context.isAuthenticated ? this.props.children : <Navigate to="/login" replace />;
  }
}

export default ProtectedRoute;
