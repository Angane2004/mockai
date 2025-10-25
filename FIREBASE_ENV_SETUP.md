# Firebase Environment Variables Setup

## ⚠️ IMPORTANT: Set Gemini API Key

Your app is now deployed, but you need to configure the Gemini API key for it to work in production.

## Option 1: Using Firebase Environment Configuration (Recommended)

Since Firebase Hosting doesn't support environment variables directly, you need to build with the environment variable:

### Step 1: Create `.env.production` file

Create a file named `.env.production` in your project root:

```env
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Step 2: Rebuild and Redeploy

```bash
# Build with production environment
pnpm run build

# Deploy to Firebase
firebase deploy --only hosting
```

## Option 2: Using Firebase Functions (For Dynamic Config)

If you want to keep the API key server-side, you'll need to set up Firebase Functions:

### Step 1: Initialize Firebase Functions

```bash
firebase init functions
```

### Step 2: Set Environment Variable

```bash
firebase functions:config:set gemini.api_key="your_actual_gemini_api_key_here"
```

### Step 3: Create an API endpoint in Functions

This is more complex and requires additional setup.

## 🔑 Where to Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API Key"
3. Create a new API key or use an existing one
4. Copy the API key

## ✅ Recommended Approach

**For now, use Option 1:**

1. Create `.env.production` file with your Gemini API key
2. Rebuild: `pnpm run build`
3. Redeploy: `firebase deploy --only hosting`

## 🧪 Testing

After deployment with the API key:

1. Visit your deployed URL: https://ai-mock-interview-f212d.web.app
2. Create a new interview
3. Start the interview
4. You should see: "Generated X questions using Gemini API"
5. The error should be gone! ✅

## 📝 Current Deployment Status

- ✅ Build successful
- ✅ Deployed to Firebase
- ⚠️ Needs Gemini API key configuration
- 🔗 URL: https://ai-mock-interview-f212d.web.app

## 🔍 How the Hybrid System Works

```
Production (Deployed)
  ↓
Checks for Ollama (localhost:11434)
  ↓
❌ Not found (expected in production)
  ↓
Falls back to Gemini API
  ↓
✅ Uses VITE_GEMINI_API_KEY from build
```

## 🚨 Security Note

- Never commit `.env.production` to git
- Add it to `.gitignore`
- Keep your API keys secure
