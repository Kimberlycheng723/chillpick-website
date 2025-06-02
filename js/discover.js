let currentPage = 1;
const itemsPerPage = 20;
let combined = [];
let allMovies = [];
let allBooks = [];
let filteredData = [];
let searchResults = [];

async function getCurrentUserId() {
  try {
    const response = await fetch('/account/profile-data', {
      credentials: 'include'  // this ensures cookies are sent
    });

    if (!response.ok) {
      console.error('Failed to fetch current user:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('🚀 getCurrentUserId() returned:', data);
    return data._id;
  } catch (error) {
    console.error('Error fetching current user:', error);
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

// Helper function to find item data by ID
function findItemById(itemId) {
  console.log('🔍 Looking for item with ID:', itemId, 'Type:', typeof itemId);
  
  // Try exact match first
  let foundItem = combined.find(item => item.id === itemId);
  
  // If not found, try string comparison (in case of type mismatch)
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
                <button class="btn watchlist-btn mt-3 w-100" onclick="toggleWatchlist(this, event)">
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

// Added new helper function to handle click tracking and navigation
async function trackItemClickAndNavigate(itemId, itemTitle, itemType, linkElement) {
  await trackItemClick(itemId, itemTitle, itemType);
  window.location.href = linkElement.href;
}

// Function to track item clicks
async function trackItemClick(itemId, itemTitle, itemType) {
  const itemData = findItemById(itemId);
  const clickedItem = {
    id: itemId,
    title: itemTitle,
    type: itemType,
    genres: itemData?.genres || [] // Include genres in the data
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

  console.log(`🔎 Applying filters...`);
  console.log(`📁 Type: ${type}`);
  console.log(`🎭 Genre: ${genre}`);
  console.log(`⭐ Rating: ${rating}`);

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
function toggleWatchlist(button, event) {
  event.stopPropagation(); // Prevent navigating to detail page
  event.preventDefault();  // Prevent anchor behavior

  const card = button.closest('.card');
   const itemId = card.dataset.itemId; // Get the item ID from data attribute
  const title = card.querySelector('h6').textContent;
  const rating = card.querySelector('.fw-semibold').textContent.split(' ')[0]; // Get just the rating number;
  const image = card.querySelector('img').src;
  const isMovie = card.querySelector('.bi-film') !== null;
  const detailURL = button.closest('a').href;

  // Get full item data including genres
  const itemData = findItemById(itemId);

  const itemDetails = {
    id: itemId,
    title,
    rating,
    type: isMovie ? 'movie' : 'book',
    detailURL,
    genres: itemData?.genres || [] // Include genres in the watchlist data
  };

  console.log('🎬 Adding to watchlist:', itemDetails);

  // Toggle state 
  if (button.classList.contains('added')) {
    button.classList.remove('added');
    button.innerHTML = `<i class="bi bi-plus-circle me-1"></i> Watchlist`;
  } else {
    button.classList.add('added');
    button.innerHTML = `<i class="bi bi-check-circle me-1"></i> Added`;

    saveUserInteraction('add to watchlist', { itemDetails });
  }
}

document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  searchResults = query === ''
    ? [...combined]
    : combined.filter(item => item.title.toLowerCase().includes(query));
  currentPage = 1;
  console.log(`🔍 Searching for: "${query}" | Results found: ${searchResults.length}`);
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
    console.log('💾 Saving genre filter interaction:', selectedGenre);
    saveUserInteraction('filter genre', { genre: selectedGenre });
  }
});

document.getElementById('ratingSelect').addEventListener('change', () => {
  const selectedRating = document.getElementById('ratingSelect').value;
  currentPage = 1;
  applyFilters();

  if (selectedRating !== 'Any Rating') {
    console.log('💾 Saving rating filter interaction:', selectedRating);
    saveUserInteraction('filter rating', { rating: selectedRating });
  }
});

window.onload = () => {
  fetchData();
};

// save activity to mongodb
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


