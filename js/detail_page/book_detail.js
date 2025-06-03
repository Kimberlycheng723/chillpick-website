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




// Recommendation
let filteredData = [];  // global or module-level variable




// Utility function to shuffle an array in place (Fisher-Yates shuffle)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}




async function loadBooksAndRender() {
  try {
    const response = await fetch('/api/discover/books'); // Updated endpoint
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();




    // Shuffle the data randomly
    shuffleArray(data);




    filteredData = data;




    renderCards(1); // render first page
  } catch (error) {
    console.error('Failed to load books:', error);
  }
}




function renderCards(page) {
  const container = document.getElementById('RecommendationBook');
  if (!container) return;




  const itemsPerPage = 4;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(page * itemsPerPage, filteredData.length);
  const itemsToDisplay = filteredData.slice(startIndex, endIndex);




  let html = '';
  if (itemsToDisplay.length === 0) {
    html = `<div class="text-center w-100 py-5"><h5 class="text-muted">No books found.</h5></div>`;
  } else {
    itemsToDisplay.forEach(item => {
      html += `
        <div class="col-md-3 col-6">
          <div class="card h-100 text-center">
            <a href="/book_detail/${item.id}" class="text-decoration-none text-dark">
              <img src="${item.image}" class="card-img-top" alt="${item.title}" style="height: 300px; object-fit: cover;">
              <h6 class="card-title mt-2" id="RecommendationCard-title">${item.title}</h6>
              <div class="mb-4 text-muted" style="font-size: 0.9rem;">${item.categories || ''}</div>
            </a>
          </div>
        </div>
      `;
    });
  }




  container.innerHTML = html;
}




// Call this on page load or when ready
loadBooksAndRender();




});
