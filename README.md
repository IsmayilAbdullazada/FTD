# Johns Hopkins FTD Care Partner Community

Secure, clinician-moderated knowledge exchange and peer support platform for Frontotemporal Dementia (FTD) care partners, featuring real-time clinical guidance, private clinician communication with Dr. Seema Gulyani, and regional support cohorts.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run the development server (runs Express backend + Vite frontend)
npm run dev

# App runs locally at http://localhost:3000
```

---

## 📦 How to Push this Project to GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `ftd-care-partner-circle`). Do not initialize with a README if you want to push this existing code.
2. In your local terminal, navigate to this project folder and run:

```bash
# Initialize git repository
git init

# Add all project files
git add .

# Create initial commit
git commit -m "Initial commit: Johns Hopkins FTD Care Partner Community"

# Set branch name to main
git branch -M main

# Link to your GitHub repository (replace with your repository URL)
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git

# Push code to GitHub
git push -u origin main
```

---

## 🌐 Deployment Options

Because this app includes an **Express backend** (`server.ts`) and a **React Vite frontend** in TypeScript, here are the easiest ways to host it:

### Option 1: Render.com (Recommended & Free Tier)
1. Go to [Render.com](https://render.com) and sign in with GitHub.
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Set the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start` (or `npx tsx server.ts`)
   - **Port:** `3000` (or leave default `$PORT`)
5. Click **Deploy Web Service**. Render will automatically build and deploy whenever you push to GitHub!

---

### Option 2: Railway.app
1. Go to [Railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository. Railway automatically detects `package.json` and runs `npm run build` and `npm start`.

---

### Option 3: GitHub Pages (Client SPA Mode)
GitHub Pages only hosts static files (HTML/CSS/JS). If you want to deploy purely on GitHub Pages:
1. In `vite.config.ts`, set `base: '/<YOUR-REPO-NAME>/'`.
2. Build the static assets:
   ```bash
   npm run build
   ```
3. Use the `gh-pages` tool or enable **GitHub Actions Pages** in your repo Settings under **Pages** -> **Source: GitHub Actions**. (The frontend has built-in local client fallbacks so all UI features, triage, and mock data function in client-only mode as well).
