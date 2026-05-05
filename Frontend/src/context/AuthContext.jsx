import React, { Component, createContext } from "react";
import authService from "../services/authService";

const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  token: null,
  login: async () => { },
  register: async () => { },
  logout: () => { }
});

class AuthProvider extends Component {
  constructor(props) {
    super(props);
    const storedSession = authService.getStoredSession();
    this.state = {
      isAuthenticated: Boolean(storedSession?.token),
      user: storedSession?.user || null,
      token: storedSession?.token || null
    };
  }

  login = async (credentials) => {
    const session = await authService.login(credentials);
    this.setState({
      isAuthenticated: true,
      user: session.user,
      token: session.token
    });
    return session;
  };

  register = async (payload) => {
    const session = await authService.register({
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role
    });
    this.setState({
      isAuthenticated: true,
      user: session.user,
      token: session.token
    });
    return session;
  };

  logout = () => {
    authService.logout();
    this.setState({
      isAuthenticated: false,
      user: null,
      token: null
    });
  };

  render() {
    const value = {
      ...this.state,
      login: this.login,
      register: this.register,
      logout: this.logout
    };

    return (
      <AuthContext.Provider value={value}>{this.props.children}</AuthContext.Provider>
    );
  }
}

export { AuthContext, AuthProvider };
