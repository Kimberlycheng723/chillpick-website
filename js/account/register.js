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
usernameInput.addEventListener("input", function() {
  const username = this.value.trim();
  const users = JSON.parse(localStorage.getItem("users")) || [];
  
  if (!validateUsername(username)) {
    usernameMessage.textContent = "Username must be 3-20 characters (letters, numbers, underscores)";
    return;
  }
  
  if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    usernameMessage.textContent = "Username already taken";
  } else {
    usernameMessage.textContent = "";
  }
});

// Real-time email validation
emailInput.addEventListener("input", () => {
  const email = emailInput.value.trim().toLowerCase();
  const users = JSON.parse(localStorage.getItem("users")) || [];

  if (!validateEmail(email)) {
    emailMessage.textContent = "Please enter a valid email address.";
  } else if (users.some(user => user.email.toLowerCase() === email)) {
    emailMessage.textContent = "Email already registered. Please use another.";
  } else {
    emailMessage.textContent = "";
  }
});

// Real-time password validation
passwordInput.addEventListener("input", () => {
  if (!validatePassword(passwordInput.value)) {
    passwordMessage.textContent = "Password must be at least 6 characters, include an uppercase letter, a lowercase letter, and a number.";
  } else {
    passwordMessage.textContent = "";
  }
});

// Form submission
document.getElementById("registerForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;

  const users = JSON.parse(localStorage.getItem("users")) || [];

  if (!validateUsername(username)) {
    usernameMessage.textContent = "Username must be 3-20 characters (letters, numbers, underscores)";
    return;
  }

  if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    usernameMessage.textContent = "Username already taken";
    return;
  }

  if (!validateEmail(email)) {
    emailMessage.textContent = "Please enter a valid email address.";
    return;
  }

  if (users.some(user => user.email.toLowerCase() === email)) {
    emailMessage.textContent = "Email already registered. Please use another.";
    return;
  }

  if (!validatePassword(password)) {
    passwordMessage.textContent = "Password must be at least 6 characters, include an uppercase letter, a lowercase letter, and a number.";
    return;
  }

  // Save new user
  const newUser = { username, email, phone, password };
  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  userEmailDisplay.textContent = email;
  const popup = new bootstrap.Modal(document.getElementById("emailModal"));
  popup.show();

  // Optional: clear form after registration
  document.getElementById("registerForm").reset();
});
