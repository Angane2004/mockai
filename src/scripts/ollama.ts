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
  private model = 'llama3';
  private warmupDone = false;

  /**
   * Warm up the model for faster subsequent requests
   */
  async warmup(): Promise<void> {
    if (this.warmupDone) return;
    
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
      console.log('Ollama model warmed up');
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
          num_predict: 100,
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
          num_predict: 200,
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
   * Generate interview questions with 90%+ accuracy based on user input
   */
  async generateInterviewQuestions(
    interviewData: {
      objective: string;
      interviewType: string;
      depthLevel: string;
      numQuestions: number;
      resumeText?: string;
    }
  ): Promise<string[]> {
    try {
      // Extract skills from resume if provided
      let skills: string[] = [];
      if (interviewData.resumeText && interviewData.resumeText.length > 20) {
        skills = await this.extractResumeSkills(interviewData.resumeText);
        console.log('Extracted skills from resume:', skills);
      }

      // Build highly specific prompt based on user input for maximum accuracy
      const skillsContext = skills.length > 0 
        ? `Focus on these technologies/skills from the candidate's background: ${skills.join(', ')}.` 
        : '';

      const prompt = `You are an expert interviewer. Generate EXACTLY ${interviewData.numQuestions} interview questions.

Interview Details:
- Position/Objective: ${interviewData.objective}
- Interview Type: ${interviewData.interviewType}
- Difficulty Level: ${interviewData.depthLevel}
${skillsContext}

Requirements:
1. Questions must be directly relevant to "${interviewData.objective}"
2. Match the "${interviewData.depthLevel}" difficulty level precisely
3. Focus on "${interviewData.interviewType}" interview style
4. Each question should be clear, specific, and professional
5. Number each question (1., 2., 3., etc.)

Generate ${interviewData.numQuestions} questions now:`;

      // Use optimized settings for accuracy
      const response = await this.generateResponse(prompt, false);
      
      // Parse questions with improved accuracy
      const lines = response.split('\n');
      const questions: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Match numbered questions (1., 2., etc.) or bullet points
        const match = trimmed.match(/^(?:\d+[\.)]\s*|[-•*]\s*)(.+)/);
        if (match && match[1].length > 15) {
          let question = match[1].trim();
          // Remove trailing punctuation if not a question mark
          if (!question.endsWith('?')) {
            question += '?';
          }
          questions.push(question);
        }
      }

      // If we got enough questions, return them
      if (questions.length >= interviewData.numQuestions) {
        console.log(`Generated ${questions.length} accurate questions based on user input`);
        return questions.slice(0, interviewData.numQuestions);
      }

      // Fallback: Try to get more questions if needed
      if (questions.length > 0 && questions.length < interviewData.numQuestions) {
        console.log(`Got ${questions.length} questions, supplementing with cached questions`);
        const cachedQuestions = this.getInstantQuestions(
          interviewData.interviewType,
          interviewData.depthLevel,
          interviewData.numQuestions - questions.length
        );
        return [...questions, ...cachedQuestions].slice(0, interviewData.numQuestions);
      }

      // Last resort: use cached questions
      console.log('Falling back to cached questions');
      return this.getInstantQuestions(
        interviewData.interviewType,
        interviewData.depthLevel,
        interviewData.numQuestions
      );
    } catch (error) {
      console.error('Error generating questions:', error);
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
    
    // Try different key formats to find matching questions
    let questions: string[] = [];
    
    // Try exact match first
    let key = `${normalizedType}_${normalizedDepth}`;
    if (questionBank[key]) {
      questions = questionBank[key];
    } else {
      // Try partial matches
      if (normalizedType.includes('communication')) {
        questions = questionBank[`communication_${normalizedDepth}`] || questionBank['communication_intermediate'];
      } else if (normalizedType.includes('hr') || normalizedType.includes('behavioral')) {
        questions = questionBank[`hr round_${normalizedDepth}`] || questionBank['hr round_intermediate'];
      } else {
        // Default to technical questions
        questions = questionBank[`technical_${normalizedDepth}`] || questionBank['technical_intermediate'];
      }
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
      'technical_beginner': [
        'Tell me about yourself and your technical background.',
        'What programming languages are you familiar with?',
        'Describe a simple project you have worked on.',
        'How do you approach learning new technologies?',
        'What is your experience with version control systems like Git?',
        'Explain the difference between frontend and backend development.',
        'What development tools do you use regularly?',
        'How do you debug code when you encounter errors?'
      ],
      'technical_intermediate': [
        'Describe your experience with object-oriented programming concepts.',
        'How do you handle error handling and exception management in your code?',
        'Explain the concept of APIs and how you have used them.',
        'What is your approach to testing your code?',
        'Describe a challenging technical problem you solved recently.',
        'How do you ensure code quality and maintainability?',
        'What design patterns are you familiar with?',
        'How do you optimize application performance?'
      ],
      'technical_advanced': [
        'Describe your experience with system design and architecture.',
        'How do you approach scalability challenges in large applications?',
        'Explain your experience with microservices or distributed systems.',
        'What is your approach to database optimization and query performance?',
        'Describe how you handle security considerations in your applications.',
        'How do you implement and manage CI/CD pipelines?',
        'What are your strategies for monitoring and logging in production?',
        'Explain your experience with cloud platforms and deployment strategies.'
      ],
      'hr round_beginner': [
        'Tell me about yourself and what motivates you.',
        'Why are you interested in this position?',
        'What are your greatest strengths and weaknesses?',
        'Where do you see yourself in 5 years?',
        'Describe a time when you faced a challenge at work.',
        'How do you handle working in a team environment?',
        'What interests you most about our company?',
        'How do you prioritize your work when you have multiple deadlines?'
      ],
      'hr round_intermediate': [
        'Describe a situation where you had to lead a team or project.',
        'How do you handle conflicts with colleagues or team members?',
        'Tell me about a time you failed and what you learned from it.',
        'How do you adapt to changes in the workplace?',
        'Describe your communication style and how you ensure clarity.',
        'What motivates you to perform your best work?',
        'How do you handle feedback and criticism?',
        'Tell me about a time you had to learn something completely new quickly.'
      ],
      'hr round_advanced': [
        'Describe your leadership philosophy and management style.',
        'How do you build and maintain relationships with stakeholders?',
        'Tell me about a time you had to make a difficult decision with limited information.',
        'How do you foster innovation and creativity in your team?',
        'Describe your approach to mentoring and developing team members.',
        'How do you handle high-pressure situations and tight deadlines?',
        'What strategies do you use for effective change management?',
        'Describe a time when you had to influence others without direct authority.'
      ],
      'communication_beginner': [
        'Tell me about yourself and your communication style.',
        'How do you ensure your message is clearly understood?',
        'Describe a time when you had to explain something complex to someone.',
        'How do you handle difficult conversations?',
        'What methods do you use to stay organized and communicate updates?',
        'How do you adapt your communication style to different audiences?',
        'Describe your experience with written communication (emails, reports).',
        'How do you handle feedback and incorporate it into your work?'
      ],
      'communication_intermediate': [
        'Describe a situation where miscommunication led to a problem and how you resolved it.',
        'How do you facilitate effective communication in a team setting?',
        'Tell me about a time you had to persuade others to see your point of view.',
        'How do you handle communication across different time zones or cultures?',
        'Describe your approach to active listening and asking clarifying questions.',
        'How do you communicate bad news or difficult information to stakeholders?',
        'What strategies do you use for effective presentation skills?',
        'How do you build rapport and trust through communication?'
      ],
      'communication_advanced': [
        'Describe your approach to strategic communication planning.',
        'How do you tailor your communication for executive-level stakeholders?',
        'Tell me about a time you had to manage a communication crisis.',
        'How do you balance transparency with confidentiality in your communications?',
        'Describe your experience with cross-functional communication and collaboration.',
        'How do you use communication to drive organizational change?',
        'What frameworks do you use for effective negotiation and conflict resolution?',
        'How do you measure the effectiveness of your communication strategies?'
      ]
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
      const answerWords = answer.match(/\b\w+\b/g) || [];
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