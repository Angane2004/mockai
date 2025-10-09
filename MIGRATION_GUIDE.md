# Migration Guide: From Gemini API to Ollama (Llama 3)

This guide will help you migrate your Smart AI Interview Assistant from Gemini API to local Ollama Llama 3 model.

## ✅ Prerequisites Completed

- [x] **Ollama Installation**: Ollama version 0.12.3 is installed and running
- [x] **Llama 3 Model**: The `llama3:latest` model (4.7 GB) has been downloaded
- [x] **Service Status**: Ollama service is running on `http://localhost:11434`

## 📁 New Files Created

### 1. Core Integration Files
- `src/scripts/ollama.ts` - Main Ollama service integration
- `src/components/record-answer-ollama.tsx` - Updated component for feedback generation
- `src/routes/mock-interview-page-ollama.tsx` - Updated page for question generation

### 2. Backend Example (Optional)
- `backend-example/server.js` - Node.js Express server for Ollama
- `backend-example/package.json` - Dependencies for backend server

## 🔄 Migration Steps

### Step 1: Replace Question Generation

**Current (Gemini)**: `src/routes/mock-interview-page.tsx`
```typescript
// OLD - Direct Gemini API call
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${
    import.meta.env.VITE_GEMINI_API_KEY
  }`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
    }),
  }
);
```

**New (Ollama)**: Replace with `mock-interview-page-ollama.tsx`
```typescript
// NEW - Local Ollama service
import { ollamaService } from "@/scripts/ollama";

const questions = await ollamaService.generateInterviewQuestions({
  objective: interview.objective,
  interviewType: interview.interviewType,
  depthLevel: interview.depthLevel,
  numQuestions: interview.numQuestions || 5,
  resumeText: resumeText
});
```

### Step 2: Replace Feedback Generation

**Current (Gemini)**: `src/components/record-answer.tsx`
```typescript
// OLD - Gemini chat session
import { chatSession } from "@/scripts";
const aiResult = await chatSession.sendMessage(prompt);
```

**New (Ollama)**: Replace with `record-answer-ollama.tsx`
```typescript
// NEW - Ollama service
import { ollamaService } from "@/scripts/ollama";
const aiResult = await ollamaService.generateFeedback(
  question,
  userAnswer,
  interviewType,
  depthLevel
);
```

### Step 3: Update Your Routes

#### Option A: Direct Replacement (Recommended)
Replace your existing imports in route files:

**In your main App.tsx or routing file:**
```typescript
// OLD
import { MockInterviewPage } from "@/routes/mock-interview-page";
import { RecordAnswer } from "@/components/record-answer";

// NEW
import { MockInterviewPageOllama } from "@/routes/mock-interview-page-ollama";
import { RecordAnswerOllama } from "@/components/record-answer-ollama";
```

#### Option B: Gradual Migration
Keep both versions and use feature flags or environment variables:

```typescript
const USE_OLLAMA = import.meta.env.VITE_USE_OLLAMA === 'true';

// In your components
{USE_OLLAMA ? (
  <RecordAnswerOllama {...props} />
) : (
  <RecordAnswer {...props} />
)}
```

### Step 4: Update Dependencies (Frontend)

No new dependencies are required! The Ollama integration uses the standard `fetch` API.

### Step 5: Environment Variables (Optional)

Add to your `.env` file:
```env
# Optional - to toggle between Gemini and Ollama
VITE_USE_OLLAMA=true

# Optional - if you want to configure Ollama URL
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3
```

## 🔧 Backend Integration (Optional)

If you prefer a backend service approach:

### Install and Run Backend
```bash
cd backend-example
npm install
npm start
```

### Update Frontend to Use Backend
```typescript
// Instead of direct Ollama calls, use your backend
const response = await fetch('http://localhost:3001/api/generate-questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    objective,
    interviewType,
    depthLevel,
    numQuestions,
    resumeText
  })
});
```

## ⚡ Performance Comparison

| Feature | Gemini API | Ollama (Local) |
|---------|------------|----------------|
| **Internet Required** | ✅ Yes | ❌ No |
| **Privacy** | Data sent to Google | 🔒 100% Local |
| **Speed** | ~2-3 seconds | ~5-15 seconds* |
| **Cost** | API usage fees | Free |
| **Reliability** | Depends on internet | Offline capable |
| **Model Size** | N/A | 4.7 GB storage |

*Speed depends on your hardware (CPU/GPU/RAM)

## 🧪 Testing Your Migration

### 1. Test Question Generation
```bash
# Test Ollama directly
ollama run llama3 "Generate 3 interview questions for a software developer"
```

### 2. Test API Health
Visit your application and check:
- Questions generate successfully
- Feedback is provided after answering
- No network errors in browser console

### 3. Verify Ollama Service
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags
```

## 🐛 Troubleshooting

### Common Issues:

1. **"Ollama service is not available"**
   - Solution: Restart Ollama service
   ```bash
   ollama serve
   ```

2. **Questions not generating**
   - Check if llama3 model is available: `ollama list`
   - Restart Ollama if needed

3. **Slow response times**
   - Normal for first run (model loading)
   - Consider using smaller model like `llama3:8b` for faster responses

4. **JSON parsing errors in feedback**
   - The service includes fallback responses
   - Check Ollama logs for detailed error info

## 🚀 Benefits of Migration

### ✅ Advantages:
- **Privacy**: All data processing happens locally
- **Offline capability**: Works without internet
- **No API costs**: Free to use
- **Full control**: Customize prompts and model behavior
- **Better security**: Sensitive data never leaves your machine

### ⚠️ Considerations:
- **Hardware requirements**: Requires decent RAM (8GB+ recommended)
- **Initial setup**: One-time model download (4.7 GB)
- **Response time**: Slightly slower than cloud APIs initially
- **Model updates**: Manual process vs automatic API updates

## 🔄 Rollback Plan

If you need to rollback to Gemini:

1. Keep your original files as backups
2. Set `VITE_USE_OLLAMA=false` in environment
3. Revert to original component imports

## 📞 Support

If you encounter any issues:
1. Check Ollama is running: `ollama list`
2. Verify model is available: `ollama run llama3 "test"`
3. Check browser console for errors
4. Review this migration guide

## 🎉 Next Steps

Once migration is complete:
1. Test thoroughly with different question types
2. Fine-tune prompts for better responses
3. Consider using additional models for specialized interviews
4. Explore Ollama's other features like model customization

---

**Congratulations!** You've successfully migrated from Gemini API to local Ollama Llama 3. Your Smart AI Interview Assistant now runs completely offline while maintaining all its functionality!