document.addEventListener('DOMContentLoaded', function () {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("currentSession");
        localStorage.removeItem("activeSessions");
  
        window.location.href = "/";
      });
    }
  });