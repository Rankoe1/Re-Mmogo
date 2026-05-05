export function validateRequired(fields, values) {
  const errors = {};

  fields.forEach((field) => {
    if (!String(values[field] || "").trim()) {
      errors[field] = "This field is required.";
    }
  });

  return errors;
}

export function validateEmail(email) {
  if (!email) {
    return "Email is required.";
  }

  const valid = /\S+@\S+\.\S+/.test(email);
  return valid ? "" : "Enter a valid email address.";
}

export function validateMinNumber(value, minimum) {
  if (!value && value !== 0) {
    return "This field is required.";
  }

  return Number(value) >= minimum
    ? ""
    : `Value must be at least ${minimum}.`;
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}
