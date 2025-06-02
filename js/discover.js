let currentPage = 1;
const itemsPerPage = 20;
let combined = [];
let allMovies = [];
let allBooks = [];
let filteredData = [];
let searchResults = [];
let userWatchlist = [];

async function fetchData() {
  // First check if we have a session
  const sessionCheck = await fetch('/api/auth/check', {
    credentials: 'include'
  });
  
  if (sessionCheck.status === 401) {
    window.location.href = `/account/login?redirect=${encodeURIComponent('/discover')}`;
    return;
  }
  try {
    const [movieRes, bookRes, watchlistRes] = await Promise.all([
      fetch('/api/discover/movies', { 
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      }),
      fetch('/api/discover/books', { 
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      }),
      fetch('/api/watchlist', { 
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      }).catch(() => ({ ok: false, status: 401 })) // Gracefully handle failure
    ]);

    // Handle 401 unauthorized
    if (movieRes.status === 401 || bookRes.status === 401) {
      window.location.href = `/account/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const movies = await movieRes.json();
    const books = await bookRes.json();
    allMovies = movies;
    allBooks = books;
    combined = [...allMovies, ...allBooks];

    // Handle watchlist response
    if (watchlistRes.ok) {
      userWatchlist = await watchlistRes.json();
    } else if (watchlistRes.status === 401) {
      userWatchlist = [];
      console.log('Not logged in - watchlist unavailable');
    }

    const genresSet = new Set();
    combined.forEach(item => {
      if (Array.isArray(item.genres)) {
        item.genres.forEach(g => genresSet.add(g));
      }
    });

    const genres = [...genresSet].sort();
    updateGenreFilter(genres);
    updateRatingFilter();

    shuffleArray(combined);
    searchResults = [...combined];
    filteredData = [...combined];

    renderCards(currentPage);
    renderPagination(Math.ceil(filteredData.length / itemsPerPage));
  } catch (err) {
    console.error('❌ Failed to load content:', err);
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function isInWatchlist(itemId, itemType) {
  return userWatchlist.some(item => item.itemId === itemId && item.type === itemType);
}

function renderCards(page) {
  const container = document.getElementById('mediaContainer');
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(page * itemsPerPage, filteredData.length);
  const itemsToDisplay = filteredData.slice(startIndex, endIndex);

  let html = '';
  if (itemsToDisplay.length === 0) {
    html = `<div class="text-center w-100 py-5"><h5 class="text-muted">No results found.</h5></div>`;
  } else {
    itemsToDisplay.forEach(item => {
      const isMovie = item.type === 'movie';
      const inWatchlist = isInWatchlist(item.id, item.type);
      html += `
        <div class="col">
          <div class="card card-custom h-100" data-id="${item.id}" data-type="${item.type}">
            <a href="${isMovie ? `/movie_detail/${item.id}` : `/book_detail/${item.id}`}" class="text-decoration-none text-dark">
              <img src="${item.image}" class="card-img-top" alt="${item.title}">
              <div class="card-body">
                <h6 class="fw-bold">${item.title}</h6>
                <div class="d-flex align-items-center small text-muted mt-1">
                  <i class="bi ${isMovie ? 'bi-film' : 'bi-book'} me-1"></i> ${isMovie ? 'Movie' : 'Book'}
                  <span class="ms-auto text-dark fw-semibold">${item.rating} <i class="bi bi-star-fill rating-star"></i></span>
                </div>
              </div>
            </a>
            <button class="btn watchlist-btn mt-3 w-100 ${inWatchlist ? 'added' : ''}" 
                    data-id="${item.id}" data-type="${item.type}">
              <i class="bi ${inWatchlist ? 'bi-check-circle' : 'bi-plus-circle'} me-1"></i> 
              ${inWatchlist ? 'Added' : 'Watchlist'}
            </button>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = html;
  
  // Add event listeners to all watchlist buttons
  document.querySelectorAll('.watchlist-btn').forEach(button => {
    button.addEventListener('click', handleWatchlistClick);
  });

}
async function handleWatchlistClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const button = event.currentTarget;
  const itemId = button.dataset.id;
  const itemType = button.dataset.type;
  const isAdded = button.classList.contains('added');

  // Show loading state
  const originalHtml = button.innerHTML;
  button.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
  button.disabled = true;

  try {
    const response = await fetch(
      isAdded 
        ? `/api/watchlist/${itemId}?type=${itemType}`
        : '/api/watchlist',
      {
        method: isAdded ? 'DELETE' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: isAdded ? null : JSON.stringify({ itemId, type: itemType })
      }
    );

    if (response.status === 401) {
      window.location.href = `/account/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to update watchlist');
    }

    // Update UI and local state
    if (isAdded) {
      userWatchlist = userWatchlist.filter(item => !(item.itemId === itemId && item.type === itemType));
      button.classList.remove('added');
      button.innerHTML = `<i class="bi bi-plus-circle me-1"></i> Watchlist`;
    } else {
      const newItem = await response.json();
      userWatchlist.push(newItem);
      button.classList.add('added');
      button.innerHTML = `<i class="bi bi-check-circle me-1"></i> Added`;
    }

  } catch (err) {
    console.error('Watchlist error:', err);
    showToast('Please login to use this feature', 'danger');
    button.innerHTML = originalHtml;
  } finally {
    button.disabled = false;
  }
  
}

// Add this to check auth status periodically
function checkAuthStatus() {
  fetch('/api/auth/status', { 
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  })
  .then(response => {
    if (response.status === 401) {
      window.location.href = '/account/login';
    }
  })
  .catch(err => console.error('Auth check failed:', err));
}

// Check every 5 minutes
setInterval(checkAuthStatus, 5 * 60 * 1000);

// In your frontend JavaScript (e.g., discover.js)
async function addToWatchlist(mediaData) {
  try {
    const response = await fetch('/api/watchlist/add', {
      method: 'POST',
      credentials: 'include', // Crucial for sending cookies
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` // Optional
      },
      body: JSON.stringify(mediaData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add to watchlist');
    }

    return await response.json();
  } catch (error) {
    console.error('Watchlist error:', error);
    // Handle error (show toast, etc.)
  }
}

function showToast(message, type = 'success') {
  const toastEl = document.getElementById('toastNotification');
  const toastBody = toastEl.querySelector('.toast-body');
  
  toastEl.classList.add('bg-' + type);
  toastBody.textContent = message;
  
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

function renderPagination(totalPages) {
  const paginationContainer = document.getElementById('pagination');
  paginationContainer.innerHTML = '';

  let paginationHTML = `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
    </li>
  `;

  for (let i = 1; i <= totalPages; i++) {
    paginationHTML += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
      </li>
    `;
  }

  paginationHTML += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
    </li>
  `;

  paginationContainer.innerHTML = paginationHTML;
}

function changePage(pageNumber) {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  if (pageNumber < 1 || pageNumber > totalPages) return;
  currentPage = pageNumber;
  renderCards(currentPage);
  renderPagination(totalPages);
}

function filter(type, btn) {
  document.querySelectorAll('.filter-buttons .btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  btn.dataset.type = type;
  currentPage = 1;
  applyFilters();
}

function applyFilters() {
  const activeBtn = document.querySelector('.filter-buttons .active');
  const type = activeBtn?.dataset.type || 'all';
  const genre = document.getElementById('genreSelect').value;
  const rating = document.getElementById('ratingSelect').value;

  let base = [...searchResults];

  if (type === 'movie') {
    base = base.filter(item => item.type === 'movie');
  } else if (type === 'book') {
    base = base.filter(item => item.type === 'book');
  }

  if (genre !== 'All Genres') {
    base = base.filter(item => item.genres?.includes(genre));
  }

  if (rating !== 'Any Rating') {
    const threshold = parseFloat(rating.split('+')[0]);
    base = base.filter(item => parseFloat(item.rating) >= threshold);
  }

  filteredData = [...base];
  renderCards(currentPage);
  renderPagination(Math.ceil(filteredData.length / itemsPerPage));
}

function updateGenreFilter(genres) {
  const genreSelect = document.getElementById('genreSelect');
  genreSelect.innerHTML = `<option>All Genres</option>`;
  genres.forEach(g => {
    genreSelect.innerHTML += `<option>${g}</option>`;
  });
}

function updateRatingFilter() {
  const ratingSelect = document.getElementById('ratingSelect');
  ratingSelect.innerHTML = `<option>Any Rating</option>`;
  const steps = [9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];
  steps.forEach(r => {
    ratingSelect.innerHTML += `<option>${r}+ Stars</option>`;
  });
}


document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  searchResults = query === ''
    ? [...combined]
    : combined.filter(item => item.title.toLowerCase().includes(query));
  currentPage = 1;
  applyFilters();
});

document.getElementById('genreSelect').addEventListener('change', () => {
  currentPage = 1;
  applyFilters();
});

document.getElementById('ratingSelect').addEventListener('change', () => {
  currentPage = 1;
  applyFilters();
});

window.onload = () => {
  fetchData();
};