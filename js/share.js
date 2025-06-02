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




document.addEventListener('DOMContentLoaded', function () {
    // Share Button
    const shareBtn = document.querySelector('.share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        if (navigator.share) {
          navigator.share({
            title: document.title,
            text: 'Check this out on ChillPick!',
            url: window.location.href
          }).catch(err => {
            console.log('Error sharing:', err);
            alert('Share this link: ' + window.location.href);
          });
        } else {
          alert('Share this link: ' + window.location.href);
        }
      });
    }
  
    // General Filter Handler
    const filterButtons = document.querySelectorAll('.filter-btn');
    const contentItems = document.querySelectorAll('.watchlist-item, .history-item');
  
    function applyFilter(type) {
      contentItems.forEach(item => {
        const itemType = item.dataset.type;
        const hr = item.nextElementSibling?.tagName === 'HR' ? item.nextElementSibling : null;
        const show = type === 'all' || itemType === type;
        item.style.display = show ? 'flex' : 'none';
        if (hr) hr.style.display = show ? 'block' : 'none';
      });
    }
  
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        applyFilter(this.dataset.filter);
      });
    });
  
    // Apply default filter on page load
    document.querySelector('.filter-btn.active')?.click();
  });