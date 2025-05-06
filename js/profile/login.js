
  const passwordInput = document.getElementById("password");
  const usernameInput = document.getElementById("username");
  const togglePassword = document.getElementById("togglePassword");
  const passwordIcon = document.getElementById("passwordIcon");
  const activeSessionModal = new bootstrap.Modal(document.getElementById('activeSessionModal'));

  togglePassword.addEventListener("click", () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    passwordIcon.classList.toggle("bi-eye");
    passwordIcon.classList.toggle("bi-eye-slash");
  });

  document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const matchedUser = users.find(user => user.username === username && user.password === password);

    if (matchedUser) {
      // Check for active session
      const activeSessions = JSON.parse(localStorage.getItem("activeSessions")) || {};
      const currentSession = activeSessions[matchedUser.email];
      
      if (currentSession) {
        // Show active session modal
        activeSessionModal.show();
        
        // Handle continue button click
        document.getElementById('continueBtn').onclick = function() {
          // Proceed with login (this will overwrite the existing session)
          completeLogin(matchedUser);
          activeSessionModal.hide();
        };
      } else {
        // No active session, proceed with login
        completeLogin(matchedUser);
      }
    } else {
      alert('Invalid username or password.');
    }
  });

  function completeLogin(user) {
    // Create new session data
    const sessionId = 'session_' + Date.now() + Math.random().toString(36).substr(2, 9);
    const sessionData = {
      sessionId: sessionId,
      loginTime: new Date().toISOString(),
      lastActivity: Date.now()
    };
    
    // Update active sessions
    const activeSessions = JSON.parse(localStorage.getItem("activeSessions")) || {};
    activeSessions[user.email] = sessionData;
    localStorage.setItem("activeSessions", JSON.stringify(activeSessions));
    
    // Store current user and session
    localStorage.setItem('currentUser', user.email);
    localStorage.setItem('currentSession', sessionId);
    
    // Redirect to profile page
    window.location.href = 'profile.html';
  }
