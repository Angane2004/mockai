# Technical Interview Clarification

## 🤔 What's Happening?

You mentioned "technical type works on ollama" - this should NOT happen!

## 📋 How Each Interview Type Works:

### ⚡ **Technical Interview** (Should be INSTANT)
- **AI Used:** NONE
- **Questions:** Pre-defined coding problems (Two Sum, Palindrome, etc.)
- **Interface:** Monaco code editor
- **Speed:** INSTANT (0-2 seconds)
- **NOT affected by Ollama/Gemini setting**

### 🤖 **Behavioral/HR Interview** (Uses AI)
- **AI Used:** Gemini or Ollama
- **Questions:** AI-generated based on job description
- **Interface:** Voice recording + text input
- **Speed:** 2-5s (Gemini) or 20-40s (Ollama)
- **AFFECTED by Ollama/Gemini setting**

### 📝 **Aptitude Interview** (Should be INSTANT)
- **AI Used:** NONE
- **Questions:** Pre-defined MCQ questions
- **Interface:** Multiple choice selector
- **Speed:** INSTANT (0-2 seconds)
- **NOT affected by Ollama/Gemini setting**

---

## ❓ Please Clarify:

**When you create an interview:**

1. **What "Interview Type" do you select in the dropdown?**
   - [ ] Technical
   - [ ] Technical Coding
   - [ ] Behavioral
   - [ ] HR
   - [ ] Aptitude

2. **What happens after you click "Start Interview"?**
   - [ ] Loading screen (how long?)
   - [ ] Code editor appears immediately
   - [ ] Voice recording interface

3. **If loading appears, what message do you see?**
   - "Generating Interview Questions"
   - "Loading Aptitude Test"
   - "Coding Interview Ready!"

This will help me understand if there's a bug!
