async function fetchData() {
  try {
    const movieRes = await fetch('/api/discover/movies');
    const bookRes = await fetch('/api/discover/books');
    const movies = await movieRes.json();
    const books = await bookRes.json();
    const combined = [...movies, ...books];
    renderCards(combined);
  } catch (err) {
    console.error('❌ Failed to load content:', err);
  }
}

function renderCards(items) {
  const container = document.getElementById('mediaContainer');
  container.innerHTML = '';

  items.forEach(item => {
    const isMovie = item.type === 'movie';
    container.innerHTML += `
      <div class="col">
        <a href="${isMovie ? '/movie_detail' : '/book_detail'}" class="text-decoration-none text-dark">
          <div class="card card-custom h-100">
            <img src="${item.image}" class="card-img-top" alt="${item.title}">
            <div class="card-body">
              <h6 class="fw-bold">${item.title}</h6>
              <div class="d-flex align-items-center small text-muted mt-1">
                <i class="bi ${isMovie ? 'bi-film' : 'bi-book'} me-1"></i> ${isMovie ? 'Movie' : 'Book'}
                <span class="ms-auto text-dark fw-semibold">${item.rating} <i class="bi bi-star-fill rating-star"></i></span>
              </div>
              <button class="btn watchlist-btn mt-3 w-100" onclick="toggleWatchlist(this)">
                <i class="bi bi-plus-circle me-1"></i> Watchlist
              </button>
            </div>
          </div>
        </a>
      </div>
    `;
  });
}

function toggleWatchlist(button) {
  button.classList.toggle('active');
  if (button.classList.contains('active')) {
    button.innerHTML = '<i class="bi bi-check-circle me-1"></i> Added';
  } else {
    button.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Watchlist';
  }
}

function filter(type, btn) {
  document.querySelectorAll('.filter-buttons .btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  fetchData().then(() => {
    const allCards = document.querySelectorAll('#mediaContainer .col');
    allCards.forEach(card => {
      const isMovie = card.querySelector('i.bi-film');
      const shouldShow = type === 'all' || (type === 'movie' && isMovie) || (type === 'book' && !isMovie);
      card.style.display = shouldShow ? 'block' : 'none';
    });
  });
}

document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const cards = document.querySelectorAll('#mediaContainer .col');
  cards.forEach(card => {
    const title = card.querySelector('h6').textContent.toLowerCase();
    card.style.display = title.includes(query) ? 'block' : 'none';
  });
});

window.onload = () => {
  fetchData();
};