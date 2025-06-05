document.addEventListener('DOMContentLoaded', () => {
    // Improved book ID extraction from URL path
    const getBookIdFromUrl = () => {
        const pathParts = window.location.pathname.split('/').filter(part => part.length > 0);
        // Find the book detail route pattern - assuming it's /book_detail/:id or /books/:id
        const bookDetailIndex = pathParts.findIndex(part => part === 'book_detail' || part === 'books');
        if (bookDetailIndex !== -1 && pathParts[bookDetailIndex + 1]) {
            return pathParts[bookDetailIndex + 1];
        }
        // Fallback to last non-empty part
        return pathParts[pathParts.length - 1];
    };
    
    const bookId = getBookIdFromUrl();
    console.log('Extracted Book ID:', bookId);
    console.log('Current URL:', window.location.pathname);
    
    let currentPage = 1;
    let selectedRating = 0;
    let isLoading = false;
    let isAllReviewsLoaded = false;
    let currentUserData = null; // Store current user data

    const loadMoreBtn = document.querySelector('.load-more-reviews-btn');

    // Enhanced auth check that also retrieves user data
    const checkAuthStatus = async () => {
        try {
            // First check if currentUser is already available from EJS template
            if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) {
                currentUserData = currentUser;
                return true;
            }

            // Fallback to API check
            const response = await fetch('/book_detail/check-session', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.isLoggedIn && data.user && data.user.id) {
                    currentUserData = data.user;
                    return true;
                }
            }

            currentUserData = null;
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            currentUserData = null;
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

        if (!reviewForm || !writeReviewBtn || !ratingStars || !textarea || !submitButton) {
            console.error('Review form elements not found');
            return;
        }

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
            } catch (error) {
                console.error('Error checking auth:', error);
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

            if (selectedRating === 0) {
                alert('Please select a rating');
                return;
            }
            if (!textarea.value.trim()) {
                alert('Please write your review');
                return;
            }
            if (!bookId) {
                alert('Book ID is missing');
                console.error('BookId is missing. Current URL:', window.location.pathname);
                return;
            }

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
                    bookId: bookId,
                    rating: selectedRating,
                    comment: textarea.value.trim(),
                    spoiler: spoilerCheckbox?.checked || false
                };

                console.log('Submitting review data:', reviewData);

                const response = await fetch('/book_detail/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(reviewData)
                });

                const result = await response.json();
                console.log('Review submission result:', result);

                if (response.ok && result.success) {
                    alert('Review submitted successfully!');
                    reviewForm.classList.add('d-none');
                    textarea.value = '';
                    selectedRating = 0;
                    if (spoilerCheckbox) spoilerCheckbox.checked = false;
                    updateStarDisplay();

                    // Refresh reviews
                    const container = document.getElementById('reviewsContainer');
                    if (container) container.innerHTML = '';
                    currentPage = 1;
                    loadReviews(1, true);
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (error) {
                console.error('Submit error:', error);
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
                    <p>Be the first to review this book!</p>
                    <small class="text-muted">Note: You need to be logged in to submit a review.</small>
                </div>
            `;
        }
    };

    const displayReviews = (reviews) => {
        const container = document.getElementById('reviewsContainer');
        if (!container) return;
        
        console.log('Displaying reviews:', reviews);
        
        reviews.forEach(review => {
            const reviewHTML = createReviewHTML(review);
            console.log('Generated HTML for review:', reviewHTML);
            container.insertAdjacentHTML('beforeend', reviewHTML);
        });
    };

    const createReviewHTML = (review) => {
        console.log('Creating HTML for review:', review);
        
        const reviewDate = new Date(review.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        const username = review.username || review.user?.username || 'Anonymous';
        const rating = review.rating || 0;
        const comment = review.comment || '';
        const spoiler = review.spoiler || false;
        const reviewId = review.id || review._id || '';
        const likeCount = review.likeCount || 0;
        
        console.log('Review ID being used:', reviewId);
        console.log('Like count:', likeCount);
        
        // Generate replies HTML if replies exist
        let repliesHTML = '';
        if (review.replies && review.replies.length > 0) {
            console.log('Found replies for review:', review.replies);
            repliesHTML = review.replies.map(reply => createReplyHTML(reply)).join('');
        }

        return `
            <div class="card mb-3 review-card" data-review-id="${reviewId}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <strong>${escapeHtml(username)}</strong>
                            <div class="rating-stars text-warning small">
                                ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                            </div>
                        </div>
                        <div class="d-flex align-items-center">
                            <small class="text-muted me-2">${reviewDate}</small>
                            ${spoiler ? '<button class="btn btn-sm btn-outline-secondary eye-btn" title="Show Spoiler"><i class="bi bi-eye"></i></button>' : ''}
                        </div>
                    </div>
                    <div class="review-content ${spoiler ? 'blurred-content' : ''}">
                        <p class="card-text">${escapeHtml(comment)}</p>
                    </div>
                    <div class="review-actions mt-3 d-flex gap-3">
                        <button class="btn btn-sm btn-outline-primary like-btn" data-review-id="${reviewId}">
                            <i class="bi bi-heart"></i>
                            <span class="like-count">${likeCount}</span>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary reply-btn">
                            <i class="bi bi-reply"></i> Reply
                        </button>
                    </div>
                    <div class="reply-form mt-3" style="display: none;">
                        <div class="mb-2">
                            <textarea class="form-control reply-textarea" rows="2" placeholder="Write your reply..."></textarea>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-primary reply-submit-btn">Submit</button>
                            <button class="btn btn-sm btn-secondary reply-cancel-btn">Cancel</button>
                        </div>
                    </div>
                    <div class="replies-section mt-3">${repliesHTML}</div>
                </div>
            </div>
        `;
    };

    const setupEventDelegation = () => {
        const container = document.getElementById('reviewsContainer');
        if (!container) return;

        // Event delegation for eye buttons (spoiler toggle)
        container.addEventListener('click', function(e) {
            const eyeBtn = e.target.closest('.eye-btn');
            if (eyeBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Eye button clicked');
                
                const reviewCard = eyeBtn.closest('.review-card');
                const contentBox = reviewCard.querySelector('.review-content');
                const icon = eyeBtn.querySelector('i');
                
                if (contentBox && icon) {
                    console.log('Before toggle - has show-content:', contentBox.classList.contains('show-content'));
                    
                    // Toggle the show-content class
                    contentBox.classList.toggle('show-content');
                    
                    console.log('After toggle - has show-content:', contentBox.classList.contains('show-content'));
                    
                    // Update button icon and title based on current state
                    if (contentBox.classList.contains('show-content')) {
                        icon.className = 'bi bi-eye-slash';
                        eyeBtn.title = 'Hide Spoiler';
                        console.log('Spoiler is now visible');
                    } else {
                        icon.className = 'bi bi-eye';
                        eyeBtn.title = 'Show Spoiler';
                        console.log('Spoiler is now hidden');
                    }
                } else {
                    console.error('Content box or icon not found');
                }
            }
        });

        // SIMPLIFIED: Event delegation for like buttons - only increment count
        container.addEventListener('click', async function(e) {
            const likeBtn = e.target.closest('.like-btn');
            if (likeBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('👍 Like button clicked!');
                
                const reviewCard = likeBtn.closest('.review-card');
                if (!reviewCard) {
                    console.error('Review card not found');
                    return;
                }
                
                const reviewId = reviewCard.dataset.reviewId;
                const countSpan = likeBtn.querySelector('.like-count');
                
                if (!reviewId) {
                    console.error('Review ID not found');
                    return;
                }
                
                if (!countSpan) {
                    console.error('Like count element not found');
                    return;
                }
                
                console.log('Processing like for review ID:', reviewId);
                
                // Disable button temporarily to prevent double clicks
                likeBtn.disabled = true;
                
                // Get current count for optimistic update
                const currentCount = parseInt(countSpan.textContent) || 0;
                const newCount = currentCount + 1;
                
                // Optimistic update - show new count immediately
                countSpan.textContent = newCount;
                
                try {
                    const response = await fetch(`/book_detail/reviews/${reviewId}/like`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('Like response:', data);
                    
                    if (data.success) {
                        // Update with actual count from server
                        const serverCount = parseInt(data.likeCount) || 0;
                        countSpan.textContent = serverCount;
                        console.log('Like count updated to:', serverCount);
                        
                        // Optional: Show brief feedback animation
                        likeBtn.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            likeBtn.style.transform = 'scale(1)';
                        }, 150);
                        
                    } else {
                        console.error('Like failed:', data.message);
                        // Revert optimistic update on failure
                        countSpan.textContent = currentCount;
                        alert(data.message || 'Failed to process like');
                    }
                } catch (error) {
                    console.error('Like request failed:', error);
                    // Revert optimistic update on error
                    countSpan.textContent = currentCount;
                    alert('Error processing like. Please try again.');
                } finally {
                    // Re-enable button
                    likeBtn.disabled = false;
                }
            }
        });
           
        // Event delegation for reply buttons
        container.addEventListener('click', async function(e) {
            if (e.target.closest('.reply-btn')) {
                e.preventDefault();
                const isAuthenticated = await checkAuthStatus();
                if (!isAuthenticated) {
                    alert('You need to be logged in to reply to reviews');
                    return;
                }

                const reviewCard = e.target.closest('.review-card');
                const replyForm = reviewCard.querySelector('.reply-form');
                
                if (replyForm) {
                    if (replyForm.style.display === 'none' || replyForm.style.display === '') {
                        replyForm.style.display = 'block';
                        const textarea = replyForm.querySelector('.reply-textarea');
                        if (textarea) textarea.focus();
                    } else {
                        replyForm.style.display = 'none';
                    }
                }
            }
        });

        // Event delegation for reply submit buttons
        container.addEventListener('click', async function(e) {
            if (e.target.closest('.reply-submit-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.reply-submit-btn');
                const reviewCard = btn.closest('.review-card');
                const reviewId = reviewCard.dataset.reviewId;
                const textarea = reviewCard.querySelector('.reply-textarea');
                const repliesSection = reviewCard.querySelector('.replies-section');
                const replyForm = reviewCard.querySelector('.reply-form');
                
                if (!textarea.value.trim()) {
                    alert('Please write a reply');
                    return;
                }

                try {
                    btn.disabled = true;
                    btn.textContent = 'Submitting...';

                    const response = await fetch('/book_detail/reviews/reply', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            reviewId,
                            content: textarea.value.trim()
                        })
                    });

                    const result = await response.json();
                    if (result.success) {
                        const replyHTML = createReplyHTML(result.reply);
                        if (repliesSection) {
                            repliesSection.insertAdjacentHTML('beforeend', replyHTML);
                        } else {
                            const newRepliesSection = document.createElement('div');
                            newRepliesSection.className = 'replies-section mt-3';
                            newRepliesSection.innerHTML = replyHTML;
                            reviewCard.querySelector('.card-body').appendChild(newRepliesSection);
                        }
                        
                        textarea.value = '';
                        replyForm.style.display = 'none';
                    } else {
                        alert(result.message || 'Failed to submit reply');
                    }
                } catch (error) {
                    console.error('Error submitting reply:', error);
                    alert('Error submitting reply. Please try again.');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Submit';
                }
            }
        });

        // Event delegation for reply cancel buttons
        container.addEventListener('click', function(e) {
            if (e.target.closest('.reply-cancel-btn')) {
                e.preventDefault();
                const replyForm = e.target.closest('.reply-form');
                const textarea = replyForm.querySelector('.reply-textarea');
                textarea.value = '';
                replyForm.style.display = 'none';
            }
        });
    };

    const createReplyHTML = (reply) => {
        const replyDate = new Date(reply.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        const replyUsername = reply.username || reply.user?.username || 'Anonymous';
        const replyContent = reply.content || '';
        
        return `
            <div class="reply-item border-start border-3 border-primary ps-3 mb-2">
                <div class="reply-header d-flex justify-content-between align-items-center mb-1">
                    <span class="reply-author fw-bold text-primary small">${escapeHtml(replyUsername)}</span>
                    <span class="reply-date text-muted small">${replyDate}</span>
                </div>
                <p class="reply-content mb-0 small">${escapeHtml(replyContent)}</p>
            </div>
        `;
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

        console.log(`Loading reviews for bookId: ${bookId}, page: ${page}`);

        try {
            const url = `/book_detail/reviews/${encodeURIComponent(bookId)}?page=${page}&includeReplies=true`;
            console.log('Fetching reviews from URL:', url);
            
            const response = await fetch(url, {
                credentials: 'include'
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            const result = await response.json();
            console.log('Load reviews response:', result);

            if (result.success) {
                if (result.reviews && result.reviews.length > 0) {
                    console.log('Found reviews:', result.reviews.length);
                    displayReviews(result.reviews);
                    currentPage = result.page;
                    updateLoadMoreButton(result.hasMore);
                } else if (page === 1) {
                    console.log('No reviews found for page 1');
                    displayNoReviews();
                } else {
                    console.log('No more reviews to load');
                    updateLoadMoreButton(false);
                }
            } else {
                console.error('Failed to load reviews:', result.message);
                if (page === 1) {
                    displayNoReviews();
                }
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            if (page === 1) {
                displayNoReviews();
            }
        } finally {
            isLoading = false;
        }
    };

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            let hasMore = true;
            let nextPage = currentPage + 1;

            while (hasMore) {
                try {
                    const response = await fetch(`/book_detail/reviews/${encodeURIComponent(bookId)}?page=${nextPage}&includeReplies=true`, {
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
                } catch (error) {
                    console.error('Error loading more reviews:', error);
                    hasMore = false;
                }
            }

            isAllReviewsLoaded = true;
            updateLoadMoreButton(false);
        });
    }

    // Enhanced debug logging
    console.log('=== BOOK DETAIL PAGE DEBUG ===');
    console.log('Book ID:', bookId);
    console.log('Current URL:', window.location.pathname);
    console.log('URL Parts:', window.location.pathname.split('/'));
    console.log('Current User:', typeof currentUser !== 'undefined' ? currentUser : 'Not available');

    // Validate bookId before proceeding
    if (!bookId || bookId.length === 0) {
        console.error('❌ Critical Error: Book ID could not be extracted from URL');
        console.error('URL:', window.location.pathname);
        console.error('Please check if the URL structure matches the expected pattern');
        
        // Show error to user
        const container = document.getElementById('reviewsContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger text-center">
                    <h5>Error: Unable to load reviews</h5>
                    <p>The book ID could not be determined from the current URL.</p>
                    <small class="text-muted">URL: ${window.location.pathname}</small>
                </div>
            `;
        }
        return; // Stop initialization
    }

    // Initialize everything
    setupReviewForm();
    setupEventDelegation();
    loadReviews();
});