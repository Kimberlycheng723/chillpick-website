  const passwordInput = document.getElementById("password");
  const usernameInput = document.getElementById("username");
  const togglePassword = document.getElementById("togglePassword");
  const passwordIcon = document.getElementById("passwordIcon");
  const activeSessionModal = new bootstrap.Modal(document.getElementById('activeSessionModal'));
  const continueBtn = document.getElementById('continueBtn');

  let matchedUser = null;

  // Toggle password visibility
  togglePassword.addEventListener("click", () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    passwordIcon.classList.toggle("bi-eye");
    passwordIcon.classList.toggle("bi-eye-slash");
  });

  // Form submission
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    const users = JSON.parse(localStorage.getItem("users")) || [];
    matchedUser = users.find(user => user.username === username && user.password === password);

    if (matchedUser) {
      const activeSessions = JSON.parse(localStorage.getItem("activeSessions")) || {};
      const currentSession = activeSessions[matchedUser.email];

      if (currentSession) {
        // Show the modal if session exists
        activeSessionModal.show();
      } else {
        completeLogin(matchedUser);
      }
    } else {
      alert('Invalid username or password.');
    }
  });

  // Continue button to override active session
  continueBtn.addEventListener("click", () => {
    if (matchedUser) {
      completeLogin(matchedUser);
      activeSessionModal.hide();
    } else {
      alert("User session expired. Please log in again.");
    }
  });

  function completeLogin(user) {
    const sessionId = 'session_' + Date.now() + Math.random().toString(36).substr(2, 9);
    const sessionData = {
      sessionId: sessionId,
      loginTime: new Date().toISOString(),
      lastActivity: Date.now()
    };

    const activeSessions = JSON.parse(localStorage.getItem("activeSessions")) || {};
    activeSessions[user.email] = sessionData;
    localStorage.setItem("activeSessions", JSON.stringify(activeSessions));

    localStorage.setItem("currentUser", user.email);
    localStorage.setItem("currentSession", sessionId);

    // Debug
    console.log("✅ Login complete. Redirecting to /account/profile");

    // Redirect
    window.location.href = "/account/profile";
  }
