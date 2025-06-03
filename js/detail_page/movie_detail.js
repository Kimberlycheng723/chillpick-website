addEventListener('DOMContentLoaded', () => {
    const movieId = document.body.dataset.movieId;
    let currentPage = 1;
    let selectedRating = 0;
    let isLoading = false;

    console.log('🎬 Page loaded for movie ID:', movieId);

    // FIXED: Enhanced authentication check with better session handling
    const checkAuthStatus = async () => {
        try {
            // Check multiple endpoints to ensure we get the right session data
            const endpoints = [
                '/movie_detail/check-session',
                '/debug/session',
                '/api/profile/profile'
            ];

            for (const endpoint of endpoints) {
                try {
                    console.log(`🔐 Checking auth via: ${endpoint}`);
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
                        console.log(`🔐 Auth response from ${endpoint}:`, data);
                        
                        // Check different response formats
                        const isLoggedIn = data.isLoggedIn || 
                                         !!(data.user?.id || data.user?.userId) ||
                                         !!(data._id) || // Direct user object
                                         (data.success !== false && data.message !== 'Not authenticated');
                        
                        if (isLoggedIn) {
                            console.log('✅ User is authenticated via', endpoint);
                            return true;
                        }
                    } else if (response.status === 401) {
                        console.log(`❌ Not authenticated via ${endpoint}`);
                        continue;
                    }
                } catch (err) {
                    console.warn(`⚠️ Error checking ${endpoint}:`, err);
                    continue;
                }
            }
            
            // Final fallback: check if isLoggedIn cookie exists
            const isLoggedInCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('isLoggedIn='))
                ?.split('=')[1];
            
            if (isLoggedInCookie === 'true') {
                console.log('🍪 Found isLoggedIn cookie, assuming user is authenticated');
                return true;
            }
            
            console.log('❌ User is not authenticated');
            return false;
        } catch (error) {
            console.error('❌ Error checking auth status:', error);
            return false;
        }
    };

    // FIXED: Enhanced review form setup with better error handling
    const setupReviewForm = () => {
        const reviewForm = document.getElementById('reviewForm');
        const writeReviewBtn = document.getElementById('writeReviewBtn');
        const ratingStars = document.querySelectorAll('#ratingInput i');
        const textarea = reviewForm?.querySelector('textarea');
        const submitButton = reviewForm?.querySelector('button[type="submit"]');
        const spoilerCheckbox = document.getElementById('confirmRatingCheck');
       

        console.log('📝 Setting up review form...');

        if (!reviewForm || !writeReviewBtn || !ratingStars || !textarea || !submitButton) {
            console.warn('⚠️ Review form elements not found');
            return;
        }

        console.log('📝 Review form elements found successfully');

        // FIXED: Better toggle with authentication check
        writeReviewBtn.addEventListener('click', async () => {
            console.log('📝 Write review button clicked');
            
            // Show loading state
            const originalText = writeReviewBtn.textContent;
            writeReviewBtn.textContent = 'Checking...';
            writeReviewBtn.disabled = true;
            
            try {
                const isAuthenticated = await checkAuthStatus();
                console.log('🔐 Authentication status:', isAuthenticated);
                
                if (!isAuthenticated) {
                    const shouldLogin = confirm('You need to be logged in to write a review. Go to login page?');
                    if (shouldLogin) {
                        // Force page refresh to login to ensure clean session
                        window.location.href = '/account/login?redirect=' + encodeURIComponent(window.location.pathname);
                    }
                    return;
                }
                
                // User is authenticated, show the form
                reviewForm.classList.toggle('d-none');
                console.log('📝 Review form toggled');
                
            } catch (error) {
                console.error('❌ Error in write review click:', error);
                alert('Something went wrong. Please refresh the page and try again.');
            } finally {
                writeReviewBtn.textContent = originalText;
                writeReviewBtn.disabled = false;
            }
        });

        // Star rating functionality (unchanged)
        ratingStars.forEach((star, index) => {
            star.addEventListener('click', () => {
                selectedRating = index + 1;
                updateStarDisplay();
                console.log('⭐ Rating selected:', selectedRating);
            });

            star.addEventListener('mouseenter', () => {
                highlightStars(index + 1);
            });
        });

        document.getElementById('ratingInput').addEventListener('mouseleave', () => {
            updateStarDisplay();
        });

        // FIXED: Enhanced review submission with multiple endpoint fallbacks
        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Validation
            if (selectedRating === 0) {
                alert('Please select a rating');
                return;
            }
            if (!textarea.value.trim()) {
                alert('Please write your review');
                return;
            }
            if (!movieId) {
                alert('Movie ID is missing');
                return;
            }

            try {
                submitButton.disabled = true;
                submitButton.textContent = 'Submitting...';

                // Triple-check authentication before submitting
                const isAuthenticated = await checkAuthStatus();
                if (!isAuthenticated) {
                    alert('Your session has expired. Please log in again to submit your review.');
                    window.location.href = '/account/login?redirect=' + encodeURIComponent(window.location.pathname);
                    return;
                }

                const reviewData = {
                    movieId: movieId,
                    rating: selectedRating,
                    comment: textarea.value.trim(),
                    spoiler: spoilerCheckbox ? spoilerCheckbox.checked : false
                };

                console.log('📝 Submitting review:', reviewData);

                // FIXED: Try endpoints in the correct order with better error handling
                const endpoints = [
                    '/movie_detail/reviews',
                    //'/movie_detail/submit-review',
                
                ];

                let success = false;
                let lastError = null;

                for (const endpoint of endpoints) {
                    try {
                        console.log(`📝 Trying endpoint: ${endpoint}`);
                        
                        const response = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify(reviewData)
                        });

                        console.log(`📝 Response from ${endpoint}:`, response.status, response.statusText);

                        if (response.ok) {
                            const result = await response.json();
                            console.log('✅ Review submitted successfully:', result);
                            
                            if (result.success) {
                                alert('Review submitted successfully!');
                                
                                // Reset form
                                reviewForm.classList.add('d-none');
                                textarea.value = '';
                                selectedRating = 0;
                                updateStarDisplay();
                                if (spoilerCheckbox) spoilerCheckbox.checked = false;
                                
                                // Refresh reviews
                                loadReviews(1);
                                success = true;
                                break;
                            } else {
                                throw new Error(result.message || 'Submission failed');
                            }
                        } else if (response.status === 401) {
                            // Authentication error
                            console.log('❌ Authentication error on', endpoint);
                            const errorData = await response.json().catch(() => ({}));
                            alert('Your session has expired. Please log in again.');
                            window.location.href = '/account/login?redirect=' + encodeURIComponent(window.location.pathname);
                            return;
                        } else {
                            // Try next endpoint
                            const errorText = await response.text().catch(() => 'Unknown error');
                            lastError = `${endpoint}: ${response.status} - ${errorText}`;
                            console.warn(`❌ Failed with ${endpoint}:`, lastError);
                            continue;
                        }
                    } catch (err) {
                        lastError = `${endpoint}: ${err.message}`;
                        console.warn(`❌ Network error with ${endpoint}:`, err);
                        continue;
                    }
                }

                if (!success) {
                    throw new Error(lastError || 'All endpoints failed. Please try again.');
                }

            } catch (error) {
                console.error('❌ Review submission error:', error);
                alert(error.message || 'An error occurred while submitting your review. Please try again.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Review';
            }
        });
       
        function highlightStars(rating) {
            ratingStars.forEach((star, index) => {
                star.style.color = index < rating ? '#ffc107' : '#ddd';
            });
        }

        function updateStarDisplay() {
            highlightStars(selectedRating);
        }

        updateStarDisplay();
    };

    // Load and display reviews (unchanged but with better error handling)
    const loadReviews = async (page = 1) => {
        if (isLoading) return;
        isLoading = true;

        console.log(`📝 Loading reviews for page ${page}`);

        try {
            const endpoint = `/movie_detail/reviews/${movieId}?page=${page}`;
            
            console.log(`📝 Fetching reviews from: ${endpoint}`);
            const response = await fetch(endpoint, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.warn(`⚠️ Reviews endpoint failed: ${response.status} ${response.statusText}`);
                displayNoReviews();
                return;
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('❌ Server returned non-JSON response for reviews');
                displayNoReviews();
                return;
            }

            const result = await response.json();
            console.log(`📝 Reviews loaded:`, result);

            if (result && result.success) {
                if (result.reviews && result.reviews.length === 0 && page === 1) {
                    displayNoReviews();
                    return;
                }

                if (result.reviews && result.reviews.length > 0) {
                    displayReviews(result.reviews);
                    currentPage = page;
                    console.log(`📝 Displayed ${result.reviews.length} reviews`);
                } else {
                    displayNoReviews();
                }
            } else {
                console.warn('⚠️ Invalid reviews response format:', result);
                displayNoReviews();
            }
        } catch (error) {
            console.error('❌ Error loading reviews:', error);
            displayNoReviews();
        } finally {
            isLoading = false;
        }
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
        if (!container) {
            console.warn('⚠️ Reviews container not found');
            return;
        }
        
        if (currentPage === 1) {
            container.innerHTML = '';
        }

        reviews.forEach(review => {
            container.insertAdjacentHTML('beforeend', createReviewHTML(review));
        });

        setupReviewInteractions();
    };

    const createReviewHTML = (review) => {
        const reviewDate = new Date(review.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const username = review.username || review.user?.username || review.user || 'Anonymous';

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
                    ${review.spoiler ? `
                    <button class="btn btn-sm btn-outline-secondary toggle-blur-btn mt-2">
                        Show Spoiler
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    };

    const setupReviewInteractions = () => {
        document.querySelectorAll('.toggle-blur-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const contentBox = this.closest('.card-body').querySelector('.blurred-box');
                if (contentBox) {
                    contentBox.classList.toggle('show-content');
                    this.textContent = contentBox.classList.contains('show-content') 
                        ? 'Hide Spoiler' 
                        : 'Show Spoiler';
                }
            });
        });
    };

    // Load more reviews
    const loadMoreBtn = document.querySelector('.load-more-reviews-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            console.log('📝 Load more reviews clicked');
            loadReviews(currentPage + 1);
        });
    }

    // Initialize
    setupReviewForm();
    loadReviews();

    // Recommendations functionality (unchanged)
    let filteredData = [];

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async function loadMoviesAndRender() {
        try {
            console.log('🎬 Loading movie recommendations...');
            const response = await fetch('/api/discover/movies');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response for recommendations');
            }
            
            const data = await response.json();

            shuffleArray(data);
            filteredData = data;
            renderCards(1);
            console.log(`🎬 Loaded ${data.length} recommendations`);
        } catch (error) {
            console.error('❌ Failed to load movies:', error);
            const container = document.getElementById('Recommendation');
            if (container) {
                container.innerHTML = `
                    <div class="text-center w-100 py-5">
                        <h5 class="text-muted">Unable to load recommendations</h5>
                        <p class="text-muted">Please try refreshing the page</p>
                    </div>
                `;
            }
        }
    }

    function renderCards(page) {
        const container = document.getElementById('Recommendation');
        if (!container) {
            console.warn('⚠️ Recommendation container not found');
            return;
        }
        
        const itemsPerPage = 4;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(page * itemsPerPage, filteredData.length);
        const itemsToDisplay = filteredData.slice(startIndex, endIndex);

        let html = '';
        if (itemsToDisplay.length === 0) {
            html = `<div class="text-center w-100 py-5"><h5 class="text-muted">No movies found.</h5></div>`;
        } else {
            itemsToDisplay.forEach(item => {
                html += `
                <div class="col-md-3 col-6">
                    <div class="card h-100 text-center">
                        <a href="/movie_detail/${item.id}" class="text-decoration-none text-dark">
                            <img src="${item.image}" class="card-img-top" alt="${item.title}">
                            <h6 class="card-title" id="RecommendationCard-title">${item.title || item.name}</h6>
                            <div class="mb-4">${item.genres}<br></div>
                        </a>
                    </div>
                </div>
                `;
            });
        }
        container.innerHTML = html;
        console.log(`🎬 Rendered ${itemsToDisplay.length} recommendation cards`);
    }

    loadMoviesAndRender();
});