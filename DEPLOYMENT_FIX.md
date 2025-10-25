# Deployment Fix: Hybrid AI Service

## Problem
The application was configured to use **Ollama** (a local AI service running on `localhost:11434`), which caused errors when deployed because:
- Localhost services are not accessible in production
- Ollama requires local installation and cannot run on hosting platforms

## Solution
Created a **hybrid AI service** that automatically switches between:
- **Ollama (local)** - When running on your development machine
- **Gemini API (cloud)** - When deployed to production or when Ollama is unavailable

## Changes Made

### 1. New AI Service (`src/scripts/ai-service.ts`)
- Automatically detects if Ollama is available
- Falls back to Gemini API when Ollama is not running
- Provides unified interface for:
  - Question generation
  - Answer feedback
  - Seamless switching between AI providers

### 2. Updated Components
- **`mock-interview-page-ollama.tsx`** - Uses new AI service
- **`record-answer-ollama.tsx`** - Uses new AI service
- **`question-section-ollama.tsx`** - Graceful handling when Ollama unavailable

### 3. How It Works

#### Development (Local)
```
User starts interview
  ↓
AI Service checks for Ollama
  ↓
✅ Ollama found → Uses local AI (fast, private)
```

#### Production (Deployed)
```
User starts interview
  ↓
AI Service checks for Ollama
  ↓
❌ Ollama not found → Uses Gemini API (cloud)
```

## Environment Variables Required

Make sure you have set up your Gemini API key in the deployment platform:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### How to Set Environment Variables

#### For Firebase Hosting
1. Go to Firebase Console
2. Navigate to your project
3. Go to **Build** → **Functions** → **Configuration**
4. Add environment variable: `VITE_GEMINI_API_KEY`

#### For Netlify
1. Go to Netlify Dashboard
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add: `VITE_GEMINI_API_KEY`

#### For Vercel
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add: `VITE_GEMINI_API_KEY`

## Benefits

✅ **Works everywhere** - Local development and production
✅ **No configuration needed** - Automatically detects environment
✅ **Privacy in dev** - Uses local Ollama when available
✅ **Reliability in prod** - Uses Gemini API in the cloud
✅ **Graceful fallback** - Template-based responses if both fail

## Testing

### Local Testing (with Ollama)
1. Make sure Ollama is running: `ollama serve`
2. Run the app: `npm run dev`
3. Should see: "Generated X questions using Ollama (local)"

### Local Testing (without Ollama)
1. Stop Ollama service
2. Run the app: `npm run dev`
3. Should see: "Generated X questions using Gemini API"

### Production Testing
1. Deploy the app
2. Make sure `VITE_GEMINI_API_KEY` is set
3. Should automatically use Gemini API

## Next Steps

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to your hosting platform**:
   ```bash
   # For Firebase
   firebase deploy
   
   # For Netlify
   netlify deploy --prod
   
   # For Vercel
   vercel --prod
   ```

3. **Verify environment variables** are set in your hosting platform

4. **Test the deployed application** - The error should be gone!

## Notes

- The app will show which AI service is being used in toast notifications
- Report generation uses template-based analysis (works without any AI service)
- Voice tone analysis is done locally using algorithms (no AI required)
