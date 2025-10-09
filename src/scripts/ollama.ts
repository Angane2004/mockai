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
   * Generate interview questions based on resume and interview details (Enhanced)
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
    let skills: string[] = [];
    
    // Extract specific skills if resume is provided
    if (interviewData.resumeText) {
      skills = await this.extractResumeSkills(interviewData.resumeText);
      console.log('Extracted skills from resume:', skills);
    }

    const skillsContext = skills.length > 0 ? 
      `\n\nSpecific technologies/skills from candidate's resume: ${skills.slice(0, 8).join(', ')}` : '';

    const prompt = `Generate ${interviewData.numQuestions} ${interviewData.interviewType} questions for ${interviewData.depthLevel} level.

Role: ${interviewData.objective}
Skills: ${skills.slice(0, 5).join(', ')}

Return ONLY numbered questions:
1.
2.
3.`;

    try {
      // Use fast mode for question generation
      const response = await this.generateResponse(prompt, true);
      
      // Parse the response to extract questions
      const questions = response
        .split('\n')
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((q: string) => q.length > 10) // Filter out very short responses
        .slice(0, interviewData.numQuestions);

      // Fallback questions if generation fails
      if (questions.length === 0) {
        return this.getFallbackQuestions(interviewData.interviewType, interviewData.depthLevel, skills);
      }

      return questions;
    } catch (error) {
      console.error('Error generating questions:', error);
      return this.getFallbackQuestions(interviewData.interviewType, interviewData.depthLevel, skills);
    }
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