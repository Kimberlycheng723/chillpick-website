document.addEventListener('DOMContentLoaded', async () => {
  // Load watchlist items
  const response = await fetch('/api/watchlist');
  const items = await response.json();
  
  // Render items
  const container = document.getElementById('watchlist-container');
  container.innerHTML = items.map(item => `
    <div class="watchlist-item" data-id="${item._id}">
      <img src="${item.imageUrl}" alt="${item.title}">
      <h3>${item.title}</h3>
      <button class="remove-btn">Remove</button>
      <button class="complete-btn">Mark Completed</button>
    </div>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.closest('.watchlist-item').dataset.id;
      await fetch(`/api/watchlist/${itemId}`, { method: 'DELETE' });
      btn.closest('.watchlist-item').remove();
    });
  });
});