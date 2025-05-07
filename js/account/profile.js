document.addEventListener('DOMContentLoaded', function () {
  // Get current user from localStorage
  const currentUserEmail = localStorage.getItem('currentUser');
  const users = JSON.parse(localStorage.getItem('users')) || [];
  const currentUser = users.find(user => user.email === currentUserEmail);

  if (!currentUser) {
    alert('Please login first');
    window.location.href = '/account/login';
    return;
  }

  // Load user data
  document.getElementById('welcomeMessage').textContent = `Welcome back, ${currentUser.username}`;
  document.getElementById('profileName').textContent = currentUser.username;
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('usernameField').value = currentUser.username;
  document.getElementById('emailField').value = currentUser.email;
  document.getElementById('phoneField').value = currentUser.phone || '';


  // And add this profile data loading section
  const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`)) || {};
  if (profileData.gender) {
    document.getElementById('genderField').value = profileData.gender;
  }
  if (profileData.bio) {
    document.getElementById('bioText').textContent = profileData.bio;
    document.getElementById('bioText').classList.remove('bio-placeholder');
  }
  if (profileData.phone) {
    document.getElementById('phoneField').value = profileData.phone;
  }

  // Modal functionality
  const successModal = document.getElementById('successModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  function showSuccessModal() {
    successModal.classList.add('show');
  }

  function hideSuccessModal() {
    successModal.classList.remove('show');
  }

  closeModalBtn.addEventListener('click', hideSuccessModal);
  successModal.addEventListener('click', function (e) {
    if (e.target === successModal) hideSuccessModal();
  });

  // Bio Editor
  const bioDisplay = document.getElementById('bioDisplay');
  const bioEdit = document.getElementById('bioEdit');
  const bioText = document.getElementById('bioText');
  const bioInput = document.getElementById('bioInput');

  document.getElementById('editBioBtn').addEventListener('click', function () {
    bioDisplay.classList.add('d-none');
    bioEdit.classList.remove('d-none');
    bioInput.value = bioText.classList.contains('bio-placeholder') ? '' : bioText.textContent;
    bioInput.focus();
  });

  document.getElementById('saveBioBtn').addEventListener('click', function () {
    const newBio = bioInput.value.trim();
    if (newBio) {
      bioText.textContent = newBio;
      bioText.classList.remove('bio-placeholder');
    } else {
      bioText.textContent = 'Add your bio...';
      bioText.classList.add('bio-placeholder');
    }

    // Save to profile data
    const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`)) || {};
    profileData.bio = newBio || null;
    localStorage.setItem(`profile_${currentUser.email}`, JSON.stringify(profileData));

    bioDisplay.classList.remove('d-none');
    bioEdit.classList.add('d-none');
    showSuccessModal();
  });

  document.getElementById('cancelBioBtn').addEventListener('click', function () {
    bioDisplay.classList.remove('d-none');
    bioEdit.classList.add('d-none');
  });

  // Edit/Save toggle
  const editBtn = document.getElementById('editBtn');
  editBtn.addEventListener('click', function () {
    const isEditMode = this.textContent === 'Edit';

    document.querySelectorAll('.form-control').forEach(input => {
      if (input.id !== 'emailField' && input.id !== 'usernameField') {
        input.readOnly = !isEditMode;
      }
    });

    document.getElementById('genderField').disabled = !isEditMode;

    if (isEditMode) {
      this.textContent = 'Save';
      this.classList.remove('btn-outline-orange');
      this.classList.add('btn-orange');
    } else {
      this.textContent = 'Edit';
      this.classList.add('btn-outline-orange');
      this.classList.remove('btn-orange');

      // Save profile data
      const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`)) || {};
      profileData.phone = document.getElementById('phoneField').value.trim();
      profileData.gender = document.getElementById('genderField').value;
      localStorage.setItem(`profile_${currentUser.email}`, JSON.stringify(profileData));

      showSuccessModal();
    }
  });

  // Change Password Functionality
  const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
  const changePasswordForm = document.getElementById('changePasswordForm');
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  // Toggle password visibility
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function () {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = this.querySelector('i');

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
      } else {
        input.type = 'password';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
      }
    });
  });

  document.getElementById('changePasswordBtn').addEventListener('click', function () {
    changePasswordModal.show();
    changePasswordForm.reset();

    // Reset all fields and validation states
    [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
      input.type = 'password';
      input.classList.remove('is-invalid');
      const icon = document.querySelector(`.toggle-password[data-target="${input.id}"] i`);
      if (icon) {
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
      }
    });

    // Clear any error messages
    document.querySelectorAll('.invalid-feedback').forEach(el => {
      el.textContent = '';
    });
  });

  document.getElementById('savePasswordBtn').addEventListener('click', function () {
    // Reset validation states
    [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
      input.classList.remove('is-invalid');
      const feedback = document.getElementById(`${input.id}Feedback`);
      if (feedback) feedback.style.display = 'none';
    });

    // Get values
    const currentPassword = currentPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    let isValid = true;

    // Validate current password
    if (!currentPassword) {
      currentPasswordInput.classList.add('is-invalid');
      document.getElementById('currentPasswordFeedback').style.display = 'block';
      document.getElementById('currentPasswordFeedback').textContent = 'Current password is required';
      isValid = false;
    } else if (currentUser.password !== currentPassword) {
      currentPasswordInput.classList.add('is-invalid');
      document.getElementById('currentPasswordFeedback').style.display = 'block';
      document.getElementById('currentPasswordFeedback').textContent = 'Current password is incorrect';
      isValid = false;
    }

    // Validate new password
    if (!newPassword) {
      newPasswordInput.classList.add('is-invalid');
      document.getElementById('newPasswordFeedback').style.display = 'block';
      document.getElementById('newPasswordFeedback').textContent = 'New password is required';
      isValid = false;
    } else if (newPassword.length < 8) {
      newPasswordInput.classList.add('is-invalid');
      document.getElementById('newPasswordFeedback').style.display = 'block';
      document.getElementById('newPasswordFeedback').textContent = 'Password must be at least 8 characters';
      isValid = false;
    } else if (!/[A-Z]/.test(newPassword)) {
      newPasswordInput.classList.add('is-invalid');
      document.getElementById('newPasswordFeedback').style.display = 'block';
      document.getElementById('newPasswordFeedback').textContent = 'Password must contain at least 1 uppercase letter';
      isValid = false;
    } else if (!/[a-z]/.test(newPassword)) {
      newPasswordInput.classList.add('is-invalid');
      document.getElementById('newPasswordFeedback').style.display = 'block';
      document.getElementById('newPasswordFeedback').textContent = 'Password must contain at least 1 lowercase letter';
      isValid = false;
    } else if (!/[0-9]/.test(newPassword)) {
      newPasswordInput.classList.add('is-invalid');
      document.getElementById('newPasswordFeedback').style.display = 'block';
      document.getElementById('newPasswordFeedback').textContent = 'Password must contain at least 1 digit';
      isValid = false;
    } else if (newPassword === currentPassword) {
      newPasswordInput.classList.add('is-invalid');
      document.getElementById('newPasswordFeedback').style.display = 'block';
      document.getElementById('newPasswordFeedback').textContent = 'New password must be different from current password';
      isValid = false;
    }

    // Validate confirm password
    if (!confirmPassword) {
      confirmPasswordInput.classList.add('is-invalid');
      document.getElementById('confirmPasswordFeedback').style.display = 'block';
      document.getElementById('confirmPasswordFeedback').textContent = 'Please confirm your new password';
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      confirmPasswordInput.classList.add('is-invalid');
      document.getElementById('confirmPasswordFeedback').style.display = 'block';
      document.getElementById('confirmPasswordFeedback').textContent = 'Passwords do not match';
      isValid = false;
    }

    if (isValid) {
      // Update password in users array
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const userIndex = users.findIndex(user => user.email === currentUser.email);

      if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));

        // Update currentUser in memory
        currentUser.password = newPassword;

        // Show success message and close modal
        changePasswordModal.hide();
        showSuccessModal();
      }
    }

  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', function () {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentSession');
      localStorage.removeItem('activeSessions');
      window.location.href = '/account/login';
    }
  });


});



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
  window.location.href = '/account/register';
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
      window.location.href = '/acocunt/login';
    }, EXPIRE_DISPLAY_TIME);
  }

  function forceLogout() {
    // Immediate logout without showing expired message
    clearSession();
    expiringModal.hide();
    window.location.href = '/acocunt/login';
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
    window.location.href = '/account/login';
  });
});