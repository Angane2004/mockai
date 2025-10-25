/**
 * Unified AI Service
 * Automatically uses Ollama when available (local dev), falls back to Gemini API (production)
 */

import { ollamaService } from './ollama';
import { chatSession } from './index';

interface AIResponse {
  ratings: number;
  feedback: string;
  correct_ans: string;
}

class AIService {
  private useOllama = false;
  private ollamaChecked = false;

  /**
   * Check if Ollama is available
   */
  async checkOllamaAvailability(): Promise<boolean> {
    if (this.ollamaChecked) {
      return this.useOllama;
    }

    try {
      const isHealthy = await ollamaService.checkHealth();
      this.useOllama = isHealthy;
      this.ollamaChecked = true;
      console.log(`AI Service: Using ${this.useOllama ? 'Ollama (local)' : 'Gemini API (cloud)'}`);
      return this.useOllama;
    } catch (error) {
      this.useOllama = false;
      this.ollamaChecked = true;
      console.log('AI Service: Ollama not available, using Gemini API');
      return false;
    }
  }

  /**
   * Generate interview questions
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
   * Generate questions using Gemini API
   */
  private async generateQuestionsWithGemini(
    interviewData: {
      objective: string;
      interviewType: string;
      depthLevel: string;
      numQuestions: number;
      resumeText?: string;
    }
  ): Promise<string[]> {
    const skillsContext = interviewData.resumeText 
      ? `\nCandidate's background: ${interviewData.resumeText.substring(0, 500)}` 
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

    try {
      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();
      
      // Parse questions
      const lines = response.split('\n');
      const questions: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^(?:\d+[\.)]\s*|[-•*]\s*)(.+)/);
        if (match && match[1].length > 15) {
          let question = match[1].trim();
          if (!question.endsWith('?')) {
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
   * Get default questions as fallback
   */
  private getDefaultQuestions(interviewType: string, depthLevel: string, count: number): string[] {
    const questionBank: Record<string, string[]> = {
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
      'hr_beginner': [
        'Tell me about yourself and what motivates you.',
        'Why are you interested in this position?',
        'What are your greatest strengths and weaknesses?',
        'Where do you see yourself in 5 years?',
        'Describe a time when you faced a challenge at work.',
      ],
      'hr_intermediate': [
        'Describe a situation where you had to lead a team or project.',
        'How do you handle conflicts with colleagues or team members?',
        'Tell me about a time you failed and what you learned from it.',
        'How do you adapt to changes in the workplace?',
        'Describe your communication style and how you ensure clarity.',
      ],
    };

    const normalizedType = interviewType.toLowerCase().replace(/\s+/g, '_');
    const normalizedDepth = depthLevel.toLowerCase();
    const key = `${normalizedType}_${normalizedDepth}`;
    
    const questions = questionBank[key] || questionBank['technical_intermediate'] || [];
    return questions.slice(0, count);
  }

  /**
   * Check if using Ollama
   */
  isUsingOllama(): boolean {
    return this.useOllama;
  }
}

export const aiService = new AIService();
