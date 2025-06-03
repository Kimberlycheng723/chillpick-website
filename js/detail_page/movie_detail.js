document.addEventListener('DOMContentLoaded', () => {
    const movieId = document.body.dataset.movieId;
    let currentPage = 1;
    let selectedRating = 0;
    let isLoading = false;
    let isAllReviewsLoaded = false;

    const loadMoreBtn = document.querySelector('.load-more-reviews-btn');

    const checkAuthStatus = async () => {
        try {
            const endpoints = [
                '/movie_detail/check-session',
                '/debug/session',
                '/api/profile/profile'
            ];

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const isLoggedIn = data.isLoggedIn ||
                            !!(data.user?.id || data.user?.userId) ||
                            !!(data._id) ||
                            (data.success !== false && data.message !== 'Not authenticated');

                        if (isLoggedIn) return true;
                    }
                } catch {}
            }

            const isLoggedInCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('isLoggedIn='))
                ?.split('=')[1];

            return isLoggedInCookie === 'true';
        } catch {
            return false;
        }
    };

    const setupReviewForm = () => {
        const reviewForm = document.getElementById('reviewForm');
        const writeReviewBtn = document.getElementById('writeReviewBtn');
        const ratingStars = document.querySelectorAll('#ratingInput i');
        const textarea = reviewForm?.querySelector('textarea');
        const submitButton = reviewForm?.querySelector('button[type="submit"]');
        const spoilerCheckbox = document.getElementById('confirmRatingCheck');

        if (!reviewForm || !writeReviewBtn || !ratingStars || !textarea || !submitButton) return;

        writeReviewBtn.addEventListener('click', async () => {
            writeReviewBtn.textContent = 'Checking...';
            writeReviewBtn.disabled = true;

            try {
                const isAuthenticated = await checkAuthStatus();
                if (!isAuthenticated) {
                    if (confirm('You need to be logged in to write a review. Go to login page?')) {
                        window.location.href = '/account/login?redirect=' + encodeURIComponent(window.location.pathname);
                    }
                    return;
                }

                reviewForm.classList.toggle('d-none');
            } catch {
                alert('Something went wrong. Please refresh the page.');
            } finally {
                writeReviewBtn.textContent = 'Write a Review';
                writeReviewBtn.disabled = false;
            }
        });

        ratingStars.forEach((star, index) => {
            star.addEventListener('click', () => {
                selectedRating = index + 1;
                updateStarDisplay();
            });

            star.addEventListener('mouseenter', () => {
                highlightStars(index + 1);
            });
        });

        document.getElementById('ratingInput').addEventListener('mouseleave', () => {
            updateStarDisplay();
        });

        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();

            if (selectedRating === 0) return alert('Please select a rating');
            if (!textarea.value.trim()) return alert('Please write your review');
            if (!movieId) return alert('Movie ID is missing');

            try {
                submitButton.disabled = true;
                submitButton.textContent = 'Submitting...';

                const isAuthenticated = await checkAuthStatus();
                if (!isAuthenticated) {
                    alert('Your session has expired. Please log in again.');
                    window.location.href = '/account/login?redirect=' + encodeURIComponent(window.location.pathname);
                    return;
                }

                const reviewData = {
                    movieId,
                    rating: selectedRating,
                    comment: textarea.value.trim(),
                    spoiler: spoilerCheckbox?.checked || false
                };

                const response = await fetch('/movie_detail/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(reviewData)
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    alert('Review submitted successfully!');
                    reviewForm.classList.add('d-none');
                    textarea.value = '';
                    selectedRating = 0;
                    if (spoilerCheckbox) spoilerCheckbox.checked = false;
                    updateStarDisplay();

                    const container = document.getElementById('reviewsContainer');
                    container.innerHTML = '';

                    if (isAllReviewsLoaded) {
                        let page = 1;
                        while (true) {
                            const res = await fetch(`/movie_detail/reviews/${movieId}?page=${page}`, {
                                credentials: 'include'
                            });
                            const data = await res.json();
                            if (data.success && data.reviews.length > 0) {
                                displayReviews(data.reviews);
                                page++;
                                if (!data.hasMore) break;
                            } else {
                                break;
                            }
                        }
                    } else {
                        loadReviews(1, true);
                    }
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (error) {
                alert(error.message || 'Error submitting review');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Review';
            }
        });

        const highlightStars = (rating) => {
            ratingStars.forEach((star, index) => {
                star.style.color = index < rating ? '#ffc107' : '#ddd';
            });
        };

        const updateStarDisplay = () => {
            highlightStars(selectedRating);
        };

        updateStarDisplay();
    };

    const displayNoReviews = () => {
        const container = document.getElementById('reviewsContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <h5>No reviews yet</h5>
                    <p>Be the first to review this movie!</p>
                    <small class="text-muted">Note: You need to be logged in to submit a review.</small>
                </div>
            `;
        }
    };

    const displayReviews = (reviews) => {
        const container = document.getElementById('reviewsContainer');
        if (!container) return;
        reviews.forEach(review => {
            container.insertAdjacentHTML('beforeend', createReviewHTML(review));
        });
        setupReviewInteractions();
    };

    const createReviewHTML = (review) => {
        const reviewDate = new Date(review.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        const username = review.username || review.user?.username || 'Anonymous';

        return `
            <div class="card mb-3 review-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <strong>${username}</strong>
                            <div class="rating-stars text-warning small">
                                ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                            </div>
                        </div>
                        <small class="text-muted">${reviewDate}</small>
                    </div>
                    <div class="${review.spoiler ? 'blurred-box' : ''}">
                        <p class="card-text">${review.comment}</p>
                    </div>
                    ${review.spoiler ? `<button class="btn btn-sm btn-outline-secondary toggle-blur-btn mt-2">Show Spoiler</button>` : ''}
                </div>
            </div>
        `;
    };

    const setupReviewInteractions = () => {
        document.querySelectorAll('.toggle-blur-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const contentBox = this.closest('.card-body').querySelector('.blurred-box');
                if (contentBox) {
                    contentBox.classList.toggle('show-content');
                    this.textContent = contentBox.classList.contains('show-content') ? 'Hide Spoiler' : 'Show Spoiler';
                }
            });
        });
    };

    const updateLoadMoreButton = (hasMore) => {
        if (!loadMoreBtn) return;
        loadMoreBtn.style.display = hasMore ? 'inline-block' : 'none';
    };

    const loadReviews = async (page = 1, clear = false) => {
        if (isLoading) return;
        isLoading = true;

        const container = document.getElementById('reviewsContainer');
        if (clear && container) container.innerHTML = '';

        try {
            const response = await fetch(`/movie_detail/reviews/${movieId}?page=${page}`, {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                if (result.reviews.length > 0) {
                    displayReviews(result.reviews);
                    currentPage = result.page;
                    updateLoadMoreButton(result.hasMore);
                } else if (page === 1) {
                    displayNoReviews();
                } else {
                    updateLoadMoreButton(false);
                }
            } else {
                displayNoReviews();
            }
        } catch {
            displayNoReviews();
        } finally {
            isLoading = false;
        }
    };

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            let hasMore = true;
            let nextPage = currentPage + 1;

            while (hasMore) {
                const response = await fetch(`/movie_detail/reviews/${movieId}?page=${nextPage}`, {
                    credentials: 'include'
                });

                const result = await response.json();
                hasMore = result.hasMore;

                if (result.success && result.reviews.length > 0) {
                    displayReviews(result.reviews);
                    currentPage = result.page;
                    nextPage++;
                } else {
                    hasMore = false;
                }
            }

            isAllReviewsLoaded = true;
            updateLoadMoreButton(false);
        });
    }

    setupReviewForm();
    loadReviews();
});