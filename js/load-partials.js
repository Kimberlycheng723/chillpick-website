window.addEventListener('DOMContentLoaded', () => {
    fetch('partials/header.html')
      .then(res => res.text())
      .then(data => {
        document.getElementById('header').innerHTML = data;
      });
  
    fetch('partials/footer.html')
      .then(res => res.text())
      .then(data => {
        document.getElementById('footer').innerHTML = data;
      });http://127.0.0.1:3000/dashboard.html#
  }
    );
  