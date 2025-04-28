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
