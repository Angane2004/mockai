

import { ollamaService } from './ollama';
import { chatSession } from './index';

interface AIResponse {
  ratings: number;
  feedback: string;
  correct_ans: string;
}

export interface AptitudeMCQ {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'Mathematics' | 'Logical Reasoning' | 'Analytical' | 'Quantitative Aptitude' | 'Verbal Reasoning';
  marks: number;
}

class AIService {
  private useOllama = false;
  private ollamaChecked = false;

  /**
   * Check if Ollama is available
   * OPTIMIZED: Skip health check if VITE_DISABLE_OLLAMA is set
   */
  async checkOllamaAvailability(): Promise<boolean> {
    // If already checked, return cached result
    if (this.ollamaChecked) {
      return this.useOllama;
    }

    // Check if Ollama is explicitly disabled via environment variable
    if (import.meta.env.VITE_DISABLE_OLLAMA === 'true') {
      console.log('⚡ AI Service: Ollama disabled via environment variable, using Gemini API (FAST)');
      this.useOllama = false;
      this.ollamaChecked = true;
      return false;
    }

    try {
      console.log('🔍 Checking Ollama availability (one-time check)...');

      // Quick check: Just try to use Ollama once
      const testResult = await Promise.race([
        ollamaService.checkHealth(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 2000))
      ]) as boolean;

      this.useOllama = testResult;
      this.ollamaChecked = true;
      console.log(`✅ AI Service: Using ${this.useOllama ? 'Ollama (local)' : 'Gemini API (cloud)'}`);
      return this.useOllama;
    } catch (error) {
      this.useOllama = false;
      this.ollamaChecked = true;
      console.log('⚡ AI Service: Ollama not available or slow, using Gemini API (FAST)');
      return false;
    }
  }

  /**
   * Get type-specific prompt instructions for each interview type
   */
  private getTypeSpecificPromptInstructions(interviewType: string, numQuestions: number): string {
    const type = interviewType.toLowerCase().trim();

    if (type === 'technical code' || type === 'technical coding') {
      return `You MUST generate coding/programming problem questions ONLY.
Each question must describe a specific coding challenge, algorithm problem, or data structure task.
Questions should be like: "Write a function that...", "Given an array of..., find...", "Implement a...", "Solve the problem of..."
DO NOT generate theory questions. DO NOT ask "what is..." or "explain..." questions.
Every question must require writing actual code to solve.
Examples of GOOD questions:
- "Write a function to find the longest palindromic substring in a given string."
- "Given an array of integers, find two numbers that add up to a specific target. Return their indices."
- "Implement a function that checks if a binary tree is balanced."`;
    }

    if (type === 'technical theory') {
      return `Generate technical theory and conceptual questions ONLY.
Each question should test understanding of CS concepts, programming principles, frameworks, or technologies.
Questions should ask candidates to explain, compare, or describe technical concepts.
Examples: "Explain the difference between...", "What are the advantages of...", "How does ... work internally?"
DO NOT generate coding problems or algorithm challenges.`;
    }

    if (type === 'behavioral' || type === 'hr round') {
      return `Generate behavioral interview questions ONLY using the STAR method format.
Each question must ask about past experiences, situations, and how the candidate handled them.
Questions should start with: "Tell me about a time when...", "Describe a situation where...", "Give an example of..."
Focus on: leadership, teamwork, conflict resolution, problem-solving, adaptability, communication, and work ethic.
DO NOT ask technical questions. DO NOT ask about coding or system design.
Examples:
- "Tell me about a time when you had to handle a difficult team member. What was the situation and how did you resolve it?"
- "Describe a situation where you failed at a task. What happened and what did you learn from it?"
- "Give an example of when you had to meet a tight deadline. How did you prioritize your work?"`;
    }

    if (type === 'system design') {
      return `Generate system design interview questions ONLY.
Each question should ask the candidate to design a system, architecture, or infrastructure.
Questions should involve: scalability, load balancing, database design, caching, microservices, API design, distributed systems.
Questions should start with: "Design a...", "How would you architect...", "Explain how you would build..."
DO NOT ask coding problems or behavioral questions.
Examples:
- "Design a URL shortener service like bit.ly. How would you handle millions of redirects per day?"
- "How would you design the backend for a real-time chat application like WhatsApp?"
- "Design a news feed system similar to Twitter. How would you handle ranking and real-time updates?"`;
    }

    if (type === 'mixed' || type === 'mixed interview') {
      // Distribute questions across types
      const coding = Math.max(1, Math.floor(numQuestions * 0.25));
      const theory = Math.max(1, Math.floor(numQuestions * 0.25));
      const sysDesign = Math.max(1, Math.floor(numQuestions * 0.25));
      const behavioral = numQuestions - coding - theory - sysDesign;

      return `Generate a MIXED set of interview questions with the following distribution:
- ${coding} CODING question(s): Programming problems that require writing code (e.g., "Write a function to...")
- ${theory} TECHNICAL THEORY question(s): Conceptual questions about CS fundamentals (e.g., "Explain the difference between...")
- ${sysDesign} SYSTEM DESIGN question(s): Architecture and design questions (e.g., "Design a system that...")
- ${behavioral} BEHAVIORAL question(s): Past experience questions using STAR format (e.g., "Tell me about a time when...")

IMPORTANT: You MUST include questions from ALL four categories above. Label each question with its type like: [CODING], [THEORY], [SYSTEM DESIGN], or [BEHAVIORAL] at the start.`;
    }

    // Default / fallback for unknown types
    return `Generate interview questions appropriate for a "${interviewType}" interview.
Each question should be clear, specific, and professional.`;
  }

  /**
   * Generate interview questions with type-specific prompts
   */
  async generateInterviewQuestions(
    interviewData: {
      objective: string;
      interviewType: string;
      depthLevel: string;
      numQuestions: number;
      resumeText?: string;
      jobDescription?: string;
    }
  ): Promise<string[]> {
    await this.checkOllamaAvailability();

    if (this.useOllama) {
      try {
        return await ollamaService.generateInterviewQuestions(interviewData);
      } catch (error) {
        console.warn('Ollama failed, falling back to Gemini:', error);
        this.useOllama = false;
      }
    }

    // Use Gemini API
    return await this.generateQuestionsWithGemini(interviewData);
  }

  /**
   * Generate questions using Gemini API with type-specific prompts
   */
  private async generateQuestionsWithGemini(
    interviewData: {
      objective: string;
      interviewType: string;
      depthLevel: string;
      numQuestions: number;
      resumeText?: string;
      jobDescription?: string;
    }
  ): Promise<string[]> {
    const skillsContext = interviewData.resumeText
      ? `\nCandidate's background: ${interviewData.resumeText.substring(0, 500)}`
      : '';
    const jobContext = interviewData.jobDescription
      ? `\nJob Description: ${interviewData.jobDescription.substring(0, 500)}`
      : '';

    const typeInstructions = this.getTypeSpecificPromptInstructions(
      interviewData.interviewType,
      interviewData.numQuestions
    );

    const prompt = `You are an expert interviewer. Generate EXACTLY ${interviewData.numQuestions} interview questions.

Interview Details:
- Position/Objective: ${interviewData.objective}
- Interview Type: ${interviewData.interviewType}
- Difficulty Level: ${interviewData.depthLevel}
${skillsContext}${jobContext}

TYPE-SPECIFIC INSTRUCTIONS:
${typeInstructions}

Requirements:
1. Questions must be directly relevant to "${interviewData.objective}"
2. Match the "${interviewData.depthLevel}" difficulty level precisely
3. Each question should be clear, specific, and professional
4. Number each question (1., 2., 3., etc.)
5. STRICTLY follow the type-specific instructions above

Generate ${interviewData.numQuestions} questions now:`;

    try {
      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      // Parse questions
      const lines = response.split('\n');
      const questions: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^(?:\d+[\.)]\\s*|[-•*]\s*)(.+)/);
        if (match && match[1].length > 15) {
          let question = match[1].trim();
          // Remove type labels like [CODING], [THEORY] etc. for clean display
          question = question.replace(/^\[(CODING|THEORY|SYSTEM DESIGN|BEHAVIORAL)\]\s*/i, '');
          if (!question.endsWith('?') && !question.endsWith('.')) {
            question += '?';
          }
          questions.push(question);
        }
      }

      if (questions.length >= interviewData.numQuestions) {
        return questions.slice(0, interviewData.numQuestions);
      }

      // Fallback to default questions if parsing failed
      return this.getDefaultQuestions(interviewData.interviewType, interviewData.depthLevel, interviewData.numQuestions);
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getDefaultQuestions(interviewData.interviewType, interviewData.depthLevel, interviewData.numQuestions);
    }
  }

  /**
   * Generate proper Aptitude MCQ questions using AI
   */
  async generateAptitudeMCQQuestions(
    difficulty: 'Easy' | 'Medium' | 'Hard',
    count: number,
    context?: string
  ): Promise<AptitudeMCQ[]> {
    await this.checkOllamaAvailability();

    if (this.useOllama) {
      try {
        return await ollamaService.generateAptitudeMCQsWithAI(difficulty, count, context);
      } catch (error) {
        console.warn('Ollama MCQ generation failed, falling back to Gemini:', error);
        this.useOllama = false;
      }
    }

    return await this.generateAptitudeMCQsWithGemini(difficulty, count, context);
  }

  /**
   * Generate aptitude MCQs using Gemini API
   */
  private async generateAptitudeMCQsWithGemini(
    difficulty: 'Easy' | 'Medium' | 'Hard',
    count: number,
    context?: string
  ): Promise<AptitudeMCQ[]> {
    const marks = difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3;
    const contextHint = context ? `\nContext: ${context.substring(0, 300)}` : '';

    const difficultyGuide = {
      'Easy': 'Basic arithmetic, simple percentages, basic patterns, simple analogies, fundamental logical deductions',
      'Medium': 'Profit/loss, averages, ratios, set theory, coding-decoding, blood relations, moderate algebra, seating arrangements',
      'Hard': 'Compound interest, time-speed-distance, work problems, advanced probability, complex coding patterns, complex data interpretation, advanced logical puzzles'
    };

    const prompt = `Generate EXACTLY ${count} aptitude MCQ questions at ${difficulty} difficulty level.
${contextHint}

Difficulty guide for ${difficulty}: ${difficultyGuide[difficulty]}

Categories to include: Mathematics, Logical Reasoning, Analytical, Quantitative Aptitude, Verbal Reasoning.
Mix questions across these categories.

IMPORTANT: Return ONLY a valid JSON array. Each element must have:
- "question": the question text (string)
- "options": object with keys A, B, C, D and string values
- "correctAnswer": one of "A", "B", "C", "D"
- "category": one of "Mathematics", "Logical Reasoning", "Analytical", "Quantitative Aptitude", "Verbal Reasoning"

Example format:
[{"question":"What is 25% of 80?","options":{"A":"15","B":"20","C":"25","D":"30"},"correctAnswer":"B","category":"Mathematics"}]

Generate ${count} ${difficulty} questions now. Return ONLY the JSON array:`;

    try {
      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      // Clean and parse JSON
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');

      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanResponse) as any[];

      const mcqs: AptitudeMCQ[] = parsed.map((q: any, index: number) => ({
        id: `ai-apt-${Date.now()}-${index}`,
        question: q.question,
        options: {
          A: q.options?.A || q.options?.a || 'Option A',
          B: q.options?.B || q.options?.b || 'Option B',
          C: q.options?.C || q.options?.c || 'Option C',
          D: q.options?.D || q.options?.d || 'Option D',
        },
        correctAnswer: (q.correctAnswer || q.correct_answer || 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D',
        difficulty,
        category: q.category || 'Mathematics',
        marks,
      }));

      if (mcqs.length > 0) {
        console.log(`✅ Gemini generated ${mcqs.length} aptitude MCQs at ${difficulty} difficulty`);
        return mcqs.slice(0, count);
      }

      throw new Error('No valid MCQs parsed from Gemini response');
    } catch (error) {
      console.error('Gemini MCQ generation error:', error);
      // Fallback to hardcoded
      return ollamaService.generateAptitudeQuestions(difficulty, count);
    }
  }

  /**
   * Generate feedback for user's answer
   */
  async generateFeedback(
    question: string,
    userAnswer: string,
    interviewType: string,
    depthLevel: string
  ): Promise<AIResponse> {
    await this.checkOllamaAvailability();

    if (this.useOllama) {
      try {
        return await ollamaService.generateFeedback(question, userAnswer, interviewType, depthLevel);
      } catch (error) {
        console.warn('Ollama failed, falling back to Gemini:', error);
        this.useOllama = false;
      }
    }

    // Use Gemini API
    return await this.generateFeedbackWithGemini(question, userAnswer, interviewType, depthLevel);
  }

  /**
   * Generate feedback using Gemini API
   */
  private async generateFeedbackWithGemini(
    question: string,
    userAnswer: string,
    interviewType: string,
    depthLevel: string
  ): Promise<AIResponse> {
    const prompt = `You are an expert interviewer.
Question: "${question}"
User Answer: "${userAnswer}"
You are conducting a ${interviewType} interview at a ${depthLevel} level.

Please evaluate the user's answer based on the context of the question and the provided interview type and depth.
Provide a rating from 1 to 10 for the user's answer.
Give constructive feedback on what the user did well and how they can improve.
Provide a concise and ideal "correct answer" that would be expected for this question.

IMPORTANT: Return ONLY a valid JSON object with three fields: "rating" (number), "feedback" (string), and "correct_ans" (string). No additional text or formatting.

Example format:
{"rating": 8, "feedback": "Good explanation but could include more details about...", "correct_ans": "A comprehensive answer should include..."}`;

    try {
      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      // Clean and parse JSON response
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');

      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const parsedResponse = JSON.parse(cleanResponse) as any;
      const rating = parsedResponse.rating || parsedResponse.ratings;

      if (typeof rating !== 'number' ||
        typeof parsedResponse.feedback !== 'string' ||
        typeof parsedResponse.correct_ans !== 'string') {
        throw new Error('Invalid response format from Gemini');
      }

      const validatedRating = Math.max(1, Math.min(10, rating));

      return {
        ratings: validatedRating,
        feedback: parsedResponse.feedback,
        correct_ans: parsedResponse.correct_ans,
      };
    } catch (error) {
      console.error('Error generating feedback with Gemini:', error);
      return {
        ratings: 0,
        feedback: 'Unable to generate feedback. Please try again.',
        correct_ans: 'Unable to generate correct answer.',
      };
    }
  }

  /**
   * Get default questions as fallback — covers ALL interview types
   */
  private getDefaultQuestions(interviewType: string, depthLevel: string, count: number): string[] {
    const questionBank: Record<string, string[]> = {
      // Technical Code questions
      'technical code_easy': [
        'Write a function that reverses a string without using built-in reverse methods.',
        'Given an array of integers, write a function to find the maximum element.',
        'Write a function to check if a given string is a palindrome.',
        'Implement a function to calculate the factorial of a number.',
        'Write a function that counts the number of vowels in a string.',
      ],
      'technical code_medium': [
        'Write a function to find the first non-repeating character in a string.',
        'Implement a function that merges two sorted arrays into one sorted array.',
        'Write a function to find all pairs in an array that sum to a given target.',
        'Implement a stack using two queues.',
        'Write a function to check if a string of parentheses is balanced.',
      ],
      'technical code_hard': [
        'Implement a Least Recently Used (LRU) Cache with O(1) get and put operations.',
        'Write a function to find the longest palindromic substring in a given string.',
        'Implement a function to serialize and deserialize a binary tree.',
        'Write a function that finds the median of two sorted arrays in O(log(m+n)) time.',
        'Implement a Trie data structure with insert, search, and prefix matching.',
      ],
      // Technical Theory questions
      'technical theory_easy': [
        'What is the difference between an array and a linked list?',
        'Explain what a REST API is and how it works.',
        'What is the difference between HTTP and HTTPS?',
        'Explain the concept of object-oriented programming and its main principles.',
        'What is version control and why is Git important?',
      ],
      'technical theory_medium': [
        'Explain the difference between SQL and NoSQL databases. When would you use each?',
        'What are design patterns? Explain the Singleton and Observer patterns.',
        'Explain how garbage collection works in languages like Java or JavaScript.',
        'What is the difference between threads and processes in operating systems?',
        'Explain the SOLID principles and give an example of each.',
      ],
      'technical theory_hard': [
        'Explain the CAP theorem and its implications for distributed systems.',
        'What is the difference between optimistic and pessimistic locking in databases?',
        'Explain how a load balancer works and compare L4 vs L7 load balancing.',
        'What are the trade-offs between monolithic and microservice architectures?',
        'Explain eventual consistency and how it differs from strong consistency.',
      ],
      // Behavioral questions
      'behavioral_easy': [
        'Tell me about a time when you worked as part of a team. What was your role?',
        'Describe a situation where you had to learn something new quickly. How did you approach it?',
        'Give an example of a time you received constructive feedback. How did you handle it?',
        'Tell me about a challenge you faced in a project and how you overcame it.',
        'Describe a time when you had to manage your time effectively to meet a deadline.',
      ],
      'behavioral_medium': [
        'Tell me about a time when you had a disagreement with a teammate. How did you resolve it?',
        'Describe a situation where you had to make a difficult decision with incomplete information.',
        'Give an example of when you took initiative beyond your assigned responsibilities.',
        'Tell me about a time when a project you were working on failed. What did you learn?',
        'Describe a situation where you had to persuade someone to see things your way.',
      ],
      'behavioral_hard': [
        'Tell me about a time you led a team through a major crisis or tight deadline. What was the outcome?',
        'Describe a situation where you had to balance competing priorities from multiple stakeholders.',
        'Give an example of when you had to make an unpopular decision. How did you handle the consequences?',
        'Tell me about a time you identified a major problem before anyone else noticed. What did you do?',
        'Describe how you mentored or developed a junior team member. What approach did you take?',
      ],
      // System Design questions
      'system design_easy': [
        'Design a simple URL shortener service. What components would you need?',
        'How would you design a basic to-do list application with user authentication?',
        'Design a simple file storage system like Google Drive. What are the key components?',
        'How would you design a basic notification system for a mobile app?',
        'Design a simple rate limiter for an API. How would it work?',
      ],
      'system design_medium': [
        'Design a real-time chat application. How would you handle message delivery and storage?',
        'How would you design a news feed system like Twitter? Explain the ranking algorithm.',
        'Design an e-commerce checkout system. How do you handle concurrent purchases?',
        'How would you design a search autocomplete system? What data structures would you use?',
        'Design a parking lot management system. How would you handle reservations and real-time availability?',
      ],
      'system design_hard': [
        'Design YouTube or Netflix video streaming service. How would you handle video encoding and delivery at scale?',
        'How would you design a distributed key-value store like DynamoDB? Explain consistency and partitioning.',
        'Design a ride-sharing system like Uber. How would you match drivers and riders in real time?',
        'How would you design a global CDN? Explain caching strategies and cache invalidation.',
        'Design a real-time collaborative editing system like Google Docs. How do you handle conflict resolution?',
      ],
      // Mixed fallback — variety of all types
      'mixed_easy': [
        'Write a function to reverse an array in place.',
        'What is the difference between a stack and a queue?',
        'Tell me about a time you worked on a team project. What was your contribution?',
        'Design a simple library book management system. What are the key features?',
        'Explain what an API is and give an example of how you would use one.',
      ],
      'mixed_medium': [
        'Write a function to detect if a linked list has a cycle.',
        'Explain the difference between TCP and UDP. When would you use each?',
        'Tell me about a time you had to deal with an underperforming colleague.',
        'Design a food delivery tracking system. How would users track their orders?',
        'What are indexes in databases and how do they improve query performance?',
      ],
      'mixed_hard': [
        'Implement a function to find the Kth largest element in an unsorted array.',
        'Explain how consistent hashing works and its use in distributed systems.',
        'Tell me about a time you led a team through a critical production outage.',
        'Design a payment processing system for an e-commerce platform at scale.',
        'Explain the differences between event-driven and request-driven architectures.',
      ],
      // Legacy fallback keys
      'technical_beginner': [
        'Tell me about yourself and your technical background.',
        'What programming languages are you familiar with?',
        'Describe a simple project you have worked on.',
        'How do you approach learning new technologies?',
        'What is your experience with version control systems like Git?',
      ],
      'technical_intermediate': [
        'Describe your experience with object-oriented programming concepts.',
        'How do you handle error handling and exception management in your code?',
        'Explain the concept of APIs and how you have used them.',
        'What is your approach to testing your code?',
        'Describe a challenging technical problem you solved recently.',
      ],
      'technical_advanced': [
        'Describe your experience with system design and architecture.',
        'How do you approach scalability challenges in large applications?',
        'Explain your experience with microservices or distributed systems.',
        'What is your approach to database optimization and query performance?',
        'Describe how you handle security considerations in your applications.',
      ],
    };

    const normalizedType = interviewType.toLowerCase().trim();
    const normalizedDepth = depthLevel.toLowerCase().trim();

    // Map depth level aliases
    const depthMap: Record<string, string> = {
      'fresher': 'easy', 'beginner': 'easy',
      'intermediate': 'medium',
      'experienced': 'hard', 'expert': 'hard', 'advanced': 'hard',
    };
    const mappedDepth = depthMap[normalizedDepth] || normalizedDepth;

    // Try exact match first
    let key = `${normalizedType}_${mappedDepth}`;
    if (questionBank[key]) {
      return questionBank[key].slice(0, count);
    }

    // Try without mapped depth
    key = `${normalizedType}_${normalizedDepth}`;
    if (questionBank[key]) {
      return questionBank[key].slice(0, count);
    }

    // Fallback to technical_intermediate
    return (questionBank['technical_intermediate'] || []).slice(0, count);
  }

  /**
   * Check if using Ollama
   */
  isUsingOllama(): boolean {
    return this.useOllama;
  }
}

export const aiService = new AIService();
