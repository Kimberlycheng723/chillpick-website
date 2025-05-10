document.addEventListener('DOMContentLoaded', function() {
    const shareBtn = document.querySelector('.share-btn');
    
    shareBtn.addEventListener('click', function() {
        if (navigator.share) {
            navigator.share({
                title: 'My Watchlist',
                text: 'Check out my watchlist on ChillPick!',
                url: window.location.href
            })
            .catch(err => {
                console.log('Error sharing:', err);
                fallbackShare();
            });
        } else {
            fallbackShare();
        }
    });

    function fallbackShare() {
        // Fallback for browsers that don't support Web Share API
        const shareUrl = window.location.href;
        alert('Share this link: ' + shareUrl);
        // Or copy to clipboard:
        // navigator.clipboard.writeText(shareUrl).then(() => alert('Link copied!'));
    }
});






//watchlist-filter 
document.addEventListener('DOMContentLoaded', function() {
    // Debugging check
    console.log("Filter script loaded");
    
    try {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const watchlistItems = document.querySelectorAll('.watchlist-item');
        
        if (!filterButtons.length || !watchlistItems.length) {
            console.error("Couldn't find filter buttons or watchlist items");
            return;
        }

        function applyFilter(filterValue) {
            watchlistItems.forEach(item => {
                const itemType = item.dataset.type;
                
                if (!itemType) {
                    console.warn("Item missing data-type attribute:", item);
                    return;
                }

                const shouldShow = filterValue === 'all' || itemType === filterValue;
                item.style.display = shouldShow ? 'flex' : 'none';
                
                // Debug each item
                console.log(`Item: ${item.querySelector('h2').textContent}, Type: ${itemType}, Show: ${shouldShow}`);
            });
        }

        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const filterValue = this.textContent.trim().toLowerCase();
                console.log(`Filtering by: ${filterValue}`);
                
                applyFilter(filterValue);
            });
        });

        // Initialize
        const defaultFilter = document.querySelector('.filter-btn.active');
        if (defaultFilter) {
            defaultFilter.click();
        } else {
            applyFilter('all');
            console.warn("No active filter found, defaulting to 'All'");
        }
        
    } catch (error) {
        console.error("Filter error:", error);
    }
});

//History filter
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.history-filters .filter-btn');
    const historyItems = document.querySelectorAll('.history-item');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const filterValue = this.textContent.trim().toLowerCase();
            
            // Filter items
            historyItems.forEach(item => {
                const itemType = item.dataset.type;
                
                if (filterValue === 'all' || itemType === filterValue) {
                    item.style.display = 'flex';
                    item.nextElementSibling.style.display = 'block'; // Keep HR visible
                } else {
                    item.style.display = 'none';
                    item.nextElementSibling.style.display = 'none'; // Hide HR too
                }
            });
        });
    });

    // Initialize with "All" filter active
    document.querySelector('.filter-btn.active').click();
});