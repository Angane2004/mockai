/**
 * Ollama Integration Service
 * Replaces Gemini AI functionality with local Ollama Llama3 model
 */

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface AIResponse {
  ratings: number;
  feedback: string;
  correct_ans: string;
}

class OllamaService {
  private baseUrl = 'http://localhost:11434';
  private model = 'llama2';
  private warmupDone = false;
  private modelDetected = false;

  /**
   * Warm up the model for faster subsequent requests
   */
  async warmup(): Promise<void> {
    if (this.warmupDone) return;

    // Auto-detect the available model first
    if (!this.modelDetected) {
      try {
        const tagsResponse = await fetch(`${this.baseUrl}/api/tags`);
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          const models = tagsData.models || [];
          if (models.length > 0) {
            // Prefer llama3 > llama2 > first available model
            const llama3 = models.find((m: any) => m.name.startsWith('llama3'));
            const llama2 = models.find((m: any) => m.name.startsWith('llama2'));
            const selectedModel = llama3 || llama2 || models[0];
            this.model = selectedModel.name;
            console.log(`🔍 Auto-detected Ollama model: ${this.model}`);
          }
        }
        this.modelDetected = true;
      } catch (error) {
        console.warn('Could not auto-detect model, using default:', this.model);
        this.modelDetected = true;
      }
    }

