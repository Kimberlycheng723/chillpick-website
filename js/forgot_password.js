
document.addEventListener("DOMContentLoaded", function() {
  const form = document.getElementById("forgotForm");
  const userEmailDisplay = document.getElementById("userEmailDisplay");
  const emailModal = new bootstrap.Modal(document.getElementById("emailModal"));
  const resendBtn = document.getElementById("resendBtn");

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value;
    if(email) {
      userEmailDisplay.textContent = email;
      emailModal.show();
      
      console.log("Password reset email sent to", email);
    }
  });

  resendBtn.addEventListener("click", function() {
    const email = document.getElementById("forgotEmail").value;
    alert("Resending email to: " + email);
    emailModal.hide();
  });
});
