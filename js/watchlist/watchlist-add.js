// Use this on discover/detail pages
async function addToWatchlist(itemData) {
  const response = await fetch('/api/watchlist/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });
  return await response.json();
}

// Example usage on a button click:
document.querySelector('.add-to-watchlist').addEventListener('click', async () => {
  const itemData = {
    itemId: '123', 
    type: 'movie',
    title: 'Inception',
    imageUrl: '/posters/inception.jpg'
  };
  
  await addToWatchlist(itemData);
  alert('Added to watchlist!');
});