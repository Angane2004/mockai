/**
 * Node.js Backend Example for Ollama Integration
 * This can be used as a separate backend service or integrated into your existing server
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Ollama configuration
const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'llama3';

// Helper function to call Ollama API
async function callOllamaAPI(prompt) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama API error:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (response.ok) {
      res.json({ status: 'healthy', ollama: 'connected' });
    } else {
      res.status(503).json({ status: 'unhealthy', ollama: 'disconnected' });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      ollama: 'disconnected',
      error: error.message 
    });
  }
});

// Generate interview questions endpoint
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { objective, interviewType, depthLevel, numQuestions = 5, resumeText } = req.body;

    if (!objective || !interviewType || !depthLevel) {
      return res.status(400).json({ 
        error: 'Missing required fields: objective, interviewType, depthLevel' 
      });
    }

    const prompt = `You are an AI interview assistant. 
Based on the candidate's objective "${objective}", interview type "${interviewType}", and depth level "${depthLevel}"${resumeText ? `, and their resume content: "${resumeText}"` : ''}, 
generate ${numQuestions} highly relevant interview questions. 

Requirements:
- Questions should be appropriate for ${depthLevel} level
- Focus on ${interviewType} interview type
- Make questions relevant to the objective: ${objective}
${resumeText ? '- Consider the candidate\'s background from their resume' : ''}

Return ONLY a numbered list of questions, no additional text or explanations.

Example format:
1. Question one here
2. Question two here
3. Question three here`;

    const response = await callOllamaAPI(prompt);
    
    // Parse the response to extract questions
    const questions = response
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 0)
      .slice(0, numQuestions);

    res.json({ 
      success: true, 
      questions,
      generatedAt: new Date().toISOString(),
      model: MODEL_NAME
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate questions',
      details: error.message 
    });
  }
});

// Generate feedback endpoint
app.post('/api/generate-feedback', async (req, res) => {
  try {
    const { question, userAnswer, interviewType, depthLevel } = req.body;

    if (!question || !userAnswer || !interviewType || !depthLevel) {
      return res.status(400).json({ 
        error: 'Missing required fields: question, userAnswer, interviewType, depthLevel' 
      });
    }

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

    const response = await callOllamaAPI(prompt);
    
    // Clean and parse JSON response
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
    cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
    
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanResponse = jsonMatch[0];
    }

    try {
      const parsedResponse = JSON.parse(cleanResponse);
      
      // Validate required fields
      if (typeof parsedResponse.rating !== 'number' || 
          typeof parsedResponse.feedback !== 'string' || 
          typeof parsedResponse.correct_ans !== 'string') {
        throw new Error('Invalid response format');
      }

      // Ensure rating is within valid range
      parsedResponse.rating = Math.max(1, Math.min(10, parsedResponse.rating));
      
      res.json({
        success: true,
        ...parsedResponse,
        generatedAt: new Date().toISOString(),
        model: MODEL_NAME
      });
    } catch (parseError) {
      // Fallback response if JSON parsing fails
      res.json({
        success: true,
        rating: 5,
        feedback: "Unable to parse detailed feedback. Please ensure your answer addresses the core aspects of the question.",
        correct_ans: "A comprehensive answer should directly address the question with relevant examples and explanations.",
        generatedAt: new Date().toISOString(),
        model: MODEL_NAME,
        note: "Fallback response due to parsing error"
      });
    }
  } catch (error) {
    console.error('Error generating feedback:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate feedback',
      details: error.message 
    });
  }
});

// Test prompt endpoint
app.post('/api/test-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await callOllamaAPI(prompt);
    
    res.json({ 
      success: true, 
      response,
      generatedAt: new Date().toISOString(),
      model: MODEL_NAME
    });
  } catch (error) {
    console.error('Error processing prompt:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process prompt',
      details: error.message 
    });
  }
});

// Get available models
app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    const data = await response.json();
    const models = data.models?.map(model => model.name) || [];
    
    res.json({ 
      success: true, 
      models,
      currentModel: MODEL_NAME 
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch models',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Ollama Backend Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Make sure Ollama is running on ${OLLAMA_BASE_URL}`);
});

module.exports = app;