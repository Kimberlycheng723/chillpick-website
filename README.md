# chillpick-website
🚧 This project is a work in progress.

---

## 📦 1. Install Dependencies

Make sure you have **Node.js** installed. Then, install the project dependencies:

```bash
npm install
```

---
> ℹ️ This project uses `cookie-parser` to simulate login state.  
> If it's not already installed, run:  
> 
> ```bash
> npm install cookie-parser
> ```
## ▶️ 2. Run the Application

Start the server with:

```bash
node server.js
```

The app will run at:  
[http://localhost:3000](http://localhost:3000)

---

## 🔐 3. Developer Login Toggle (Simulated Authentication)

To simulate login/logout without a real login system, use the URL toggle:

- ✅ **Simulate a logged-in user:**  
  [http://localhost:3000/?login=true](http://localhost:3000/?login=true)  
  → The navbar shows: `Home`, `Dashboard`, `Discover`, `Watchlist`, and profile picture.

- 🚫 **Simulate a logged-out user:**  
  [http://localhost:3000/?login=false](http://localhost:3000/?login=false)  
  → The navbar will only show `Sign In`.

---

## 💡 Development Tips

- Restart the server using `Ctrl + C` and re-run `node server.js` after changes.
- Use the `?login=true` or `?login=false` in the URL to simulate login/logout.
- You can log `res.locals` in middleware to debug login state.

---


