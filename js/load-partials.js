// js/load-partials.js
document.addEventListener("DOMContentLoaded", function () {
  // Load header
  fetch("partials/header.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("header").innerHTML = data;

      // ✅ Insert profile image and name after header loads
      const userInfo = JSON.parse(localStorage.getItem("userProfile"));
      if (userInfo) {
        const profilePic = document.querySelector(".profile-pic");
        const userName = document.querySelector(".user-name");

        if (profilePic) profilePic.src = userInfo.profilePic;
        if (userName) userName.textContent = userInfo.name;
      }
    });

  // Load footer if needed
  fetch("partials/footer.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("footer").innerHTML = data;
    });
});
