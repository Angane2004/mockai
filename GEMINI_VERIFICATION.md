## 🚀 Forcing Gemini API - Quick Verification Guide

Your `.env.local` is already configured correctly with `VITE_DISABLE_OLLAMA=true`.

**If questions are still slow, follow these steps:**

### Step 1: Hard Refresh Browser
1. Open your app in the browser
2. Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
3. This clears the cache and reloads with fresh code

### Step 2: Verify Gemini is Active
1. Press `F12` to open Developer Console
2. Go to the "Console" tab
3. Create a new interview
4. Look for this message: `"⚡ AI Service: Ollama disabled via environment variable, using Gemini API (FAST)"`

### Step 3: If Still Using Ollama
If you see "Using Ollama (local)" instead:

**Option A: Clear Browser Cache Completely**
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page

**Option B: Restart Dev Server**
1. Stop: `Ctrl + C` in terminal
2. Start: `pnpm run dev`
3. Hard refresh browser: `Ctrl + Shift + R`

### Step 4: Expected Speed
- **With Gemini:** 2-5 seconds ⚡
- **With Ollama:** 20-40 seconds 🐌

---

## 💡 Quick Test
Create a new interview and time how long it takes:
- **< 10 seconds** → Gemini is working ✅
- **> 20 seconds** → Still using Ollama, try steps above ❌

If still slow after all steps, let me know what console message you see!
