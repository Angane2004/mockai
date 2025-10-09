import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Play } from 'lucide-react';
import { testOllamaIntegration } from '@/test-integration';
import { ollamaService } from '@/scripts/ollama';

export const OllamaTestPage = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<any>(null);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const healthy = await ollamaService.checkHealth();
      setIsHealthy(healthy);
    } catch (error) {
      setIsHealthy(false);
    } finally {
      setIsLoading(false);
    }
  };

  const runFullTest = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    // Redirect console.log to capture results
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      await testOllamaIntegration();
      setTestResults(logs);
    } catch (error) {
      logs.push(`❌ Test failed: ${error}`);
      setTestResults(logs);
    } finally {
      console.log = originalLog;
      setIsLoading(false);
    }
  };

  const generateSampleQuestions = async () => {
    setIsLoading(true);
    try {
      const generatedQuestions = await ollamaService.generateInterviewQuestions({
        objective: 'Frontend Developer',
        interviewType: 'Technical',
        depthLevel: 'Intermediate',
        numQuestions: 3,
        resumeText: 'React developer with 2+ years experience'
      });
      setQuestions(generatedQuestions);
    } catch (error) {
      console.error('Question generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleFeedback = async () => {
    setIsLoading(true);
    try {
      const feedbackResult = await ollamaService.generateFeedback(
        'Explain the difference between useEffect and useLayoutEffect in React.',
        'useEffect runs after DOM mutations and is non-blocking, while useLayoutEffect runs synchronously after all DOM mutations.',
        'Technical',
        'Intermediate'
      );
      setFeedback(feedbackResult);
    } catch (error) {
      console.error('Feedback generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🚀 Ollama Integration Test</h1>
        <p className="text-lg text-muted-foreground">
          Test your local AI-powered interview assistant
        </p>
      </div>

      {/* Health Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isHealthy === null ? (
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
            ) : isHealthy ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            Ollama Service Health
          </CardTitle>
          <CardDescription>
            Check if Ollama is running and accessible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={checkHealth} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check Health'}
            </Button>
            {isHealthy !== null && (
              <Badge variant={isHealthy ? 'default' : 'destructive'}>
                {isHealthy ? 'Healthy' : 'Unavailable'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Integration Test */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Full Integration Test</CardTitle>
          <CardDescription>
            Run all tests to verify complete Ollama integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={runFullTest} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>

            {testResults.length > 0 && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Test Results:</h4>
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {testResults.join('\n')}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question Generation Test */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Question Generation</CardTitle>
          <CardDescription>
            Test AI-powered interview question generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={generateSampleQuestions} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Questions'}
            </Button>

            {questions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Generated Questions:</h4>
                {questions.map((question, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-700">Q{index + 1}:</span>{' '}
                    {question}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Generation Test */}
      <Card>
        <CardHeader>
          <CardTitle>💬 Feedback Generation</CardTitle>
          <CardDescription>
            Test AI-powered answer analysis and feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={generateSampleFeedback} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Feedback'}
            </Button>

            {feedback && (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-green-700">Rating:</span>{' '}
                  {feedback.ratings}/10
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium text-yellow-700">Feedback:</span>{' '}
                  {feedback.feedback}
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-purple-700">Ideal Answer:</span>{' '}
                  {feedback.correct_ans}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p>Once all tests pass, your Ollama integration is ready! You can now:</p>
            <ol className="list-decimal list-inside space-y-2 mt-4">
              <li>Create a new interview in your application</li>
              <li>Questions will be generated using local Ollama AI</li>
              <li>Answer the questions using speech recognition</li>
              <li>Get AI-powered feedback analysis from Ollama</li>
              <li>View your complete feedback report</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};