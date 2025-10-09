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

  /**
   * Send a prompt to Ollama and get response
   */
  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
        }),
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
   * Generate interview questions based on resume and interview details
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
    const prompt = `You are an AI interview assistant. 
Based on the candidate's objective "${interviewData.objective}", interview type "${interviewData.interviewType}", and depth level "${interviewData.depthLevel}"${interviewData.resumeText ? `, and their resume content: "${interviewData.resumeText}"` : ''}, 
generate ${interviewData.numQuestions || 5} highly relevant interview questions. 

Requirements:
- Questions should be appropriate for ${interviewData.depthLevel} level
- Focus on ${interviewData.interviewType} interview type
- Make questions relevant to the objective: ${interviewData.objective}
${interviewData.resumeText ? '- Consider the candidate\'s background from their resume' : ''}

Return ONLY a numbered list of questions, no additional text or explanations.

Example format:
1. Question one here
2. Question two here
3. Question three here`;

    try {
      const response = await this.generateResponse(prompt);
      
      // Parse the response to extract questions
      return response
        .split('\n')
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((q: string) => q.length > 0)
        .slice(0, interviewData.numQuestions);
    } catch (error) {
      console.error('Error generating questions:', error);
      return [];
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

      const parsedResponse = JSON.parse(cleanResponse) as AIResponse;
      
      // Validate required fields
      if (typeof parsedResponse.rating !== 'number' || 
          typeof parsedResponse.feedback !== 'string' || 
          typeof parsedResponse.correct_ans !== 'string') {
        throw new Error('Invalid response format from Ollama');
      }

      // Ensure rating is within valid range
      parsedResponse.rating = Math.max(1, Math.min(10, parsedResponse.rating));
      
      return {
        ratings: parsedResponse.rating, // Note: using 'ratings' to match existing interface
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