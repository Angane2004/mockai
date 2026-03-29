# 🚨 DEBUGGING CHECKLIST - Questions Not Generating

## Step 1: Which Interview Type Are You Creating?

Please tell me EXACTLY which option you're selecting:

- [ ] **Technical** (should show code editor)
- [ ] **Technical Coding** (should show code editor)
- [ ] **Behavioral** (should show AI questions)
- [ ] **HR** (should show AI questions)
- [ ] **Aptitude** (should show MCQ)

---

## Step 2: Open Browser Console (CRITICAL!)

1. Press **F12** on your keyboard
2. Click **"Console"** tab
3. Keep it open while creating interview

---

## Step 3: Create Interview & Watch Console

1. Click "Add New Interview"
2. Select interview type
3. Fill in details
4. Click "Start Interview"
5. **WATCH THE CONSOLE** - copy ALL messages

---

## Step 4: What Do You See?

### Scenario A: Loading Screen Forever
- **Screen shows:** "Generating Interview Questions" spinning forever
- **Console might show:** Errors or stuck messages
- **Action:** Copy console errors and send them to me

### Scenario B: Toast Appears, Nothing Else
- **Screen shows:** "Coding Interview Ready!" toast, then blank
- **Console should show:** `🔍 DEBUG - Coding questions set:` message
- **Action:** Tell me what the debug message says (count, questions)

### Scenario C: Errors in Console
- **Screen shows:** May look normal or frozen
- **Console shows:** Red error messages
- **Action:** Copy the EXACT error message

### Scenario D: No Toast, No Questions
- **Screen shows:** Just interview form or blank page
- **Console shows:** Might be silent or have errors
- **Action:** Hard refresh (`Ctrl + Shift + R`) and try again

---

## Step 5: Quick Fixes to Try

### Fix 1: Hard Refresh
```
Ctrl + Shift + R
```
This clears cached code.

### Fix 2: Check Dev Server
Look at your terminal where `pnpm run dev` is running.
- Is it showing errors?
- Did it restart after `.env.local` change?

### Fix 3: Restart Dev Server
```bash
Ctrl + C  # Stop server
pnpm run dev  # Start again
```

Then hard refresh browser: `Ctrl + Shift + R`

---

## Step 6: Report Back

Please tell me:
1. **Interview type selected:** _________
2. **What happens:** _________
3. **Console messages:** _________
4. **Any red errors:** _________

This will help me fix the exact issue!
