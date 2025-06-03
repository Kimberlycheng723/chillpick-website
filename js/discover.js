let currentPage = 1;
const itemsPerPage = 20;
let combined = [];
let allMovies = [];
let allBooks = [];
let filteredData = [];
let searchResults = [];

async function getCurrentUserId() {
  try {
    // Try to get user data from a simple endpoint that checks session
    const response = await fetch('/account/profile', {
      method: 'HEAD', // Just check if we can access the profile
      credentials: 'include'
    });
    
    if (response.ok) {
      // If profile is accessible, user is logged in
      // Return a simple user identifier (you can modify this based on your needs)
      return 'logged-in-user';
    } else {
      console.error('User not authenticated:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    return null;
  }
}

async function fetchData() {
  try {
    const movieRes = await fetch('/api/discover/movies');
    const bookRes = await fetch('/api/discover/books');
    const movies = await movieRes.json();
    const books = await bookRes.json();

    allMovies = movies;
    allBooks = books;
    combined = [...allMovies, ...allBooks];

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

function findItemById(itemId) {
  console.log('🔍 Looking for item with ID:', itemId, 'Type:', typeof itemId);
  let foundItem = combined.find(item => item.id === itemId);
  if (!foundItem) {
    foundItem = combined.find(item => String(item.id) === String(itemId));
  }
  if (foundItem) {
    console.log('✅ Found item:', foundItem.title, 'Genres:', foundItem.genres);
  } else {
    console.log('❌ Item not found. Available IDs:', combined.slice(0, 5).map(item => ({id: item.id, type: typeof item.id, title: item.title})));
  }
  return foundItem;
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
      html += `
        <div class="col">
          <a href="${isMovie ? `/movie_detail/${item.id}` : `/book_detail/${item.id}`}" class="text-decoration-none text-dark" onclick="event.preventDefault(); trackItemClickAndNavigate('${item.id}', '${item.title.replace(/'/g, "\\'")}', '${item.type}', this)">
            <div class="card card-custom h-100" data-item-id="${item.id}">
              <img src="${item.image}" class="card-img-top" alt="${item.title}">
              <div class="card-body">
                <h6 class="fw-bold">${item.title}</h6>
                <div class="d-flex align-items-center small text-muted mt-1">
                  <i class="bi ${isMovie ? 'bi-film' : 'bi-book'} me-1"></i> ${isMovie ? 'Movie' : 'Book'}
                  <span class="ms-auto text-dark fw-semibold">${item.rating} <i class="bi bi-star-fill rating-star"></i></span>
                </div>
                <button class="btn watchlist-btn mt-3 w-100" 
                        data-id="${item.id}" 
                        data-type="${item.type}"
                        onclick="handleWatchlistClick(event)">
                  <i class="bi bi-plus-circle me-1"></i> Watchlist
                </button>
              </div>
            </div>
          </a>
        </div>
      `;
    });
  }

  container.innerHTML = html;
}

async function trackItemClickAndNavigate(itemId, itemTitle, itemType, linkElement) {
  await trackItemClick(itemId, itemTitle, itemType);
  window.location.href = linkElement.href;
}

async function trackItemClick(itemId, itemTitle, itemType) {
  const itemData = findItemById(itemId);
  const clickedItem = {
    id: itemId,
    title: itemTitle,
    type: itemType,
    genres: itemData?.genres || []
  };
  console.log('👆 Item clicked:', clickedItem);
  await saveUserInteraction('item clicked', { clickedItem });
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

let userWatchlist = []; // Global variable to track watchlist items

// Fixed handleWatchlistClick function
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
    // First check if user is logged in
    const userId = await getCurrentUserId();
    if (!userId) {
      alert('Please log in to add items to your watchlist');
      window.location.href = `/account/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const itemData = findItemById(itemId);

    const watchlistData = {
    itemId, 
    type: itemType,
    title: itemData?.title || '',
    image: itemData?.image || '',
    rating: itemData?.rating || 0,
    genres: itemData?.genres || [],
    synopsis: itemData?.synopsis || itemData?.description || 'No synopsis available'
  };

    console.log('🎬 Watchlist request:', {
      method: 'POST',
      url: '/api/watchlist/add', // Fixed URL
      data: watchlistData
    });

    // Always use POST to /api/watchlist/add (the backend handles add/remove logic)
    const response = await fetch('/api/watchlist/add', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify(watchlistData)
    });

    console.log('🎬 Watchlist response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });

    if (response.status === 404) {
      console.error('❌ Watchlist endpoint not found. Check if watchlist routes are properly configured.');
      alert('Watchlist feature is currently unavailable. Please try again later.');
      button.innerHTML = originalHtml;
      return;
    }

    if (response.status === 401) {
      alert('Please log in to add items to your watchlist');
      window.location.href = `/account/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Watchlist error response:', errorText);
      throw new Error(`Failed to update watchlist: ${response.status} - ${errorText}`);
    }

    // Get the response to check if item was added or removed
    const result = await response.json();
    console.log('🎬 Watchlist result:', result);

    // Update UI based on the action returned from server
    if (result.action === 'removed') {
      userWatchlist = userWatchlist.filter(item => !(item.itemId === itemId && item.type === itemType));
      button.classList.remove('added');
      button.innerHTML = `<i class="bi bi-plus-circle me-1"></i> Watchlist`;
      console.log('✅ Item removed from watchlist');
      await saveUserInteraction('remove from watchlist', { 
        itemDetails: { itemId, title: button.closest('.card').querySelector('h6').textContent, type: itemType } 
      });
    } else if (result.action === 'added') {
      if (!userWatchlist.some(item => item.itemId === itemId && item.type === itemType)) {
        userWatchlist.push(watchlistData);
      }
      button.classList.add('added');
      button.innerHTML = `<i class="bi bi-check-circle me-1"></i> Added`;
      console.log('✅ Item added to watchlist');
      await saveUserInteraction('add to watchlist', { 
        itemDetails: { itemId, title: button.closest('.card').querySelector('h6').textContent, type: itemType } 
      });
    }

  } catch (err) {
    console.error('Watchlist error:', err);
    
    // Check if it's an authentication error
    if (err.message.includes('401') || err.message.includes('unauthorized')) {
      alert('Please log in to use this feature');
      window.location.href = `/account/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    } else if (err.message.includes('404')) {
      alert('Watchlist feature is currently unavailable. Please contact support.');
    } else {
      // Other errors
      alert('Unable to update watchlist. Please try again.');
    }
    
    button.innerHTML = originalHtml;
  } finally {
    button.disabled = false;
  }
}

async function initializeWatchlistButtons() {
  try {
    const response = await fetch('/api/watchlist', {
      credentials: 'include'
    });
    
    if (response.ok) {
      userWatchlist = await response.json();
      document.querySelectorAll('.watchlist-btn').forEach(button => {
        const itemId = button.dataset.id;
        const itemType = button.dataset.type;
        
        if (userWatchlist.some(item => item.itemId === itemId && item.type === itemType)) {
          button.classList.add('added');
          button.innerHTML = `<i class="bi bi-check-circle me-1"></i> Added`;
        }
      });
    } else if (response.status === 401) {
      // User not logged in, but don't show error - just leave buttons in default state
      console.log('User not logged in - watchlist buttons will show login prompt when clicked');
    }
  } catch (error) {
    console.error('Error initializing watchlist buttons:', error);
  }
}

document.getElementById('searchInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    document.getElementById('searchBtn').click();
  }
});

document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  searchResults = query === ''
    ? [...combined]
    : combined.filter(item => item.title.toLowerCase().includes(query));
  currentPage = 1;
  applyFilters();
  if (query !== '') {
    console.log('💾 Saving search interaction:', query);
    saveUserInteraction('search', { query });
  }
});

document.getElementById('genreSelect').addEventListener('change', () => {
  const selectedGenre = document.getElementById('genreSelect').value;
  currentPage = 1;
  applyFilters();
  if (selectedGenre !== 'All Genres') {
    saveUserInteraction('filter genre', { genre: selectedGenre });
  }
});

document.getElementById('ratingSelect').addEventListener('change', () => {
  const selectedRating = document.getElementById('ratingSelect').value;
  currentPage = 1;
  applyFilters();
  if (selectedRating !== 'Any Rating') {
    saveUserInteraction('filter rating', { rating: selectedRating });
  }
});

window.onload = () => {
  fetchData();
  initializeWatchlistButtons();
};

async function saveUserInteraction(interactionType, payload = {}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn('⚠️ Cannot save interaction: No user ID available');
    return;
  }
  const data = {
    userId,
    interactionType,
    timestamp: new Date().toISOString(),
    ...payload
  };
  console.log('📤 Sending interaction data:', data);
  try {
    const response = await fetch('/api/interactions/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server responded with error:', response.status, errorText);
      throw new Error(`Server error: ${response.status}`);
    }
    const result = await response.json();
    console.log('✅ Interaction saved successfully:', result);
  } catch (err) {
    console.error('⚠️ Failed to save interaction:', err.message);
  }
}