const tmdbApiKey = '4154b8dfb44ef69e6cf3a7d880438188';
const nytApiKey = 'MPAFCu7iswN9hpJgf7Exv2MG2tkVsru6';
const googleApiKey = 'AIzaSyBq8J6WI7TJQDqG1NUFMtCUMg3nf5aPnPw';
const imageBase = 'https://image.tmdb.org/t/p/w780';
const thumbBase = 'https://image.tmdb.org/t/p/w342';

let movieData = [], chart, bookChart;

// Load movie data from TMDB
async function loadMovieData() {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${tmdbApiKey}`);
    const data = await res.json();
    movieData = data.results.map(m => ({
      id: m.id,
      type: 'movie',
      title: m.title,
      rating: m.vote_average,
      popularity: m.popularity,
      overview: m.overview,
      image: m.backdrop_path ? imageBase + m.backdrop_path : 'https://via.placeholder.com/780x439?text=No+Image',
      thumb: m.poster_path ? thumbBase + m.poster_path : 'https://via.placeholder.com/342x513?text=No+Poster',
    }));
    document.getElementById('lastUpdated').textContent = 'Last updated: ' + new Date().toLocaleString();
    renderByMetric("rating");
  } catch (err) {
    console.error("Movie API error:", err);
  }
}
function renderMovieChart(metric, sortedData) {
  const options = {
    chart: { type: 'bar', height: 400, toolbar: { show: true } },
    series: [{
      name: metric === 'rating' ? 'IMDb Rating' : 'Popularity',
      data: sortedData.map(m => m[metric])
    }],
    plotOptions: {
      bar: { borderRadius: 10, columnWidth: '50%', distributed: true }
    },
    dataLabels: {
      enabled: true,
      style: { colors: ['#fff'], fontWeight: 'bold' }
    },
    xaxis: {
      categories: sortedData.map(m => m.title),
      labels: { rotate: -30, style: { fontSize: '13px', colors: '#6B4F3D' } }
    },
    yaxis: {
      title: {
        text: metric === 'rating' ? 'IMDb Ratings' : 'Popularity Score',
        style: { color: '#6B4F3D', fontSize: '14px', fontWeight: 600 }
      },
      max: metric === 'rating' ? 10 : undefined
    },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const m = sortedData[dataPointIndex];
        return `<div style="padding:10px">
          <strong>🎬 ${m.title}</strong><br>
          ⭐ IMDb: ${m.rating}<br>
          🔥 Popularity: ${Math.round(m.popularity)}
        </div>`;
      }
    },
    colors: ['#6B4F3D'],
    legend: { show: false }
  };

  if (!chart) {
    chart = new ApexCharts(document.querySelector("#entertainmentChart"), options);
    chart.render();
  } else {
    chart.updateOptions(options);
  }
}


async function loadBookData() {
  try {
    const nytRes = await fetch(`https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=${nytApiKey}`);
    const nytData = await nytRes.json();

    const combinedBooks = await Promise.all(nytData.results.books.slice(0, 5).map(async (nytBook, index) => {
      const title = nytBook.title;
      const author = nytBook.author;
      let googleBook = null;

      try {
        const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:\"${title}\"+inauthor:\"${author}\"&key=${googleApiKey}`);
        const googleData = await googleRes.json();
        if (googleData.items && googleData.items.length > 0) {
          googleBook = googleData.items[0];
        }
      } catch (err) {
        console.warn(`Google Books fetch failed for ${title}:`, err);
      }

      const info = googleBook?.volumeInfo || {};

      return {
        id: googleBook?.id || nytBook.title + '-' + nytBook.author,
        title: title,
        author: author,
        description: (info.description || nytBook.description || "No description available.").slice(0, 150) + '...',
        image: info.imageLinks?.thumbnail || 'https://via.placeholder.com/342x513?text=No+Cover',
        rank: nytBook.rank
      };
    }));

    document.getElementById('booksLastUpdated').textContent = 'Last updated: ' + new Date().toLocaleString();
    renderBookHeroSection(combinedBooks);
    renderBookChart(combinedBooks);

  } catch (err) {
    console.error("Failed to load NYT + Google Books data:", err);
    document.getElementById('booksLastUpdated').textContent = '⚠️ Failed to load books.';
  }
}
// Render top book chart
function renderBookChart(books) {
  const options = {
    chart: { type: 'bar', height: 400, toolbar: { show: true } },
    series: [{
      name: "Rank",
      data: books.map(book => 11 - book.rank)
    }],
    plotOptions: {
      bar: { borderRadius: 10, columnWidth: '50%', distributed: true }
    },
    dataLabels: {
      enabled: true,
      formatter: (_, { dataPointIndex }) => `#${books[dataPointIndex].rank}`,
      style: { colors: ['#fff'], fontWeight: 'bold' }
    },
    xaxis: {
      categories: books.map(b => b.title),
      labels: { rotate: -30, style: { fontSize: '13px', colors: '#6B4F3D' } }
    },
    yaxis: {
      title: {
        text: 'Ranking',
        style: { color: '#6B4F3D', fontSize: '14px', fontWeight: 600 }
      },
      min: 0,
      max: 10
    },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const b = books[dataPointIndex];
        return `<div style="padding:10px">
          <strong>📚 ${b.title}</strong><br>
          ✍️ ${b.author}<br>
          📝 ${b.description}
        </div>`;
      }
    },
    colors: ['#6B4F3D'],
    legend: { show: false }
  };

  if (!bookChart) {
    bookChart = new ApexCharts(document.querySelector("#booksChart"), options);
    bookChart.render();
  } else {
    bookChart.updateOptions(options);
  }
}

