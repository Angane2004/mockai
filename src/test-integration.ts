/**
 * Integration test for Ollama service
 * This can be imported and used in your frontend components
 */

import { ollamaService } from './scripts/ollama';

export async function testOllamaIntegration() {
  console.log('🧪 Starting Ollama Frontend Integration Test...');

  // Test 1: Health check
  try {
    console.log('🔍 Testing Ollama health check...');
    const isHealthy = await ollamaService.checkHealth();
    if (isHealthy) {
      console.log('✅ Ollama health check: PASSED');
    } else {
      console.log('❌ Ollama health check: FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error);
    return false;
  }

  // Test 2: Question generation
  try {
    console.log('🎯 Testing question generation...');
    const questions = await ollamaService.generateInterviewQuestions({
      objective: 'Software Developer',
      interviewType: 'Technical',
      depthLevel: 'Intermediate',
      numQuestions: 3,
      resumeText: 'Experienced JavaScript developer with React expertise'
    });

    if (questions.length > 0) {
      console.log('✅ Question generation: PASSED');
      console.log('📋 Generated questions:', questions);
    } else {
      console.log('❌ Question generation: FAILED - No questions generated');
      return false;
    }
  } catch (error) {
    console.log('❌ Question generation error:', error);
    return false;
  }

  // Test 3: Feedback generation
  try {
    console.log('💬 Testing feedback generation...');
    const feedback = await ollamaService.generateFeedback(
      'What is the difference between let and var in JavaScript?',
      'Let has block scope while var has function scope. Let does not allow redeclaration.',
      'Technical',
      'Intermediate'
    );

    if (feedback.ratings > 0 && feedback.feedback && feedback.correct_ans) {
      console.log('✅ Feedback generation: PASSED');
      console.log('📊 Rating:', feedback.ratings);
      console.log('💡 Feedback:', feedback.feedback.substring(0, 100) + '...');
      console.log('✨ Correct Answer:', feedback.correct_ans.substring(0, 100) + '...');
    } else {
      console.log('❌ Feedback generation: FAILED - Invalid response');
      return false;
    }
  } catch (error) {
    console.log('❌ Feedback generation error:', error);
    return false;
  }

  console.log('🎉 All integration tests PASSED! Ollama is ready to use.');
  return true;
}

// Test can be called from browser console or component
if (typeof window !== 'undefined') {
  (window as any).testOllamaIntegration = testOllamaIntegration;
}