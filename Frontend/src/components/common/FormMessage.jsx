import React, { Component } from "react";

class FormMessage extends Component {
  render() {
    const { error, success } = this.props;

    if (!error && !success) {
      return null;
    }

    return (
      <p role={error ? "alert" : "status"} className={error ? "message error" : "message success"}>
        {error || success}
      </p>
    );
  }
}

export default FormMessage;
