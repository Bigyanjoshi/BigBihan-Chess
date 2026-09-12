# ♔ Chess.com Clone - Advanced Tournament Edition

A high-performance clone of the **Chess.com** interface with Grandmaster-style multi-premoves, real-time evaluation advantage bar, and multi-device multiplayer (Online via GitHub Pages & Local Wi-Fi / LAN).

---

## 🚀 How to Run & Play

### Option 1: Instant Local Play (Pass & Play on 1 Device)
- Double-click `index.html` or open it in any browser (Chrome, Edge, Firefox).
- No internet connection or installation required.

### Option 2: Local Wi-Fi / LAN Multi-Device Play (NPM / Node Server)
Play from your phone, brother's laptop, and tablet on the same home network:
1. Open PowerShell or Command Prompt in this directory:
   ```bash
   npm start
   ```
2. The server will output your local network address:
   ```
   ➜ Local PC:   http://localhost:3000
   ➜ Mobile/LAN: http://192.168.1.45:3000
   ```
3. Open `http://192.168.1.45:3000` on your brother's phone or laptop to play together in real time!

### Option 3: Free Global Online Play (GitHub Pages)
Play with friends across the world with zero server costs:
1. Create a repository on GitHub (e.g. `chesscom-clone`).
2. Push all the files in this directory to your GitHub repository.
3. In your GitHub repository:
   - Go to **Settings** > **Pages** (on the left menu).
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Select branch: `main` (or `master`), folder: `/(root)`, and click **Save**.
4. GitHub will give you a public URL (e.g., `https://yourusername.github.io/chesscom-clone`).
5. Open that link in your browser, click **🌐 Play Online** in the header.
6. Click **Copy Link** and send it to your friend anywhere in the world. As soon as they click the link, your browsers connect peer-to-peer over WebRTC automatically!

---

## ⚡ Multi-Premove System (YouTuber / GM Style)

- **How to Premove**: When it is your opponent's turn, make your moves by left-clicking and dragging or clicking squares.
- **Queueing Multiple Premoves**: You can queue 1, 2, 3, or more premoves in advance!
- **Progressive Red Highlight**:
  - **1st Premove**: Light red tint (`①`).
  - **2nd Premove**: Medium crimson tint (`②`).
  - **3rd+ Premove**: Deep dark red tint (`③`).
- **Instant Execution**: As soon as your opponent plays, your queued premove executes instantly (0.03s), and subsequent premoves follow.
- **Cancelling Premoves**:
  - **Right-click anywhere on the chessboard** to instantly cancel all queued premoves (standard Chess.com feature).
  - Or click the **Cancel Premoves** bar under the board.

---

## 📊 Real-Time Evaluation Bar ("Intelligence Sidebar")

- Positioned along the left of the board.
- Shows dynamic game advantage (`+1.8`, `-2.5`, `M2` checkmate threat, `0.0`).
- Smooth animation shifting towards White or Black.
- **ON / OFF Toggle**: Click the **Eval Bar: ON/OFF** button in the sidebar to toggle it anytime.

---

## 🤖 Play vs Computer (Bot Practice)

- Click **🤖 Play Bot** in the top header.
- Practice your speed and premove sequences against the computer engine offline!
