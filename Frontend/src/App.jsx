import React, { Component } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import GroupPage from "./pages/GroupPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import LoanPage from "./pages/LoanPage";
import MemberPage from "./pages/MemberPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import ReportsPage from "./pages/ReportsPage";
import ContributionPage from "./pages/ContributionPage";

class App extends Component {
  renderProtectedPage(page) {
    return (
      <ProtectedRoute>
        <AppLayout>{page}</AppLayout>
      </ProtectedRoute>
    );
  }

  render() {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={this.renderProtectedPage(<DashboardPage />)}
        />
        <Route
          path="/groups"
          element={this.renderProtectedPage(<GroupPage />)}
        />
        <Route
          path="/members"
          element={this.renderProtectedPage(<MemberPage />)}
        />
        <Route
          path="/contributions"
          element={this.renderProtectedPage(<ContributionPage />)}
        />
        <Route path="/loans" element={this.renderProtectedPage(<LoanPage />)} />
        <Route
          path="/reports"
          element={this.renderProtectedPage(<ReportsPage />)}
        />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    );
  }
}

export default App;
