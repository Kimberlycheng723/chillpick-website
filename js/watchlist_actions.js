// Watchlist Actions JavaScript
document.addEventListener('DOMContentLoaded', function() {

    // Handle Mark as Completed buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('mark-btn')) {
            handleMarkCompleted(e.target);
        }
    });

    // Handle Remove buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-btn')) {
            handleRemoveItem(e.target);
        }
    });

    // Function to mark item as completed
    async function handleMarkCompleted(button) {
        try {
            const watchlistItem = button.closest('.watchlist-item');
            if (!watchlistItem) throw new Error('Could not find watchlist item');

            const itemData = extractItemData(watchlistItem);

            if (!confirm(`Mark "${itemData.title}" as completed? This will move it to your history.`)) return;

            button.disabled = true;
            button.textContent = 'Marking...';

            const response = await fetch('/api/watchlist/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: itemData.itemId, type: itemData.type })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showNotification('Item marked as completed and moved to history!', 'success');
                watchlistItem.style.transition = 'opacity 0.3s ease';
                watchlistItem.style.opacity = '0';
                setTimeout(() => {
                    watchlistItem.remove();
                    updateEmptyState();
                }, 300);
            } else {
                throw new Error(result.error || 'Failed to mark item as completed');
            }

        } catch (error) {
            console.error('Error marking item as completed:', error);
            showNotification('Error: ' + error.message, 'error');
            button.disabled = false;
            button.textContent = 'Mark as completed';
        }
    }

    // Function to remove item from watchlist
    async function handleRemoveItem(button) {
        try {
            const watchlistItem = button.closest('.watchlist-item');
            if (!watchlistItem) throw new Error('Could not find watchlist item');

            const itemData = extractItemData(watchlistItem);

            if (!confirm(`Remove "${itemData.title}" from your watchlist?`)) return;

            button.disabled = true;
            button.textContent = 'Removing...';

            const response = await fetch('/api/watchlist/remove', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: itemData.itemId, type: itemData.type })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showNotification('Item removed from watchlist!', 'success');
                watchlistItem.style.transition = 'opacity 0.3s ease';
                watchlistItem.style.opacity = '0';
                setTimeout(() => {
                    watchlistItem.remove();
                    updateEmptyState();
                }, 300);
            } else {
                throw new Error(result.error || 'Failed to remove item');
            }

        } catch (error) {
            console.error('Error removing item:', error);
            showNotification('Error: ' + error.message, 'error');
            button.disabled = false;
            button.textContent = 'Remove';
        }
    }

    // ✅ Modified function to use actual data-id
    function extractItemData(watchlistItem) {
        const title = watchlistItem.querySelector('h2').textContent.trim();
        const type = watchlistItem.getAttribute('data-type');
        const image = watchlistItem.querySelector('.item-image').src;
        const itemId = watchlistItem.getAttribute('data-id'); // 👈 this is now directly from HTML

        if (!itemId) {
            throw new Error('Missing itemId. Ensure each .watchlist-item has a data-id attribute.');
        }

        return { itemId, title, type, image };
    }

    // Notification and empty state functions remain unchanged
    function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            padding: 15px 20px; border-radius: 5px;
            color: white; z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: opacity 0.3s ease;
        `;

        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#28a745';
                break;
            case 'error':
                notification.style.backgroundColor = '#dc3545';
                break;
            default:
                notification.style.backgroundColor = '#17a2b8';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    function updateEmptyState() {
        const watchlistItems = document.querySelectorAll('.watchlist-item');
        const container = document.querySelector('main.container');

        if (watchlistItems.length === 0) {
            if (!document.querySelector('.empty-state')) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state text-center mt-5';
                emptyState.innerHTML = `
                    <div class="empty-icon mb-3">
                        <i class="bi bi-bookmark-heart" style="font-size: 4rem; color: #6c757d;"></i>
                    </div>
                    <h3 class="text-muted">Your watchlist is empty</h3>
                    <p class="text-muted">Start adding movies and books to keep track of what you want to watch or read!</p>
                    <a href="/discover" class="btn btn-primary">Discover Content</a>
                `;
                const filterWrapper = document.querySelector('.filter-wrapper');
                if (filterWrapper) {
                    filterWrapper.insertAdjacentElement('afterend', emptyState);
                } else {
                    container.appendChild(emptyState);
                }
            }
        }
    }

});
