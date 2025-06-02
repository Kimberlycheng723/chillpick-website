// Functions for watchlist operations
async function loadWatchlist() {
  try {
    const response = await fetch('/api/watchlist');
    if (!response.ok) throw new Error('Failed to load watchlist');
    
    const items = await response.json();
    const container = document.getElementById('watchlist-container');
    
    if (items.length === 0) {
      container.innerHTML = '<p class="empty-message">Your watchlist is empty</p>';
      return;
    }
    
    container.innerHTML = items.map(item => `
      <div class="watchlist-item" data-id="${item._id}">
        <img src="${item.imageUrl}" alt="${item.title}">
        <div class="item-info">
          <h3>${item.title}</h3>
          <p>${item.description.substring(0, 100)}...</p>
          <div class="item-actions">
            <button class="mark-completed">Mark Completed</button>
            <button class="remove-item">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
    
    addWatchlistEventListeners();
    
  } catch (error) {
    console.error('Error loading watchlist:', error);
    showToast('Failed to load watchlist', 'error');
  }
}

function addWatchlistEventListeners() {
  // Remove item functionality
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', async function() {
      const itemId = this.closest('.watchlist-item').dataset.id;
      await removeFromWatchlist(itemId);
      loadWatchlist(); // Refresh the list
    });
  });
  
  // Mark as completed functionality
  document.querySelectorAll('.mark-completed').forEach(btn => {
    btn.addEventListener('click', async function() {
      const itemId = this.closest('.watchlist-item').dataset.id;
      await markAsCompleted(itemId);
      loadWatchlist(); // Refresh the list
    });
  });
}

async function removeFromWatchlist(itemId) {
  try {
    const response = await fetch(`/api/watchlist/${itemId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to remove item');
    showToast('Item removed from watchlist');
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    return false;
  }
}

async function markAsCompleted(itemId) {
  try {
    // First get the item details
    const itemResponse = await fetch(`/api/watchlist/${itemId}`);
    if (!itemResponse.ok) throw new Error('Failed to get item details');
    const item = await itemResponse.json();
    
    // Add to history
    const historyResponse = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item)
    });
    
    if (!historyResponse.ok) throw new Error('Failed to mark as completed');
    
    // Remove from watchlist
    await removeFromWatchlist(itemId);
    showToast('Item moved to history');
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    return false;
  }
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadWatchlist();
});