    try {
      await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: 'Hi',
          stream: false,
          options: {
            num_predict: 1
          }
        }),
      });
      this.warmupDone = true;
      console.log(`✅ Ollama model '${this.model}' warmed up`);
    } catch (error) {
      console.warn('Warmup failed, but continuing:', error);
    }
  }

  /**
   * Send a prompt to Ollama and get response (highly optimized)
   */
  async generateResponse(prompt: string, fast = false): Promise<string> {
    try {
      // Ensure warmup
      if (!this.warmupDone) {
        await this.warmup();
      }

      const requestBody = {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: fast ? {
          temperature: 0.3,
          num_predict: 500,
          top_k: 3,
          top_p: 0.7,
          repeat_penalty: 1.05,
          num_ctx: 512,
          num_thread: -1,
          num_gpu: -1,
          num_batch: 512,
          low_vram: false,
          f16_kv: true,
          use_mlock: true,
          use_mmap: true
        } : {
          temperature: 0.5,
          num_predict: 800,
          top_k: 5,
          top_p: 0.8,
          repeat_penalty: 1.1,
          num_ctx: 1024,
          num_thread: -1,
          num_gpu: -1,
          num_batch: 512,
          low_vram: false,
          f16_kv: true,
          use_mlock: true,
          use_mmap: true
        }
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw error;
    }
  }

  /**
   * Extract technologies and skills from resume
   */
  async extractResumeSkills(resumeText: string): Promise<string[]> {
    const prompt = `Extract all technical skills, programming languages, frameworks, tools, and technologies mentioned in this resume.

Resume content: "${resumeText}"

Return ONLY a comma-separated list of technologies/skills found. Examples: React, JavaScript, Python, Docker, AWS, etc.
If no specific technologies found, return "General programming"`;

    try {
      const response = await this.generateResponse(prompt, true);
      return response.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
    } catch (error) {
      console.warn('Error extracting skills:', error);
      return ['General programming'];
    }
  }

  /**
   * Generate interview questions - SPEED OPTIMIZED
   * Uses short prompt + fast mode + 60s timeout + instant fallback
   */
  /**
   * Get type-specific prompt text for Ollama question generation
   */
  private getOllamaTypePrompt(interviewType: string, numQuestions: number): string {
    const type = interviewType.toLowerCase().trim();

    if (type === 'technical code' || type === 'technical coding') {
      return `Generate ${numQuestions} coding/programming problem questions. Each question MUST be a coding challenge that requires writing code. Use formats like: "Write a function that...", "Given an array..., find...", "Implement a...". DO NOT generate theory questions.`;
    }
    if (type === 'technical theory') {
      return `Generate ${numQuestions} technical theory questions about CS concepts, programming principles, and technologies. Questions should ask to explain, compare, or describe concepts. DO NOT generate coding problems.`;
    }
    if (type === 'behavioral' || type === 'hr round') {
      return `Generate ${numQuestions} behavioral interview questions using STAR method. Questions MUST start with: "Tell me about a time when...", "Describe a situation where...", "Give an example of...". Focus on leadership, teamwork, conflict resolution, problem-solving. DO NOT ask technical questions.`;
    }
    if (type === 'system design') {
      return `Generate ${numQuestions} system design questions. Each question should ask to design a system or architecture. Use formats: "Design a...", "How would you architect...". Focus on scalability, databases, caching, distributed systems. DO NOT ask coding or behavioral questions.`;
    }
    if (type === 'mixed' || type === 'mixed interview') {
      const coding = Math.max(1, Math.floor(numQuestions * 0.25));
      const theory = Math.max(1, Math.floor(numQuestions * 0.25));
      const sysDesign = Math.max(1, Math.floor(numQuestions * 0.25));
      const behavioral = numQuestions - coding - theory - sysDesign;
      return `Generate a MIXED set of ${numQuestions} questions: ${coding} coding problem(s), ${theory} technical theory question(s), ${sysDesign} system design question(s), and ${behavioral} behavioral question(s). Label each with [CODING], [THEORY], [SYSTEM DESIGN], or [BEHAVIORAL].`;
    }
    return `Generate ${numQuestions} interview questions.`;
  }

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
    try {
      const resumeHint = interviewData.resumeText
        ? ` Skills: ${interviewData.resumeText.substring(0, 150)}`
        : '';
      const jobHint = interviewData.jobDescription
        ? ` Job: ${interviewData.jobDescription.substring(0, 150)}`
        : '';

      const typePrompt = this.getOllamaTypePrompt(interviewData.interviewType, interviewData.numQuestions);

      const prompt = `${typePrompt}
Difficulty: ${interviewData.depthLevel}. Position: ${interviewData.objective}.${resumeHint}${jobHint}
1.`;

      console.log('🚀 Ollama: Generating type-specific questions (fast mode, 60s timeout)...');

      // Use FAST mode + 60-second timeout
      const response = await Promise.race([
        this.generateResponse(prompt, true),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Ollama timeout after 60s')), 60000)
        )
      ]);

      // Parse questions
      const fullResponse = '1.' + response;
      const lines = fullResponse.split('\n');
      const questions: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^(?:\d+[\.\)]\s*|[-•*]\s*)(.+)/);
        if (match && match[1].length > 10) {
          let question = match[1].trim();
          // Remove type labels for clean display
          question = question.replace(/^\[(CODING|THEORY|SYSTEM DESIGN|BEHAVIORAL)\]\s*/i, '');
          if (!question.endsWith('?') && !question.endsWith('.')) question += '?';
          questions.push(question);
        }
      }

      if (questions.length > 0) {
        console.log(`✅ Ollama generated ${questions.length} type-specific questions`);
        return questions.slice(0, interviewData.numQuestions);
      }

      // Fallback parsing: split by numbers
      const altQuestions = fullResponse
        .split(/\d+[\.\)]\s*/)
        .filter(q => q.trim().length > 10)
        .map(q => q.trim().split('\n')[0]);

      if (altQuestions.length > 0) {
        return altQuestions.slice(0, interviewData.numQuestions);
      }

      console.warn('⚠️ Could not parse Ollama response, using cached questions');
      return this.getInstantQuestions(
        interviewData.interviewType,
        interviewData.depthLevel,
        interviewData.numQuestions
      );
    } catch (error) {
      console.warn('⚠️ Ollama failed/timeout, using cached questions:', error);
      return this.getInstantQuestions(
        interviewData.interviewType,
        interviewData.depthLevel,
        interviewData.numQuestions
      );
    }
  }

  /**
   * Get instant questions from pre-built cache for immediate response
   */
  private getInstantQuestions(interviewType: string, depthLevel: string, count: number): string[] {
    const questionBank = this.getQuestionBank();

    // Normalize interview type and depth level
    const normalizedType = interviewType.toLowerCase().replace(/\s+/g, ' ');
    const normalizedDepth = depthLevel.toLowerCase();

    // Map depth level aliases
    const depthMap: Record<string, string> = {
      'fresher': 'easy', 'beginner': 'easy',
      'intermediate': 'medium',
      'experienced': 'hard', 'expert': 'hard', 'advanced': 'hard',
    };
    const mappedDepth = depthMap[normalizedDepth] || normalizedDepth;

    // Try different key formats to find matching questions
    let questions: string[] = [];

    // Try exact match first (e.g., "technical code_medium")
    let key = `${normalizedType}_${mappedDepth}`;
    if (questionBank[key]) {
      questions = questionBank[key];
    } else {
      // Try with original depth
      key = `${normalizedType}_${normalizedDepth}`;
      if (questionBank[key]) {
        questions = questionBank[key];
      } else if (normalizedType.includes('behavioral') || normalizedType.includes('hr')) {
        questions = questionBank[`behavioral_${mappedDepth}`] || questionBank['behavioral_medium'] || questionBank['hr round_intermediate'];
      } else if (normalizedType.includes('system design')) {
        questions = questionBank[`system design_${mappedDepth}`] || questionBank['system design_medium'];
      } else if (normalizedType.includes('mixed')) {
        questions = questionBank[`mixed_${mappedDepth}`] || questionBank['mixed_medium'];
      } else if (normalizedType.includes('code') || normalizedType.includes('coding')) {
        questions = questionBank[`technical code_${mappedDepth}`] || questionBank['technical code_medium'];
      } else if (normalizedType.includes('theory')) {
        questions = questionBank[`technical theory_${mappedDepth}`] || questionBank['technical theory_medium'];
      } else {
        // Default to technical questions
        questions = questionBank[`technical_${normalizedDepth}`] || questionBank['technical_intermediate'];
      }
    }

    if (!questions || questions.length === 0) {
      questions = questionBank['technical_intermediate'] || [];
    }

    // Shuffle questions for variety
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.max(count, 5));
  }

  /**
   * Pre-built question bank for instant responses
   */
  private getQuestionBank(): Record<string, string[]> {
    return {
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
        'Describe a situation where you had to learn something new quickly.',
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
        'Tell me about a time you led a team through a major crisis or tight deadline.',
        'Describe a situation where you had to balance competing priorities from multiple stakeholders.',
        'Give an example of when you had to make an unpopular decision. How did you handle it?',
        'Tell me about a time you identified a major problem before anyone else noticed.',
        'Describe how you mentored or developed a junior team member.',
      ],
      // System Design questions
      'system design_easy': [
        'Design a simple URL shortener service. What components would you need?',
        'How would you design a basic to-do list application with user authentication?',
        'Design a simple file storage system like Google Drive. What are the key components?',
        'How would you design a basic notification system for a mobile app?',
        'Design a simple rate limiter for an API.',
      ],
      'system design_medium': [
        'Design a real-time chat application. How would you handle message delivery and storage?',
        'How would you design a news feed system like Twitter?',
        'Design an e-commerce checkout system. How do you handle concurrent purchases?',
        'How would you design a search autocomplete system?',
        'Design a parking lot management system with real-time availability.',
      ],
      'system design_hard': [
        'Design YouTube or Netflix video streaming at scale. How would you handle encoding and delivery?',
        'How would you design a distributed key-value store like DynamoDB?',
        'Design a ride-sharing system like Uber with real-time driver matching.',
        'How would you design a global CDN with cache invalidation?',
        'Design a collaborative editing system like Google Docs with conflict resolution.',
      ],
      // Mixed questions
      'mixed_easy': [
        'Write a function to reverse an array in place.',
        'What is the difference between a stack and a queue?',
        'Tell me about a time you worked on a team project.',
        'Design a simple library book management system.',
        'Explain what an API is and give an example.',
      ],
      'mixed_medium': [
        'Write a function to detect if a linked list has a cycle.',
        'Explain the difference between TCP and UDP.',
        'Tell me about a time you had to deal with an underperforming colleague.',
        'Design a food delivery tracking system.',
        'What are indexes in databases and how do they improve performance?',
      ],
      'mixed_hard': [
        'Implement a function to find the Kth largest element in an unsorted array.',
        'Explain how consistent hashing works in distributed systems.',
        'Tell me about a time you led a team through a production outage.',
        'Design a payment processing system at scale.',
        'Explain event-driven vs request-driven architectures.',
      ],
      // Legacy keys
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
      'hr round_beginner': [
        'Tell me about yourself and what motivates you.',
        'Why are you interested in this position?',
        'What are your greatest strengths and weaknesses?',
        'Where do you see yourself in 5 years?',
        'Describe a time when you faced a challenge at work.',
      ],
      'hr round_intermediate': [
        'Describe a situation where you had to lead a team or project.',
        'How do you handle conflicts with colleagues or team members?',
        'Tell me about a time you failed and what you learned from it.',
        'How do you adapt to changes in the workplace?',
        'Describe your communication style and how you ensure clarity.',
      ],
      'hr round_advanced': [
        'Describe your leadership philosophy and management style.',
        'How do you build and maintain relationships with stakeholders?',
        'Tell me about a time you had to make a difficult decision with limited information.',
        'How do you foster innovation and creativity in your team?',
        'Describe your approach to mentoring and developing team members.',
      ],
    };
  }

  /**
   * Fallback questions if generation fails
   */
  private getFallbackQuestions(interviewType: string, depthLevel: string, skills: string[]): string[] {
    const mainSkill = skills.length > 0 ? skills[0] : 'programming';

    const fallbackQuestions = [
      `Tell me about your experience with ${mainSkill} and how you've used it in recent projects.`,
      `What challenges have you faced while working with ${mainSkill} and how did you overcome them?`,
      `Can you walk me through a specific project where you implemented ${mainSkill} solutions?`,
      `How do you stay updated with the latest ${mainSkill} best practices and trends?`,
      `Describe a time when you had to optimize performance in a ${mainSkill} application.`
    ];

    return fallbackQuestions.slice(0, 5);
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
      const response = await this.generateResponse(prompt);

      // Clean and parse JSON response
      let cleanResponse = response.trim();

      // Remove any markdown code block formatting
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');

      // Try to extract JSON from response if it's wrapped in text
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const parsedResponse = JSON.parse(cleanResponse) as any;

      // Extract rating from response (could be 'rating' or 'ratings')
      const rating = parsedResponse.rating || parsedResponse.ratings;

      // Validate required fields
      if (typeof rating !== 'number' ||
        typeof parsedResponse.feedback !== 'string' ||
        typeof parsedResponse.correct_ans !== 'string') {
        throw new Error('Invalid response format from Ollama');
      }

      // Ensure rating is within valid range
      const validatedRating = Math.max(1, Math.min(10, rating));

      return {
        ratings: validatedRating,
        feedback: parsedResponse.feedback,
        correct_ans: parsedResponse.correct_ans,
      };
    } catch (error) {
      console.error('Error generating feedback:', error);
      return {
        ratings: 0,
        feedback: 'Unable to generate feedback. Please try again.',
        correct_ans: 'Unable to generate correct answer.',
      };
    }
  }

  /**
   * Analyze voice tone and speaking patterns from audio characteristics
   */
  analyzeVoiceTone(transcript: string, audioMetrics?: {
    pauseCount?: number;
    averagePauseLength?: number;
    speakingRate?: number;
    volumeVariation?: number;
  }): {
    tonalityScore: number;
    confidence: number;
    clarity: number;
    engagement: number;
    feedback: string;
  } {
    const analysis = {
      tonalityScore: 7,
      confidence: 6,
      clarity: 7,
      engagement: 6,
      feedback: ''
    };

    // Analyze transcript for tone indicators
    const text = transcript.toLowerCase();
    const wordCount = transcript.split(' ').length;

    // Confidence indicators
    const confidenceWords = ['definitely', 'absolutely', 'certainly', 'confident', 'sure', 'exactly', 'precisely', 'clearly'];
    const uncertainWords = ['maybe', 'perhaps', 'i think', 'probably', 'possibly', 'sort of', 'kind of', 'i guess'];
    const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'well', 'actually'];

    const confidenceCount = confidenceWords.reduce((count, word) =>
      count + (text.match(new RegExp(word, 'g')) || []).length, 0);
    const uncertainCount = uncertainWords.reduce((count, word) =>
      count + (text.match(new RegExp(word, 'g')) || []).length, 0);
    const fillerCount = fillerWords.reduce((count, word) =>
      count + (text.match(new RegExp(word, 'g')) || []).length, 0);

    // Calculate confidence score (1-10)
    analysis.confidence = Math.max(1, Math.min(10,
      7 + (confidenceCount * 0.5) - (uncertainCount * 0.3) - (fillerCount * 0.2)
    ));

    // Clarity based on sentence structure and word choice
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = wordCount / Math.max(sentences.length, 1);

    // Optimal sentence length is 15-25 words
    if (avgSentenceLength >= 10 && avgSentenceLength <= 30) {
      analysis.clarity += 1;
    }
    if (avgSentenceLength < 5) {
      analysis.clarity -= 1; // Too choppy
    }
    if (avgSentenceLength > 40) {
      analysis.clarity -= 1; // Too long/rambling
    }

    // Engagement based on variety and enthusiasm indicators
    const enthusiasmWords = ['excited', 'passionate', 'love', 'enjoy', 'fascinating', 'amazing', 'excellent'];
    const enthusiasmCount = enthusiasmWords.reduce((count, word) =>
      count + (text.match(new RegExp(word, 'g')) || []).length, 0);

    analysis.engagement = Math.max(1, Math.min(10,
      6 + (enthusiasmCount * 0.5) - (fillerCount * 0.1)
    ));

    // Use audio metrics if available
    if (audioMetrics) {
      // Speaking rate analysis (words per minute)
      if (audioMetrics.speakingRate) {
        if (audioMetrics.speakingRate >= 120 && audioMetrics.speakingRate <= 180) {
          analysis.clarity += 0.5; // Good pace
        } else if (audioMetrics.speakingRate < 80) {
          analysis.confidence -= 0.5; // Too slow might indicate hesitation
        } else if (audioMetrics.speakingRate > 200) {
          analysis.clarity -= 0.5; // Too fast
        }
      }

      // Pause analysis
      if (audioMetrics.pauseCount && audioMetrics.averagePauseLength) {
        if (audioMetrics.averagePauseLength > 2) {
          analysis.confidence -= 0.3; // Long pauses indicate hesitation
        }
      }
    }

    // Overall tonality (combination of confidence, clarity, engagement)
    analysis.tonalityScore = Math.round(
      (analysis.confidence + analysis.clarity + analysis.engagement) / 3
    );

    // Generate feedback
    let feedback = [];

    if (analysis.confidence >= 8) {
      feedback.push('✅ Your responses show strong confidence');
    } else if (analysis.confidence <= 5) {
      feedback.push('💡 Try to use more definitive language to sound more confident');
    }

    if (analysis.clarity >= 8) {
      feedback.push('✅ Your explanations are clear and well-structured');
    } else if (analysis.clarity <= 5) {
      feedback.push('💡 Consider organizing your thoughts into shorter, clearer sentences');
    }

    if (analysis.engagement >= 7) {
      feedback.push('✅ You demonstrate good enthusiasm and engagement');
    } else {
      feedback.push('💡 Show more passion and interest in your responses');
    }

    if (fillerCount > wordCount * 0.1) {
      feedback.push('💡 Try to reduce filler words (um, uh, like) for more professional delivery');
    }

    analysis.feedback = feedback.join(' • ');

    // Ensure scores are within valid range
    analysis.confidence = Math.max(1, Math.min(10, Math.round(analysis.confidence)));
    analysis.clarity = Math.max(1, Math.min(10, Math.round(analysis.clarity)));
    analysis.engagement = Math.max(1, Math.min(10, Math.round(analysis.engagement)));

    return analysis;
  }

  /**
   * Generate fast interview report using templates and minimal AI
   */
  async generateFastReport(
    allAnswers: Array<{
      question: string;
      userAnswer: string;
      confidenceLevel: number;
      voiceTone?: any;
    }>,
    interviewType: string,
    depthLevel: string
  ): Promise<any> {
    // Fast template-based report generation
    const report = {
      overallRating: 0,
      overallFeedback: '',
      overallConfidenceLevel: 0,
      communicationScore: 0,
      questionFeedbacks: [] as any[]
    };

    // Calculate quick metrics
    let totalRating = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;

    report.questionFeedbacks = allAnswers.map((qa, index) => {
      // Enhanced rating based on actual speech content analysis
      const actualAnswer = qa.userAnswer.trim();
      console.log(`📝 Analyzing answer ${index + 1}:`, {
        question: qa.question.substring(0, 50) + '...',
        answerLength: actualAnswer.length,
        answer: actualAnswer.substring(0, 100) + '...',
        confidenceLevel: qa.confidenceLevel
      });

      // If no answer provided, give very low score
      if (!actualAnswer || actualAnswer.length < 5) {
        console.log(`⚠️ No meaningful answer provided for question ${index + 1}`);
        return {
          question: qa.question,
          userAnswer: actualAnswer || 'No answer provided',
          rating: 2,
          feedback: '❌ No answer was provided. Please ensure you record your response to each question.',
          idealAnswer: this.getIdealAnswerTemplates(qa.question, interviewType),
          confidenceLevel: qa.confidenceLevel,
          voiceFeedback: 'No speech detected'
        };
      }

      const answerLength = actualAnswer.length;
      const wordCount = actualAnswer.split(' ').filter(word => word.length > 0).length;
      let rating = 6; // Start with better base rating

      console.log(`🔍 Content analysis for answer ${index + 1}:`, {
        length: answerLength,
        wordCount: wordCount,
        baseRating: rating
      });

      // Content quality analysis with detailed logging
      if (answerLength > 400) {
        rating += 3;
        console.log(`➕ Comprehensive answer (+3): ${answerLength} chars`);
      } else if (answerLength > 300) {
        rating += 2.5;
        console.log(`➕ Detailed answer (+2.5): ${answerLength} chars`);
      } else if (answerLength > 200) {
        rating += 2;
        console.log(`➕ Good answer (+2): ${answerLength} chars`);
      } else if (answerLength > 100) {
        rating += 1.5;
        console.log(`➕ Moderate answer (+1.5): ${answerLength} chars`);
      } else if (answerLength > 50) {
        rating += 1;
        console.log(`➕ Short answer (+1): ${answerLength} chars`);
      } else if (answerLength < 30) {
        rating -= 2;
        console.log(`➖ Very short answer (-2): ${answerLength} chars`);
      }

      // Word count quality
      if (wordCount > 50) rating += 1;
      else if (wordCount < 10) rating -= 1.5;

      // Confidence level impact (more significant)
      rating += (qa.confidenceLevel - 5) * 0.5;

      // Comprehensive content quality analysis
      const answer = actualAnswer.toLowerCase();

      // Check for filler words (negative impact)
      const fillerWords = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'i mean'];
      const fillerCount = fillerWords.reduce((count, word) => {
        const matches = (answer.match(new RegExp('\\b' + word + '\\b', 'g')) || []).length;
        return count + matches;
      }, 0);

      if (fillerCount > 0) {
        const fillerPenalty = Math.min(fillerCount * 0.2, 1.5);
        rating -= fillerPenalty;
        console.log(`➖ Filler words penalty (-${fillerPenalty.toFixed(1)}): found ${fillerCount} instances`);
      }

      // Technical keywords boost for technical interviews
      if (interviewType.toLowerCase().includes('technical') || interviewType.toLowerCase().includes('coding')) {
        const techWords = ['algorithm', 'data structure', 'complexity', 'performance', 'optimize', 'implementation', 'design', 'architecture', 'database', 'api', 'framework', 'testing', 'debugging', 'code', 'programming', 'function', 'variable', 'loop', 'array', 'object', 'class', 'method'];
        const techWordCount = techWords.filter(word => answer.includes(word)).length;
        if (techWordCount > 0) {
          const techBonus = techWordCount * 0.4;
          rating += techBonus;
          console.log(`➕ Technical keywords bonus (+${techBonus.toFixed(1)}): found ${techWordCount} tech terms`);
        }
      }

      // Sentence structure analysis
      const sentences = actualAnswer.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const avgSentenceLength = sentences.reduce((total, sentence) => total + sentence.trim().split(' ').length, 0) / sentences.length;

      if (avgSentenceLength > 8 && avgSentenceLength < 25) {
        const structureBonus = 0.5;
        rating += structureBonus;
        console.log(`➕ Good sentence structure (+${structureBonus}): avg ${avgSentenceLength.toFixed(1)} words per sentence`);
      } else if (avgSentenceLength <= 3) {
        const structurePenalty = 0.3;
        rating -= structurePenalty;
        console.log(`➖ Poor sentence structure (-${structurePenalty}): avg ${avgSentenceLength.toFixed(1)} words per sentence`);
      }

      // Vocabulary diversity (unique words vs total words)
      const words = actualAnswer.toLowerCase().match(/\b\w+\b/g) || [];
      const uniqueWords = new Set(words);
      const diversityRatio = uniqueWords.size / words.length;

      if (diversityRatio > 0.6) {
        const vocabBonus = 0.6;
        rating += vocabBonus;
        console.log(`➕ High vocabulary diversity (+${vocabBonus}): ${(diversityRatio * 100).toFixed(1)}% unique words`);
      } else if (diversityRatio < 0.3) {
        const vocabPenalty = 0.4;
        rating -= vocabPenalty;
        console.log(`➖ Low vocabulary diversity (-${vocabPenalty}): ${(diversityRatio * 100).toFixed(1)}% unique words`);
      }

      // Confidence markers
      const confidenceWords = ['definitely', 'certainly', 'absolutely', 'clearly', 'obviously', 'precisely', 'exactly', 'confident', 'sure', 'believe', 'think'];
      const uncertaintyWords = ['maybe', 'perhaps', 'possibly', 'might', 'probably', 'i guess', 'not sure', 'uncertain', 'confused', 'dont know'];

      const confidenceCount = confidenceWords.filter(word => answer.includes(word)).length;
      const uncertaintyCount = uncertaintyWords.filter(word => answer.includes(word)).length;

      if (confidenceCount > uncertaintyCount) {
        const confidenceBonus = (confidenceCount - uncertaintyCount) * 0.2;
        rating += confidenceBonus;
        console.log(`➕ Confidence markers (+${confidenceBonus.toFixed(1)}): ${confidenceCount} confident vs ${uncertaintyCount} uncertain`);
      } else if (uncertaintyCount > 2) {
        const uncertaintyPenalty = Math.min(uncertaintyCount * 0.15, 0.8);
        rating -= uncertaintyPenalty;
        console.log(`➖ Uncertainty penalty (-${uncertaintyPenalty.toFixed(1)}): found ${uncertaintyCount} uncertainty markers`);
      }

      // Speaking fluency indicators
      const repetitionPattern = /(\b\w+\b)\s+\1/gi;
      const repetitions = (actualAnswer.match(repetitionPattern) || []).length;

      if (repetitions > 0) {
        const repetitionPenalty = Math.min(repetitions * 0.25, 1.0);
        rating -= repetitionPenalty;
        console.log(`➖ Word repetition penalty (-${repetitionPenalty.toFixed(1)}): found ${repetitions} repetitions`);
      }

      // Professional language indicators
      const professionalWords = ['experience', 'project', 'responsibility', 'achievement', 'collaborate', 'manage', 'develop', 'implement', 'analyze', 'solution'];
      const profWordCount = professionalWords.filter(word => answer.includes(word)).length;
      rating += profWordCount * 0.2;

      // Structure indicators (shows organized thinking)
      const structureWords = ['first', 'second', 'finally', 'additionally', 'furthermore', 'however', 'therefore', 'for example', 'in conclusion'];
      const structureCount = structureWords.filter(word => answer.includes(word)).length;
      rating += structureCount * 0.4;

      // Specific examples boost
      if (answer.includes('example') || answer.includes('instance') || answer.includes('case')) {
        rating += 0.5;
        console.log(`➕ Examples provided (+0.5): answer includes specific examples`);
      }

      // Context relevance bonus (if answer relates to the question)
      const questionWords = qa.question.toLowerCase().match(/\b\w+\b/g) || [];
      const answerWords: string[] = answer.match(/\b\w+\b/g) || [];
      const relevantWords = questionWords.filter(qWord =>
        qWord.length > 3 && answerWords.includes(qWord)
      ).length;

      if (relevantWords > 0) {
        const relevanceBonus = Math.min(relevantWords * 0.3, 1.2);
        rating += relevanceBonus;
        console.log(`➕ Context relevance bonus (+${relevanceBonus.toFixed(1)}): ${relevantWords} relevant words`);
      }

      // Voice tone adjustments
      let communicationRating = qa.confidenceLevel;
      if (qa.voiceTone) {
        communicationRating = Math.round(
          (qa.voiceTone.clarity + qa.voiceTone.engagement + qa.voiceTone.confidence) / 3
        );
      }

      // Final rating normalization and slight randomization
      const preNormalizedRating = rating;
      rating = Math.max(1, Math.min(10, rating)); // Ensure rating stays within 1-10
      rating += (Math.random() - 0.5) * 0.3; // Add small random factor
      rating = Math.max(1, Math.min(10, Math.round(rating))); // Round and clamp again

      console.log(`\n✨ FINAL SCORE for "${qa.question.substring(0, 50)}..."`);
      console.log(`   Raw calculated: ${preNormalizedRating.toFixed(2)} | Final: ${rating}/10`);
      console.log(`   Answer length: ${actualAnswer.length} chars | Word count: ${wordCount}`);
      console.log(`   Confidence: ${qa.confidenceLevel}/10 | Communication: ${communicationRating}/10\n`);

      totalRating += rating;
      totalConfidence += qa.confidenceLevel;
      totalCommunication += communicationRating;

      // Generate detailed feedback templates
      const feedbackTemplates = this.getFeedbackTemplates(rating, qa.confidenceLevel, communicationRating, qa.userAnswer, qa.question);
      const idealAnswers = this.getIdealAnswerTemplates(qa.question, interviewType);

      return {
        question: qa.question,
        userAnswer: qa.userAnswer,
        rating,
        feedback: feedbackTemplates.feedback,
        idealAnswer: idealAnswers,
        confidenceLevel: qa.confidenceLevel,
        voiceFeedback: qa.voiceTone?.feedback || 'Good communication overall.'
      };
    });

    // Calculate overall scores
    report.overallRating = Math.round(totalRating / allAnswers.length);
    report.overallConfidenceLevel = Math.round(totalConfidence / allAnswers.length);
    report.communicationScore = Math.round(totalCommunication / allAnswers.length);

    // Generate overall feedback
    report.overallFeedback = this.generateOverallFeedback(
      report.overallRating,
      report.overallConfidenceLevel,
      report.communicationScore,
      interviewType
    );

    return report;
  }

  /**
   * Generate detailed feedback templates based on comprehensive analysis
   */
  private getFeedbackTemplates(rating: number, confidence: number, communication: number, userAnswer: string, question: string): { feedback: string } {
    const feedbacks = [];
    const answerLength = userAnswer.length;
    const wordCount = userAnswer.split(' ').filter(word => word.length > 0).length;
    const answer = userAnswer.toLowerCase();

    // Content depth analysis
    if (rating >= 9) {
      feedbacks.push('🌟 Outstanding response! You demonstrated exceptional understanding with comprehensive details and clear examples.');
    } else if (rating >= 8) {
      feedbacks.push('✅ Excellent answer! Your response shows strong knowledge and good structure.');
    } else if (rating >= 7) {
      feedbacks.push('👍 Good response with solid understanding. Consider adding more specific examples to strengthen your answer.');
    } else if (rating >= 6) {
      feedbacks.push('👌 Decent answer that covers the basics. Try to elaborate more on key points and provide concrete examples.');
    } else {
      feedbacks.push('💡 Your answer addresses the question but needs more depth. Consider expanding on your points with specific examples and details.');
    }

    // Length and structure feedback
    if (answerLength < 50) {
      feedbacks.push('⚡ Tip: Aim for more detailed responses (100-200+ words) to fully showcase your knowledge.');
    } else if (answerLength > 500) {
      feedbacks.push('📝 Great detail! Consider organizing longer responses into clear sections for maximum impact.');
    }

    // Confidence and delivery feedback
    if (confidence >= 8) {
      feedbacks.push('🎯 Your confident delivery makes your expertise clear and compelling.');
    } else if (confidence >= 6) {
      feedbacks.push('🔹 Good confidence level. Speaking with even more certainty will enhance your professional presence.');
    } else {
      feedbacks.push('💪 Practice speaking with more conviction. Your knowledge is there—let your confidence match it!');
    }

    // Communication style feedback
    if (communication >= 8) {
      feedbacks.push('🎤 Excellent communication style—clear, engaging, and professional.');
    } else if (communication >= 6) {
      feedbacks.push('🗣️ Good communication. Focus on speaking clearly and at a steady pace for maximum impact.');
    } else {
      feedbacks.push('📢 Work on clarity and engagement. Practice speaking slowly and emphasizing key points.');
    }

    // Specific improvement suggestions based on content
    if (!answer.includes('example') && !answer.includes('instance')) {
      feedbacks.push('🎯 Pro tip: Include specific examples from your experience to make answers more compelling.');
    }

    if (question.toLowerCase().includes('tell me about yourself') && answerLength < 150) {
      feedbacks.push('📋 For "Tell me about yourself" questions, aim for 2-3 minutes covering background, experience, and career goals.');
    }

    return { feedback: feedbacks.join(' ') };
  }

  /**
   * Generate comprehensive ideal answer templates
   */
  private getIdealAnswerTemplates(question: string, interviewType: string): string {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('tell me about yourself')) {
      return '🎆 Ideal Structure: (1) Brief background & education (2) Relevant work experience with key achievements (3) Core skills that match the role (4) Career goals and why you\'re interested in this position. Aim for 2-3 minutes, be authentic, and end with enthusiasm for the role.';
    } else if (lowerQuestion.includes('strength')) {
      return '💪 Ideal Approach: Choose a strength relevant to the role, provide a specific example demonstrating this strength in action, explain the positive impact it had, and connect it to how you\'ll contribute in this position.';
    } else if (lowerQuestion.includes('weakness')) {
      return '🔄 Ideal Strategy: Mention a real weakness (not a disguised strength), explain steps you\'re taking to improve, show self-awareness and growth mindset, and demonstrate how you\'ve already made progress.';
    } else if (lowerQuestion.includes('experience') || lowerQuestion.includes('project')) {
      return '🛠️ Ideal Format: Use STAR method - Situation (context), Task (your responsibility), Action (specific steps you took), Result (measurable outcomes). Include challenges faced, your problem-solving approach, and lessons learned.';
    } else if (lowerQuestion.includes('challenge') || lowerQuestion.includes('problem') || lowerQuestion.includes('difficult')) {
      return '🎯 STAR Method: Situation (set the scene), Task (what needed to be done), Action (your specific contributions and reasoning), Result (positive outcomes with metrics if possible). Show resilience and learning.';
    } else if (lowerQuestion.includes('team') || lowerQuestion.includes('collaborate')) {
      return '🤝 Team Excellence: Describe your role in the team, how you contributed to team goals, examples of effective communication, conflict resolution if applicable, and the collective success achieved.';
    } else if (lowerQuestion.includes('leadership') || lowerQuestion.includes('lead')) {
      return '🚀 Leadership Framework: Situation requiring leadership, your approach to motivating others, specific actions taken, how you handled challenges, and the results achieved by your team.';
    } else if (interviewType.toLowerCase().includes('technical')) {
      return '💻 Technical Excellence: Explain the core concept clearly, provide practical examples, discuss pros/cons or trade-offs, mention best practices, show depth of understanding, and relate to real-world applications.';
    } else if (lowerQuestion.includes('goal') || lowerQuestion.includes('future')) {
      return '🎆 Future Vision: Share realistic short-term and long-term goals, explain how this role fits your career path, demonstrate ambition balanced with commitment, and show alignment with company growth.';
    } else {
      return '✨ Strong Answer Structure: Clear introduction to your point, specific examples with context, explain your thought process and actions taken, quantify results where possible, and connect back to the role/company needs.';
    }
  }

  /**
   * Generate overall feedback summary
   */
  private generateOverallFeedback(
    rating: number,
    confidence: number,
    communication: number,
    interviewType: string
  ): string {
    const parts = [];

    if (rating >= 8) {
      parts.push('Outstanding interview performance! You demonstrated strong knowledge and skills.');
    } else if (rating >= 6) {
      parts.push('Good interview performance with solid understanding of key concepts.');
    } else {
      parts.push('Room for improvement in technical knowledge and answer depth.');
    }

    if (confidence >= 7) {
      parts.push('You showed good confidence throughout the interview.');
    } else {
      parts.push('Consider building more confidence in your responses.');
    }

    if (communication >= 7) {
      parts.push('Your communication skills were effective and professional.');
    } else {
      parts.push('Focus on improving clarity and engagement in your communication.');
    }

    parts.push('Continue practicing to further enhance your interview skills.');

    return parts.join(' ');
  }

  /**
   * Generate Aptitude MCQ Questions using AI (Ollama)
   */
  async generateAptitudeMCQsWithAI(
    difficulty: 'Easy' | 'Medium' | 'Hard',
    count: number,
    context?: string
  ): Promise<Array<{
    id: string;
    question: string;
    options: { A: string; B: string; C: string; D: string };
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    difficulty: 'Easy' | 'Medium' | 'Hard';
    category: 'Mathematics' | 'Logical Reasoning' | 'Analytical' | 'Quantitative Aptitude' | 'Verbal Reasoning';
    marks: number;
  }>> {
    try {
      const marks = difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3;
      const contextHint = context ? ` Context: ${context.substring(0, 200)}` : '';

      const prompt = `Generate ${count} ${difficulty} aptitude MCQ questions.${contextHint}
Return ONLY a JSON array. Each element: {"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"A or B or C or D","category":"Mathematics or Logical Reasoning or Analytical or Quantitative Aptitude or Verbal Reasoning"}
Example: [{"question":"What is 25% of 80?","options":{"A":"15","B":"20","C":"25","D":"30"},"correctAnswer":"B","category":"Mathematics"}]`;

      console.log(`🧠 Ollama: Generating ${count} ${difficulty} aptitude MCQs...`);

      const response = await Promise.race([
        this.generateResponse(prompt, false),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Ollama MCQ timeout after 90s')), 90000)
        )
      ]);

      // Parse JSON from response
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');

      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanResponse) as any[];

      const mcqs = parsed.map((q: any, index: number) => ({
        id: `ollama-apt-${Date.now()}-${index}`,
        question: q.question,
        options: {
          A: q.options?.A || q.options?.a || 'Option A',
          B: q.options?.B || q.options?.b || 'Option B',
          C: q.options?.C || q.options?.c || 'Option C',
          D: q.options?.D || q.options?.d || 'Option D',
        },
        correctAnswer: (q.correctAnswer || q.correct_answer || 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D',
        difficulty,
        category: (q.category || 'Mathematics') as any,
        marks,
      }));

      if (mcqs.length > 0) {
        console.log(`✅ Ollama generated ${mcqs.length} aptitude MCQs`);
        return mcqs.slice(0, count);
      }

      throw new Error('No valid MCQs parsed');
    } catch (error) {
      console.warn('⚠️ Ollama MCQ generation failed, using hardcoded bank:', error);
      return this.generateAptitudeQuestions(difficulty, count);
    }
  }

  /**
   * Generate Aptitude MCQ Questions from hardcoded bank (fallback)
   */
  generateAptitudeQuestions(difficulty: 'Easy' | 'Medium' | 'Hard', count?: number): Array<{
    id: string;
    question: string;
    options: { A: string; B: string; C: string; D: string };
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    difficulty: 'Easy' | 'Medium' | 'Hard';
    category: 'Mathematics' | 'Logical Reasoning' | 'Analytical' | 'Quantitative Aptitude' | 'Verbal Reasoning';
    marks: number;
  }> {
    const questionBank = this.getAptitudeQuestionBank();
    const filteredQuestions = questionBank.filter(q => q.difficulty === difficulty);

    // Determine count based on difficulty if not specified
    const questionCount = count || (difficulty === 'Easy' ? 10 : difficulty === 'Medium' ? 15 : 20);

    // Shuffle and select questions
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, questionCount);

    // Ensure we have enough questions by repeating if needed
    while (selected.length < questionCount && filteredQuestions.length > 0) {
      selected.push(filteredQuestions[selected.length % filteredQuestions.length]);
    }

    return selected.slice(0, questionCount);
  }

  /**
   * Comprehensive Aptitude Question Bank
   */
  private getAptitudeQuestionBank() {
    return [
      // EASY - Mathematics
      {
        id: 'apt_easy_math_1',
        question: 'If a book costs $15 and you buy 4 books, how much do you pay in total?',
        options: { A: '$45', B: '$50', C: '$55', D: '$60' },
        correctAnswer: 'D' as const,
        difficulty: 'Easy' as const,
        category: 'Mathematics' as const,
        marks: 1
      },
      {
        id: 'apt_easy_math_2',
        question: 'What is 25% of 80?',
        options: { A: '15', B: '20', C: '25', D: '30' },
        correctAnswer: 'B' as const,
        difficulty: 'Easy' as const,
        category: 'Mathematics' as const,
        marks: 1
      },
      {
        id: 'apt_easy_math_3',
        question: 'If 5x = 25, what is the value of x?',
        options: { A: '3', B: '4', C: '5', D: '6' },
        correctAnswer: 'C' as const,
        difficulty: 'Easy' as const,
        category: 'Mathematics' as const,
        marks: 1
      },
      {
        id: 'apt_easy_math_4',
        question: 'What is the next number in the sequence: 2, 4, 6, 8, __?',
        options: { A: '9', B: '10', C: '11', D: '12' },
        correctAnswer: 'B' as const,
        difficulty: 'Easy' as const,
        category: 'Mathematics' as const,
        marks: 1
      },
      {
        id: 'apt_easy_math_5',
        question: 'If a train travels 60 km in 1 hour, how far will it travel in 3 hours at the same speed?',
        options: { A: '120 km', B: '150 km', C: '180 km', D: '200 km' },
        correctAnswer: 'C' as const,
        difficulty: 'Easy' as const,
        category: 'Mathematics' as const,
        marks: 1
      },

      // EASY - Logical Reasoning
      {
        id: 'apt_easy_logic_1',
        question: 'Which one is different from the others? Apple, Banana, Carrot, Mango',
        options: { A: 'Apple', B: 'Banana', C: 'Carrot', D: 'Mango' },
        correctAnswer: 'C' as const,
        difficulty: 'Easy' as const,
        category: 'Logical Reasoning' as const,
        marks: 1
      },
      {
        id: 'apt_easy_logic_2',
        question: 'If all roses are flowers and some flowers are red, which statement is true?',
        options: {
          A: 'All roses are red',
          B: 'Some roses may be red',
          C: 'No roses are red',
          D: 'All flowers are roses'
        },
        correctAnswer: 'B' as const,
        difficulty: 'Easy' as const,
        category: 'Logical Reasoning' as const,
        marks: 1
      },
      {
        id: 'apt_easy_logic_3',
        question: 'Complete the pattern: A, C, E, G, __',
        options: { A: 'H', B: 'I', C: 'J', D: 'K' },
        correctAnswer: 'B' as const,
        difficulty: 'Easy' as const,
        category: 'Logical Reasoning' as const,
        marks: 1
      },
      {
        id: 'apt_easy_logic_4',
        question: 'If DOG is coded as 4-15-7, what is CAT coded as?',
        options: { A: '3-1-20', B: '3-1-19', C: '2-1-20', D: '3-2-20' },
        correctAnswer: 'A' as const,
        difficulty: 'Easy' as const,
        category: 'Logical Reasoning' as const,
        marks: 1
      },
      {
        id: 'apt_easy_logic_5',
        question: 'Which number completes the series: 1, 1, 2, 3, 5, 8, __?',
        options: { A: '11', B: '12', C: '13', D: '14' },
        correctAnswer: 'C' as const,
        difficulty: 'Easy' as const,
        category: 'Logical Reasoning' as const,
        marks: 1
      },

      // EASY - Verbal Reasoning
      {
        id: 'apt_easy_verbal_1',
        question: 'Choose the word that is most similar to "Happy": ',
        options: { A: 'Sad', B: 'Joyful', C: 'Angry', D: 'Tired' },
        correctAnswer: 'B' as const,
        difficulty: 'Easy' as const,
        category: 'Verbal Reasoning' as const,
        marks: 1
      },
      {
        id: 'apt_easy_verbal_2',
        question: 'Choose the opposite of "Hot":',
        options: { A: 'Warm', B: 'Cool', C: 'Cold', D: 'Freezing' },
        correctAnswer: 'C' as const,
        difficulty: 'Easy' as const,
        category: 'Verbal Reasoning' as const,
        marks: 1
      },
      {
        id: 'apt_easy_verbal_3',
        question: 'Book is to Reading as Fork is to:',
        options: { A: 'Drawing', B: 'Writing', C: 'Eating', D: 'Cooking' },
        correctAnswer: 'C' as const,
        difficulty: 'Easy' as const,
        category: 'Verbal Reasoning' as const,
        marks: 1
      },

      // MEDIUM - Mathematics
      {
        id: 'apt_med_math_1',
        question: 'A car travels 240 km in 4 hours. What is its average speed in km/h?',
        options: { A: '50 km/h', B: '60 km/h', C: '70 km/h', D: '80 km/h' },
        correctAnswer: 'B' as const,
        difficulty: 'Medium' as const,
        category: 'Mathematics' as const,
        marks: 2
      },
      {
        id: 'apt_med_math_2',
        question: 'If the cost price of an item is $80 and it is sold at a 25% profit, what is the selling price?',
        options: { A: '$95', B: '$100', C: '$105', D: '$110' },
        correctAnswer: 'B' as const,
        difficulty: 'Medium' as const,
        category: 'Mathematics' as const,
        marks: 2
      },
      {
        id: 'apt_med_math_3',
        question: 'What is the average of 12, 18, 24, and 30?',
        options: { A: '18', B: '21', C: '24', D: '27' },
        correctAnswer: 'B' as const,
        difficulty: 'Medium' as const,
        category: 'Mathematics' as const,
        marks: 2
      },
      {
        id: 'apt_med_math_4',
        question: 'If 3x + 5 = 20, what is x?',
        options: { A: '3', B: '4', C: '5', D: '6' },
        correctAnswer: 'C' as const,
        difficulty: 'Medium' as const,
        category: 'Mathematics' as const,
        marks: 2
      },
      {
        id: 'apt_med_math_5',
        question: 'A rectangle has length 12 cm and width 8 cm. What is its perimeter?',
        options: { A: '32 cm', B: '36 cm', C: '40 cm', D: '44 cm' },
        correctAnswer: 'C' as const,
        difficulty: 'Medium' as const,
        category: 'Mathematics' as const,
        marks: 2
      },
      {
        id: 'apt_med_math_6',
        question: 'If 20% of a number is 40, what is the number?',
        options: { A: '150', B: '180', C: '200', D: '220' },
        correctAnswer: 'C' as const,
        difficulty: 'Medium' as const,
        category: 'Mathematics' as const,
        marks: 2
      },

      // MEDIUM - Logical Reasoning
      {
        id: 'apt_med_logic_1',
        question: 'In a class of 40 students, 25 play cricket and 20 play football. If 10 play both, how many play neither?',
        options: { A: '3', B: '5', C: '7', D: '10' },
        correctAnswer: 'B' as const,
        difficulty: 'Medium' as const,
        category: 'Logical Reasoning' as const,
        marks: 2
      },
      {
        id: 'apt_med_logic_2',
        question: 'If FRIEND is coded as GSJFOE, how is MOTHER coded?',
        options: { A: 'NPUIFS', B: 'NPUIFR', C: 'NPUIFSM', D: 'OPUIFS' },
        correctAnswer: 'A' as const,
        difficulty: 'Medium' as const,
        category: 'Logical Reasoning' as const,
        marks: 2
      },
      {
        id: 'apt_med_logic_3',
        question: 'If 2 cats can catch 2 rats in 2 minutes, how many cats are needed to catch 6 rats in 6 minutes?',
        options: { A: '2 cats', B: '3 cats', C: '4 cats', D: '6 cats' },
        correctAnswer: 'A' as const,
        difficulty: 'Medium' as const,
        category: 'Logical Reasoning' as const,
        marks: 2
      },
      {
        id: 'apt_med_logic_4',
        question: 'What comes next in the pattern: 2, 6, 12, 20, 30, __?',
        options: { A: '38', B: '40', C: '42', D: '44' },
        correctAnswer: 'C' as const,
        difficulty: 'Medium' as const,
        category: 'Logical Reasoning' as const,
        marks: 2
      },
      {
        id: 'apt_med_logic_5',
        question: 'A is taller than B. C is shorter than B. Who is the shortest?',
        options: { A: 'A', B: 'B', C: 'C', D: 'Cannot determine' },
        correctAnswer: 'C' as const,
        difficulty: 'Medium' as const,
        category: 'Logical Reasoning' as const,
        marks: 2
      },

      // MEDIUM - Analytical
      {
        id: 'apt_med_analytical_1',
        question: 'If all managers are employees, and some employees are engineers, which is necessarily true?',
        options: {
          A: 'All managers are engineers',
          B: 'Some managers may be engineers',
          C: 'No managers are engineers',
          D: 'All engineers are managers'
        },
        correctAnswer: 'B' as const,
        difficulty: 'Medium' as const,
        category: 'Analytical' as const,
        marks: 2
      },
      {
        id: 'apt_med_analytical_2',
        question: 'In a certain code, if COMPUTER is written as DPNQVUFS, how is KEYBOARD written?',
        options: { A: 'LFZCPBSE', B: 'LFZBPBSE', C: 'LFZCPASE', D: 'KFZCPBSE' },
        correctAnswer: 'A' as const,
        difficulty: 'Medium' as const,
        category: 'Analytical' as const,
        marks: 2
      },

      // HARD - Mathematics
      {
        id: 'apt_hard_math_1',
        question: 'A train 150m long passes a pole in 15 seconds. What is its speed in km/h?',
        options: { A: '30 km/h', B: '36 km/h', C: '40 km/h', D: '45 km/h' },
        correctAnswer: 'B' as const,
        difficulty: 'Hard' as const,
        category: 'Mathematics' as const,
        marks: 3
      },
      {
        id: 'apt_hard_math_2',
        question: 'If the ratio of boys to girls in a class is 3:2 and there are 18 boys, how many total students are there?',
        options: { A: '24', B: '28', C: '30', D: '32' },
        correctAnswer: 'C' as const,
        difficulty: 'Hard' as const,
        category: 'Mathematics' as const,
        marks: 3
      },
      {
        id: 'apt_hard_math_3',
        question: 'A sum of money doubles itself in 8 years at simple interest. In how many years will it triple?',
        options: { A: '12 years', B: '14 years', C: '16 years', D: '18 years' },
        correctAnswer: 'C' as const,
        difficulty: 'Hard' as const,
        category: 'Mathematics' as const,
        marks: 3
      },
      {
        id: 'apt_hard_math_4',
        question: 'If x² - 5x + 6 = 0, what are the possible values of x?',
        options: { A: 'x = 1, 6', B: 'x = 2, 3', C: 'x = -2, -3', D: 'x = 1, 4' },
        correctAnswer: 'B' as const,
        difficulty: 'Hard' as const,
        category: 'Mathematics' as const,
        marks: 3
      },
      {
        id: 'apt_hard_math_5',
        question: 'A shopkeeper marks his goods 40% above cost price and gives a discount of 20%. What is his profit percentage?',
        options: { A: '10%', B: '12%', C: '15%', D: '18%' },
        correctAnswer: 'B' as const,
        difficulty: 'Hard' as const,
        category: 'Mathematics' as const,
        marks: 3
      },
      {
        id: 'apt_hard_math_6',
        question: 'The sum of three consecutive even numbers is 78. What is the largest number?',
        options: { A: '24', B: '26', C: '28', D: '30' },
        correctAnswer: 'C' as const,
        difficulty: 'Hard' as const,
        category: 'Mathematics' as const,
        marks: 3
      },
      {
        id: 'apt_hard_math_7',
        question: 'If 15 workers can complete a job in 24 days, how many days will 20 workers take?',
        options: { A: '16 days', B: '18 days', C: '20 days', D: '22 days' },
        correctAnswer: 'B' as const,
        difficulty: 'Hard' as const,
        category: 'Mathematics' as const,
        marks: 3
      },

      // HARD - Logical Reasoning
      {
        id: 'apt_hard_logic_1',
        question: 'In a row of 25 children, when John was shifted 4 places to the right, he became 12th from the left. What was his earlier position from the left?',
        options: { A: '6th', B: '7th', C: '8th', D: '9th' },
        correctAnswer: 'C' as const,
        difficulty: 'Hard' as const,
        category: 'Logical Reasoning' as const,
        marks: 3
      },
      {
        id: 'apt_hard_logic_2',
        question: 'If in a code language COMPUTER is written as RFUVQNPC, how is MEDICINE written?',
        options: { A: 'EFJDJEFM', B: 'EFJDEJFM', C: 'EFJDJNEF', D: 'EFJJEJFN' },
        correctAnswer: 'A' as const,
        difficulty: 'Hard' as const,
        category: 'Logical Reasoning' as const,
        marks: 3
      },
      {
        id: 'apt_hard_logic_3',
        question: 'A is B\'s brother. C is A\'s mother. D is C\'s father. E is D\'s mother. How is A related to D?',
        options: { A: 'Grandson', B: 'Son', C: 'Grandfather', D: 'Great Grandson' },
        correctAnswer: 'A' as const,
        difficulty: 'Hard' as const,
        category: 'Logical Reasoning' as const,
        marks: 3
      },
      {
        id: 'apt_hard_logic_4',
        question: 'Find the odd one out: 121, 144, 169, 196, 200',
        options: { A: '121', B: '144', C: '169', D: '200' },
        correctAnswer: 'D' as const,
        difficulty: 'Hard' as const,
        category: 'Logical Reasoning' as const,
        marks: 3
      },
      {
        id: 'apt_hard_logic_5',
        question: 'If PLANT is coded as 16, 12, 1, 14, 20, how much is GRASS coded?',
        options: { A: '45', B: '50', C: '55', D: '60' },
        correctAnswer: 'C' as const,
        difficulty: 'Hard' as const,
        category: 'Logical Reasoning' as const,
        marks: 3
      },

      // HARD - Analytical
      {
        id: 'apt_hard_analytical_1',
        question: 'Five friends are sitting in a row. A is to the left of B but to the right of C. E is to the right of B but to the left of D. Who is in the middle?',
        options: { A: 'A', B: 'B', C: 'C', D: 'E' },
        correctAnswer: 'B' as const,
        difficulty: 'Hard' as const,
        category: 'Analytical' as const,
        marks: 3
      },
      {
        id: 'apt_hard_analytical_2',
        question: 'In a certain language, MADRAS is coded as NBESBT. How is BOMBAY coded?',
        options: { A: 'CPNCBZ', B: 'CPOCBZ', C: 'DPNCBZ', D: 'CPNDBZ' },
        correctAnswer: 'A' as const,
        difficulty: 'Hard' as const,
        category: 'Analytical' as const,
        marks: 3
      },
      {
        id: 'apt_hard_analytical_3',
        question: 'If the day before yesterday was Thursday, what day will be the day after tomorrow?',
        options: { A: 'Monday', B: 'Tuesday', C: 'Wednesday', D: 'Thursday' },
        correctAnswer: 'A' as const,
        difficulty: 'Hard' as const,
        category: 'Analytical' as const,
        marks: 3
      },

      // HARD - Quantitative Aptitude
      {
        id: 'apt_hard_quant_1',
        question: 'The compound interest on $8000 at 15% per annum for 2 years compounded annually is:',
        options: { A: '$2490', B: '$2520', C: '$2550', D: '$2580' },
        correctAnswer: 'B' as const,
        difficulty: 'Hard' as const,
        category: 'Quantitative Aptitude' as const,
        marks: 3
      },
      {
        id: 'apt_hard_quant_2',
        question: 'A pipe can fill a tank in 6 hours. Due to a leak, it takes 8 hours. How long will the leak take to empty the full tank?',
        options: { A: '20 hours', B: '22 hours', C: '24 hours', D: '26 hours' },
        correctAnswer: 'C' as const,
        difficulty: 'Hard' as const,
        category: 'Quantitative Aptitude' as const,
        marks: 3
      },
      {
        id: 'apt_hard_quant_3',
        question: 'A man rows downstream 32 km and upstream 14 km taking 6 hours each. What is the speed of the stream?',
        options: { A: '1.5 km/h', B: '1.75 km/h', C: '2 km/h', D: '2.5 km/h' },
        correctAnswer: 'A' as const,
        difficulty: 'Hard' as const,
        category: 'Quantitative Aptitude' as const,
        marks: 3
      }
    ];
  }

  /**
   * Evaluate Aptitude Test Answers  
   */
  evaluateAptitudeAnswers(
    questions: Array<{
      id: string;
      question: string;
      options: { A: string; B: string; C: string; D: string };
      correctAnswer: 'A' | 'B' | 'C' | 'D';
      difficulty: 'Easy' | 'Medium' | 'Hard';
      category: string;
      marks: number;
    }>,
    userAnswers: Record<string, string>
  ): {
    totalMarks: number;
    scoredMarks: number;
    percentage: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unanswered: number;
    categoryWisePerformance: Record<string, { correct: number; total: number; percentage: number }>;
    difficultyWisePerformance: Record<string, { correct: number; total: number; percentage: number }>;
    detailedResults: Array<{
      questionId: string;
      question: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      marks: number;
      scoredMarks: number;
      category: string;
      difficulty: string;
    }>;
  } {
    let totalMarks = 0;
    let scoredMarks = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let unanswered = 0;

    const categoryWise: Record<string, { correct: number; total: number }> = {};
    const difficultyWise: Record<string, { correct: number; total: number }> = {};
    const detailedResults: Array<any> = [];

    questions.forEach(question => {
      totalMarks += question.marks;
      const userAnswer = userAnswers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;

      // Initialize category tracking
      if (!categoryWise[question.category]) {
        categoryWise[question.category] = { correct: 0, total: 0 };
      }
      categoryWise[question.category].total++;

      // Initialize difficulty tracking
      if (!difficultyWise[question.difficulty]) {
        difficultyWise[question.difficulty] = { correct: 0, total: 0 };
      }
      difficultyWise[question.difficulty].total++;

      if (!userAnswer) {
        unanswered++;
      } else if (isCorrect) {
        correctAnswers++;
        scoredMarks += question.marks;
        categoryWise[question.category].correct++;
        difficultyWise[question.difficulty].correct++;
      } else {
        incorrectAnswers++;
      }

      detailedResults.push({
        questionId: question.id,
        question: question.question,
        userAnswer: userAnswer || 'Not Answered',
        correctAnswer: question.correctAnswer,
        isCorrect,
        marks: question.marks,
        scoredMarks: isCorrect ? question.marks : 0,
        category: question.category,
        difficulty: question.difficulty
      });
    });

    // Calculate percentages
    const categoryWisePerformance: Record<string, { correct: number; total: number; percentage: number }> = {};
    Object.keys(categoryWise).forEach(category => {
      categoryWisePerformance[category] = {
        ...categoryWise[category],
        percentage: Math.round((categoryWise[category].correct / categoryWise[category].total) * 100)
      };
    });

    const difficultyWisePerformance: Record<string, { correct: number; total: number; percentage: number }> = {};
    Object.keys(difficultyWise).forEach(difficulty => {
      difficultyWisePerformance[difficulty] = {
        ...difficultyWise[difficulty],
        percentage: Math.round((difficultyWise[difficulty].correct / difficultyWise[difficulty].total) * 100)
      };
    });

    return {
      totalMarks,
      scoredMarks,
      percentage: Math.round((scoredMarks / totalMarks) * 100),
      correctAnswers,
      incorrectAnswers,
      unanswered,
      categoryWisePerformance,
      difficultyWisePerformance,
      detailedResults
    };
  }

  /**
   * Check if Ollama service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }
}

// Create and export singleton instance
export const ollamaService = new OllamaService();

// For backward compatibility with existing chat session pattern
export const ollamaChatSession = {
  sendMessage: async (prompt: string) => {
    const response = await ollamaService.generateResponse(prompt);
    return {
      response: {
        text: () => response,
      },
    };
  },
};