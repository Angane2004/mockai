# Question Generation Speed - What's Happening?

## 🤔 **Important: What type of interview are you creating?**

There are **3 different interview types** with **completely different** generation speeds:

### ⚡ **1. Technical Interview (INSTANT - 0 seconds)**
- **Type:** Technical
- **Uses:** Pre-defined coding questions (no AI needed)
- **Questions:** "Two Sum", "Palindrome Number", etc.
- **Interface:** Code editor with Monaco
- **Speed:** INSTANT (already in the code)

### 🐌 **2. Behavioral/HR Interview (SLOW - 20-40 seconds with Ollama)**
- **Type:** Behavioral, HR, or General
- **Uses:** AI-generated questions (Ollama/Gemini)
- **Questions:** "Tell me about yourself", "Describe a challenge", etc.
- **Interface:** Voice recording + text input
- **Speed:** 20-40 seconds (because Ollama generates custom questions)

### 📝 **3. Aptitude Interview (INSTANT - 0 seconds)**
- **Type:** Aptitude
- **Uses:** Pre-defined MCQ questions
- **Questions:** Multiple choice (math, logic, reasoning)
- **Interface:** MCQ selector
- **Speed:** INSTANT

---

## 🎯 **What You Should Do:**

### If Creating **"Technical"** Interview:
✅ **Should be INSTANT** - No AI needed, questions are pre-loaded
- If it's slow, there's a bug I need to fix

### If Creating **"Behavioral"** or **"HR"** Interview:
⚠️ **Will ALWAYS be slow** with Ollama (20-40 seconds)
- This is normal - Ollama is generating custom questions
- **Only solution:** Use Gemini API (but your quota is exceeded)

---

## ❓ **Please Tell Me:**

1. **What interview type are you creating?**
   - [ ] Technical (coding questions)
   - [ ] Behavioral/HR (AI questions)
   - [ ] Aptitude (MCQ)

2. **What screen do you see?**
   - [ ] Code editor with coding problems (Monaco editor)
   - [ ] Microphone button with "Record Answer"
   - [ ] Multiple choice questions

3. **How long does it take?**
   - [ ] Instant (< 5 seconds)
   - [ ] Slow (20-40 seconds)

This will help me understand if there's a bug or if it's working as expected!
