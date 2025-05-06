
document.addEventListener('DOMContentLoaded', function () {
// Get current user from localStorage
const currentUserEmail = localStorage.getItem('currentUser');
const users = JSON.parse(localStorage.getItem('users')) || [];
const currentUser = users.find(user => user.email === currentUserEmail);

// Modal elements
const deleteAccountModal = document.getElementById('deleteAccountModal');
const verifyPasswordModal = new bootstrap.Modal(document.getElementById('verifyPasswordModal'));
const verifyPasswordError = document.getElementById('verifyPasswordError');

// Show verify password modal when delete button is clicked
document.getElementById('deleteAccountBtn').addEventListener('click', function () {
  // Reset the modal state
  document.getElementById('verifyPassword').value = '';
  document.getElementById('verifyPassword').classList.remove('is-invalid');
  document.getElementById('verifyPasswordFeedback').textContent = '';
  verifyPasswordError.style.display = 'none';
  
  verifyPasswordModal.show();
});

// Handle password verification
document.getElementById('verifyPasswordBtn').addEventListener('click', function () {
  const passwordInput = document.getElementById('verifyPassword');
  const password = passwordInput.value.trim();
  const feedback = document.getElementById('verifyPasswordFeedback');
  
  // Reset validation state
  passwordInput.classList.remove('is-invalid');
  feedback.textContent = '';
  verifyPasswordError.style.display = 'none';
  
  // Validate password
  if (!password) {
    passwordInput.classList.add('is-invalid');
    feedback.textContent = 'Password is required';
    verifyPasswordError.textContent = 'Password is required.';
    verifyPasswordError.style.display = 'block';
    passwordInput.focus();
    return;
  }
  
  // Check if password matches
  if (password !== currentUser.password) {
    verifyPasswordError.textContent = 'Incorrect password. Please try again.';
    verifyPasswordError.style.display = 'block';
    passwordInput.classList.add('is-invalid');
    passwordInput.value = '';
    passwordInput.focus();
    return;
  }
  
  // Password is correct, proceed to delete confirmation
  verifyPasswordModal.hide();
  
  // Reset and show delete confirmation modal
  document.getElementById('confirmDeleteCheckbox').checked = false;
  document.getElementById('deleteAccountModalBtn').disabled = true;
  deleteAccountModal.classList.add('show'); // This line shows the delete confirmation modal
});

// Make sure delete confirmation modal is hidden when verify modal is closed via cancel
verifyPasswordModal._element.addEventListener('hidden.bs.modal', function() {
  // Only hide delete modal if it was shown after verification
  if (!document.getElementById('verifyPassword').value) {
    deleteAccountModal.classList.remove('show');
  }
});

// Enable/disable delete button based on checkbox
document.getElementById('confirmDeleteCheckbox').addEventListener('change', function () {
  document.getElementById('deleteAccountModalBtn').disabled = !this.checked;
});

// Close modal when clicking No
document.getElementById('noDeleteAccountModalBtn').addEventListener('click', function () {
  deleteAccountModal.classList.remove('show');
});

// Close modal when clicking outside
deleteAccountModal.addEventListener('click', function (e) {
  if (e.target === deleteAccountModal) {
    deleteAccountModal.classList.remove('show');
  }
});

// Handle account deletion
document.getElementById('deleteAccountModalBtn').addEventListener('click', function () {
  if (document.getElementById('confirmDeleteCheckbox').checked) {
    // Remove user from users array
    const updatedUsers = users.filter(user => user.email !== currentUser.email);
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Remove all user-related data
    localStorage.removeItem('currentUser');
    localStorage.removeItem(`profile_${currentUser.email}`);
    localStorage.removeItem('currentSession');
    localStorage.removeItem('activeSessions');

    // Close modal and redirect
    deleteAccountModal.classList.remove('show');
    window.location.href = 'register.html';
  }
});





    // Profile Picture Upload Functionality
    const uploadPicModal = new bootstrap.Modal(document.getElementById('uploadPicModal'));
    const profileImageInput = document.getElementById('profileImageInput');
    const imagePreview = document.getElementById('imagePreview');
    const profilePicture = document.getElementById('profilePicture');

    // Open upload modal
    document.getElementById('uploadPicBtn').addEventListener('click', function () {
      // Reset the input and preview
      profileImageInput.value = '';
      imagePreview.src = profilePicture.src;
      uploadPicModal.show();
    });

    // Preview image when file is selected
    profileImageInput.addEventListener('change', function () {
      const file = this.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
          alert('File size should be less than 2MB');
          this.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          imagePreview.src = e.target.result;
        }
        reader.readAsDataURL(file);
      }
    });

    // Save profile picture
    document.getElementById('saveProfilePicBtn').addEventListener('click', function () {
      const file = profileImageInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          // Update profile picture
          profilePicture.src = e.target.result;
          imagePreview.src = e.target.result;

          // Save to localStorage
          const currentUserEmail = localStorage.getItem('currentUser');
          if (currentUserEmail) {
            const profileData = JSON.parse(localStorage.getItem(`profile_${currentUserEmail}`)) || {};
            profileData.profilePicture = e.target.result;
            localStorage.setItem(`profile_${currentUserEmail}`, JSON.stringify(profileData));
          }

          uploadPicModal.hide();
          showSuccessModal();
        }
        reader.readAsDataURL(file);
      } else {
        alert('Please select an image first');
      }
    });

    // Load saved profile picture if exists
    if (currentUserEmail) {
      const profileData = JSON.parse(localStorage.getItem(`profile_${currentUserEmail}`)) || {};
      if (profileData.profilePicture) {
        profilePicture.src = profileData.profilePicture;
      }
    }
  });