// Render hero section for top movies
function renderHeroSection(movies) {
  const hero = document.getElementById("cinematicSection");
  const carousel = document.getElementById("nezhaCarousel");
  const dots = document.getElementById("nezhaDots");
  const info = document.getElementById("nezhaInfo");

  carousel.innerHTML = "";
  dots.innerHTML = "";

  const first = movies[0];
  hero.style.backgroundImage = `url('${first.image}')`;
  info.innerHTML = `<h1>${first.title}</h1><p>${first.overview}</p><a href="/movie_detail/${first.id}" class="btn btn-outline-light">Details</a>`;

  movies.forEach((m, i) => {
    const card = document.createElement("div");
    card.className = "nezha-card";
    if (i === 0) card.classList.add("active");
    card.innerHTML = `<img src="${m.thumb}" alt="${m.title}">`;

    card.onclick = () => {
      hero.style.backgroundImage = `url('${m.image}')`;
      info.innerHTML = `<h1>${m.title}</h1><p>${m.overview}</p><a href="/movie_detail/${m.id}" class="btn btn-outline-light">Details</a>`;
      document.querySelectorAll('.nezha-card').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.nezha-dot').forEach(d => d.classList.remove('active'));
      card.classList.add('active');
      dots.children[i].classList.add('active');
    };

    carousel.appendChild(card);

    const dot = document.createElement("div");
    dot.className = "nezha-dot";
    if (i === 0) dot.classList.add("active");
    dot.onclick = card.onclick;
    dots.appendChild(dot);
  });
}

// Render hero section for top books
function renderBookHeroSection(books) {
  const hero = document.getElementById("bookCinematicSection");
  const carousel = document.getElementById("bookCarousel");
  const dots = document.getElementById("bookDots");
  const info = document.getElementById("bookInfo");

  carousel.innerHTML = "";
  dots.innerHTML = "";

  const first = books[0];
  const firstLink = localStorage.getItem('isLoggedIn') === 'true' ? `/book_detail/${first.id}` : '/account/login';
  hero.style.backgroundImage = `
    linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.2)),
    url('${first.image}')
  `;
  hero.style.backgroundSize = 'cover';
  hero.style.backgroundPosition = 'center';
  hero.style.backgroundRepeat = 'no-repeat';

  info.innerHTML = `<h1>${first.title}</h1><p>${first.description}</p><a href="${firstLink}" class="btn btn-outline-light">Details</a>`;

  books.forEach((b, i) => {
    const card = document.createElement("div");
    card.className = "nezha-card";
    if (i === 0) card.classList.add("active");
    card.innerHTML = `<img src="${b.image}" alt="${b.title}">`;

    card.onclick = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const detailLink = isLoggedIn ? `/book_detail/${b.id}` : '/account/login';

      hero.style.backgroundImage = `
        linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.2)),
        url('${b.image}')
      `;
      info.innerHTML = `<h1>${b.title}</h1><p>${b.description}</p><a href="${detailLink}" class="btn btn-outline-light">Details</a>`;

      document.querySelectorAll('#bookCarousel .nezha-card').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('#bookDots .nezha-dot').forEach(d => d.classList.remove('active'));
      card.classList.add('active');
      dots.children[i].classList.add('active');
    };

    carousel.appendChild(card);

    const dot = document.createElement("div");
    dot.className = "nezha-dot";
    if (i === 0) dot.classList.add("active");
    dot.onclick = card.onclick;
    dots.appendChild(dot);
  });
}
// Toggle rating vs popularity
function updateChartMetric(metric) {
  renderByMetric(metric);
}

// Re-render based on metric
function renderByMetric(metric) {
  const topMovies = [...movieData].sort((a, b) => b[metric] - a[metric]).slice(0, 5);
  renderMovieChart(metric, topMovies);
  renderHeroSection(topMovies);
}

// DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  loadMovieData();
  loadBookData();

  loadPartial('../partials/header.html')
    .then(res => res.ok ? res.text() : Promise.reject())
    .then(html => document.getElementById('header').innerHTML = html)
    .catch(() => {
      document.getElementById('header').innerHTML = `<header class="bg-light p-3 text-center"><h1>ChillPick</h1></header>`;
    });

  fetch('../partials/footer.html')
    .then(res => res.ok ? res.text() : Promise.reject())
    .then(html => document.getElementById('footer').innerHTML = html)
    .catch(() => {
      document.getElementById('footer').innerHTML = `<footer class="bg-dark text-white text-center py-4"><p>© 2025 ChillPick</p></footer>`;
    });
});

document.getElementById('signupBtn').addEventListener('click', function () {
  window.location.href = '/account/register';
});