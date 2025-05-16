// DOM Elements
const emailInput = document.getElementById("email");
const usernameInput = document.getElementById("username");
const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const passwordIcon = document.getElementById("passwordIcon");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const emailMessage = document.getElementById("emailMessage");
const passwordMessage = document.getElementById("passwordMessage");
const usernameMessage = document.getElementById("usernameMessage");

let lastRegisteredEmail = null; // To store the last registered email

// On page load: retrieve last registered email from localStorage
document.addEventListener("DOMContentLoaded", () => {
  const storedEmail = localStorage.getItem("lastRegisteredEmail");
  if (storedEmail) {
    lastRegisteredEmail = storedEmail;
  }
});

// Validators
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
  return regex.test(password);
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// Toggle password visibility
togglePassword.addEventListener("click", () => {
  passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  passwordIcon.classList.toggle("bi-eye");
  passwordIcon.classList.toggle("bi-eye-slash");
});

// Real-time username validation
usernameInput.addEventListener("input", checkUsernameAvailability);

async function checkUsernameAvailability() {
  const username = usernameInput.value.trim();
  if (!validateUsername(username)) {
    usernameMessage.textContent = "Username must be 3-20 characters (letters, numbers, underscores)";
    return;
  }

  try {
    const res = await fetch("/account/check-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();
    usernameMessage.textContent = data.exists ? "Username already taken." : "";
  } catch (err) {
    console.error("Username check failed:", err);
  }
}

// Real-time email validation
emailInput.addEventListener("input", checkEmailAvailability);

async function checkEmailAvailability() {
  const email = emailInput.value.trim().toLowerCase();
  if (!validateEmail(email)) {
    emailMessage.textContent = "Please enter a valid email address.";
    return;
  }

  try {
    const res = await fetch("/account/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    emailMessage.textContent = data.exists ? "Email is already registered." : "";
  } catch (err) {
    console.error("Email check failed:", err);
  }
}

// Real-time password validation
passwordInput.addEventListener("input", () => {
  if (!validatePassword(passwordInput.value)) {
    passwordMessage.textContent =
      "Password must be at least 6 characters, include an uppercase letter, a lowercase letter, and a number.";
  } else {
    passwordMessage.textContent = "";
  }
});

// Form submission
document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;

  let valid = true;

  if (!validateUsername(username)) {
    usernameMessage.textContent = "Username must be 3-20 characters (letters, numbers, underscores)";
    valid = false;
  }

  if (!validateEmail(email)) {
    emailMessage.textContent = "Please enter a valid email address.";
    valid = false;
  }

  if (!validatePassword(password)) {
    passwordMessage.textContent =
      "Password must be at least 6 characters, include an uppercase letter, a lowercase letter, and a number.";
    valid = false;
  }

  if (!valid) return;

  try {
    const response = await fetch("/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, phone, password }),
    });

    const result = await response.json();

    if (response.ok) {
      lastRegisteredEmail = email;
      localStorage.setItem("lastRegisteredEmail", email);
      userEmailDisplay.textContent = email;

      const popup = new bootstrap.Modal(document.getElementById("emailModal"));
      popup.show();

      document.getElementById("registerForm").reset();
    } else {
      if (result.message === "Username already exists.") {
        usernameMessage.textContent = result.message;
      } else if (result.message === "Email already exists.") {
        emailMessage.textContent = result.message;
      } else {
        alert("Registration failed: " + result.message);
      }
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Something went wrong. Please try again later.");
  }
});

// Resend verification email
document.getElementById("resendEmailBtn").addEventListener("click", async () => {
  console.log("Resend button clicked");

  if (!lastRegisteredEmail) {
    alert("Missing email for resend.");
    return;
  }

  try {
    console.log("Sending resend request for:", lastRegisteredEmail);
    const response = await fetch("/account/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lastRegisteredEmail }),
    });

    const result = await response.json();

    if (response.ok) {
      alert("Verification email resent!");
    } else {
      alert("Resend failed: " + result.message);
    }
  } catch (error) {
    console.error("Resend error:", error);
    alert("Error while resending email.");
  }
});