</script>


<script>
  document.addEventListener('DOMContentLoaded', function () {
    // Timeout settings (in milliseconds)
    const TOTAL_SESSION_TIME = 3 * 60 * 1000; // 3 minutes total session
    const WARNING_TIME = 2 * 60 * 1000; // Show warning at 2 minutes (1 minute left)
    const COUNTDOWN_INTERVAL = 1000; // Update every second
    const EXPIRE_DISPLAY_TIME = 10 * 1000; // Show expired message for 10 seconds

    let sessionTimer;
    let warningTimer;
    let countdownInterval;
    let expireTimer;

    // Initialize modals
    const expiringModal = new bootstrap.Modal(document.getElementById('sessionExpiringModal'), {
      backdrop: 'static',
      keyboard: false
    });

    const expiredModal = new bootstrap.Modal(document.getElementById('sessionExpiredModal'), {
      backdrop: 'static',
      keyboard: false
    });

    // Start fresh session
    startSession();

    function startSession() {
      // Clear any existing timers
      resetTimers();

      // Set new timers
      warningTimer = setTimeout(showExpiringWarning, WARNING_TIME);
      sessionTimer = setTimeout(expireSession, TOTAL_SESSION_TIME);

      // Mark session as active in localStorage
      localStorage.setItem('sessionActive', 'true');
    }

    function showExpiringWarning() {
      expiringModal.show();

      // Start 1 minute countdown (60 seconds)
      let secondsLeft = (TOTAL_SESSION_TIME - WARNING_TIME) / 1000;
      updateCountdownDisplay(secondsLeft);

      countdownInterval = setInterval(() => {
        secondsLeft--;
        updateCountdownDisplay(secondsLeft);

        if (secondsLeft <= 0) {
          clearInterval(countdownInterval);
        }
      }, COUNTDOWN_INTERVAL);
    }

    function updateCountdownDisplay(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      document.getElementById('countdown').textContent =
        `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function expireSession() {
      // Hide warning modal if shown
      expiringModal.hide();
      clearInterval(countdownInterval);

      clearSession();

      // Show expired modal
      expiredModal.show();

      // Auto-redirect after display time
      expireTimer = setTimeout(() => {
        window.location.href = 'login.html';
      }, EXPIRE_DISPLAY_TIME);
    }

    function forceLogout() {
      // Immediate logout without showing expired message
      clearSession();
      expiringModal.hide();
      window.location.href = 'login.html';
    }

    function clearSession() {
      // Remove all session-related data
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentSession');
      localStorage.removeItem('activeSessions');
      resetTimers();
    }



    function resetTimers() {
      clearTimeout(sessionTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      clearTimeout(expireTimer);
    }

    // Activity detection - reset on any user activity
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, startSession, { passive: true });
    });

    // Button handlers
    document.getElementById('stayLoggedInBtn').addEventListener('click', function () {
      startSession();
      expiringModal.hide();
    });

    document.getElementById('logoutNowBtn').addEventListener('click', forceLogout);

    document.getElementById('loginAgainBtn').addEventListener('click', function () {
      clearSession();
      window.location.href = 'login.html';
    });
  });
