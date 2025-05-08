    const data = [
      { id: 1, title: '哪吒之魔童降世 Ne Zha', type: 'movie', rating: 4.6, image: '../images/Detail/Image/哪吒.jpg' },
      { id: 2, title: '哪吒之魔童降世 Ne Zha', type: 'movie', rating: 4.6, image: '../images/Detail/Image/哪吒.jpg' },
      { id: 3, title: '哪吒之魔童降世 Ne Zha', type: 'movie', rating: 4.6, image: '../images/Detail/Image/哪吒.jpg' },
      { id: 4, title: '哪吒之魔童降世 Ne Zha', type: 'movie', rating: 4.6, image: '../images/Detail/Image/哪吒.jpg' },
      {
        id: 101,
        title: 'The Great Gatsby',
        type: 'book',
        rating: 4.5,
        image: '../images/Detail/Image/The-Great-Gatsby (book).jpg'
      }
    ];

    function renderCards(items) {
      const container = document.getElementById('mediaContainer');
      container.innerHTML = '';
      items.forEach(item => {
        container.innerHTML += `
          <div class="col">
            <a href="${item.type === 'movie' ? '/movie_detail' : '/book_detail'}" class="text-decoration-none text-dark">
              <div class="card card-custom">
                <img src="${item.image}" class="card-img-top" alt="${item.title}">
                <div class="card-body">
                  <h6 class="fw-bold"><span class="fw-semibold">${item.title}</span></h6>
                  <div class="d-flex align-items-center small text-muted mt-1">
                    <i class="bi bi-film me-1"></i> ${item.type}
                    <span class="ms-auto text-dark fw-semibold">${item.rating} <i class="bi bi-star-fill rating-star"></i></span>
                  </div>
                  <button class="btn watchlist-btn mt-3 w-100" onclick="toggleWatchlist(this)"><i class="bi bi-plus-circle me-1"></i> Watchlist</button>
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
      const filtered = type === 'all' ? data : data.filter(item => item.type === type);
      renderCards(filtered);
    }

    document.getElementById('searchBtn').addEventListener('click', () => {
      const query = document.getElementById('searchInput').value.toLowerCase();
      const results = data.filter(item => item.title.toLowerCase().includes(query));
      renderCards(results);
    });

    window.onload = () => {
      renderCards(data);

      fetch('../partials/header.html')
        .then(res => res.text())
        .then(data => {
          document.getElementById('header').innerHTML = data;
        });

      fetch('../partials/footer.html')
        .then(res => res.text())
        .then(data => {
          document.getElementById('footer').innerHTML = data;
        });
    };
