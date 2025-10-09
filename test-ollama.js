/**
 * Test script to verify Ollama integration
 * Run with: node test-ollama.js
 */

// Using Node.js built-in fetch (available in Node 18+)
// If you're using Node < 18, install node-fetch: npm install node-fetch

const OLLAMA_BASE_URL = 'http://localhost:11434';

async function testOllamaConnection() {
  console.log('🔍 Testing Ollama connection...');
  
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama is connected!');
      console.log('📋 Available models:', data.models?.map(m => m.name) || []);
      return true;
    } else {
      console.log('❌ Ollama connection failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Error connecting to Ollama:', error.message);
    return false;
  }
}

async function testQuestionGeneration() {
  console.log('\n🎯 Testing question generation...');
  
  const prompt = `You are an AI interview assistant. 
Based on the candidate's objective "Software Developer", interview type "Technical", and depth level "Intermediate", 
generate 3 highly relevant interview questions. 

Requirements:
- Questions should be appropriate for Intermediate level
- Focus on Technical interview type
- Make questions relevant to the objective: Software Developer

Return ONLY a numbered list of questions, no additional text or explanations.

Example format:
1. Question one here
2. Question two here
3. Question three here`;

  try {
    console.log('⏳ Generating questions...');
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const questions = data.response
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 0)
      .slice(0, 3);

    console.log('✅ Questions generated successfully:');
    questions.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));
    return true;
  } catch (error) {
    console.log('❌ Question generation failed:', error.message);
    return false;
  }
}

async function testFeedbackGeneration() {
  console.log('\n💬 Testing feedback generation...');
  
  const prompt = `You are an expert interviewer.
Question: "What is the difference between let and var in JavaScript?"
User Answer: "Let has block scope while var has function scope. Let doesn't allow redeclaration while var does."
You are conducting a Technical interview at an Intermediate level.

Please evaluate the user's answer based on the context of the question and the provided interview type and depth.
Provide a rating from 1 to 10 for the user's answer.
Give constructive feedback on what the user did well and how they can improve.
Provide a concise and ideal "correct answer" that would be expected for this question.

IMPORTANT: Return ONLY a valid JSON object with three fields: "rating" (number), "feedback" (string), and "correct_ans" (string). No additional text or formatting.

Example format:
{"rating": 8, "feedback": "Good explanation but could include more details about...", "correct_ans": "A comprehensive answer should include..."}`;

  try {
    console.log('⏳ Generating feedback...');
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Try to parse JSON from response
    let cleanResponse = data.response.trim();
    cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
    cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
    
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanResponse = jsonMatch[0];
    }

    try {
      const feedback = JSON.parse(cleanResponse);
      console.log('✅ Feedback generated successfully:');
      console.log(`   📊 Rating: ${feedback.rating}/10`);
      console.log(`   💡 Feedback: ${feedback.feedback}`);
      console.log(`   ✨ Correct Answer: ${feedback.correct_ans}`);
      return true;
    } catch (parseError) {
      console.log('⚠️  Generated response but failed to parse JSON:');
      console.log('   Raw response:', data.response.substring(0, 200) + '...');
      return false;
    }
  } catch (error) {
    console.log('❌ Feedback generation failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting Ollama Integration Tests\n');
  
  const connectionTest = await testOllamaConnection();
  if (!connectionTest) {
    console.log('\n❌ Cannot proceed with tests. Please ensure:');
    console.log('   1. Ollama is installed and running');
    console.log('   2. Llama3 model is available (run: ollama list)');
    console.log('   3. Service is accessible at http://localhost:11434');
    return;
  }

  const questionTest = await testQuestionGeneration();
  const feedbackTest = await testFeedbackGeneration();

  console.log('\n📊 Test Summary:');
  console.log(`   Connection: ${connectionTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Questions:  ${questionTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Feedback:   ${feedbackTest ? '✅ PASS' : '❌ FAIL'}`);

  if (connectionTest && questionTest && feedbackTest) {
    console.log('\n🎉 All tests passed! Your Ollama integration is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your React components to use the new Ollama service');
    console.log('   2. Follow the migration guide in MIGRATION_GUIDE.md');
    console.log('   3. Test your application end-to-end');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above and:');
    console.log('   1. Ensure Ollama is running: ollama serve');
    console.log('   2. Check model availability: ollama list');
    console.log('   3. Test manually: ollama run llama3 "Hello"');
  }
}

// Run the tests
runAllTests().catch(console.error);