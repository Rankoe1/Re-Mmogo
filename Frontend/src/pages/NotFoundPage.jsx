import React, { Component } from "react";
import { Link } from "react-router-dom";

class NotFoundPage extends Component {
  render() {
    return (
      <main className="public-page">
        <h1>Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link to="/">Return Home</Link>
      </main>
    );
  }
}

export default NotFoundPage;
