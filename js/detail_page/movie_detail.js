document.addEventListener('DOMContentLoaded', function () {
  fetch('/partials/header')
    .then(res => res.text())
    .then(data => {
      document.getElementById('header').innerHTML = data;
    });

  fetch('/partials/footer')
    .then(res => res.text())
    .then(data => {
      document.getElementById('footer').innerHTML = data;
    });
});

// Show Write Review form
document.getElementById('writeReviewBtn').addEventListener('click', function () {
  document.getElementById('reviewForm').classList.toggle('d-none');
});

// Handle star rating selection
document.querySelectorAll('#ratingInput i').forEach(star => {
  star.addEventListener('click', function () {
    let rating = this.getAttribute('data-value');
    document.querySelectorAll('#ratingInput i').forEach(s => {
      s.classList.remove('active');
      if (s.getAttribute('data-value') <= rating) {
        s.classList.add('active');
      }
    });
  });
});

// Blur/unblur the comment
document.querySelectorAll('.toggle-blur-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const cardBody = btn.closest('.card-body');
    const blurredBox = cardBody.querySelector('.blurred-box');
    const icon = btn.querySelector('i');

    blurredBox.classList.toggle('visible');

    // Toggle icon
    icon.classList.toggle('bi-eye');
    icon.classList.toggle('bi-eye-slash');
  });
});

// Toggle Reply Form
document.querySelectorAll('.reply-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const card = btn.closest('.card-body');
    const replyForm = card.querySelector('.reply-form');
    replyForm.classList.toggle('d-none');
  });
});

// Like toggle logic
document.querySelectorAll('.like-btn').forEach(button => {
let liked = false; // Set default state

button.addEventListener('click', () => {
const countSpan = button.querySelector('.like-count');
let count = parseInt(countSpan.textContent);

if (!button.classList.contains('liked')) {
count += 1;
button.classList.add('liked');
button.classList.remove('btn-outline-secondary');
button.classList.add('btn-warning');
} else {
count -= 1;
button.classList.remove('liked');
button.classList.remove('btn-warning');
button.classList.add('btn-outline-secondary');
}

countSpan.textContent = count;
});
});
