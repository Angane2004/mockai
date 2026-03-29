import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Play,
    Send,
    Clock,
    CheckCircle,
    XCircle,
    Code2,
    ChevronRight,
    ChevronLeft,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { codeExecutionService, LANGUAGE_IDS, type ExecutionResult } from '@/services/code-execution.service';
import { SecurityMonitor, getSecurityViolations } from '@/components/security-monitor';
import { CodingQuestion } from '@/scripts/coding-questions';

interface CodingInterviewPageProps {
    questions: CodingQuestion[];
    interviewId: string;
    onSubmit: (results: any[]) => void;
    duration: number; // in minutes
}

export const CodingInterviewPage: React.FC<CodingInterviewPageProps> = ({
    questions,
    interviewId,
    onSubmit,
    duration
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
    const [code, setCode] = useState<string>('');
    const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResults, setTestResults] = useState<ExecutionResult | null>(null);
    const [questionResults, setQuestionResults] = useState<Map<number, any>>(new Map());
    const [timeRemaining, setTimeRemaining] = useState(duration * 60); // Convert to seconds
    const editorRef = useRef<any>(null);

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    // Initialize code with starter template when question or language changes
    useEffect(() => {
        if (currentQuestion && selectedLanguage) {
            const starterCode = currentQuestion.starterCode[selectedLanguage] || '';
            setCode(starterCode);
            setTestResults(null);
        }
    }, [currentQuestionIndex, selectedLanguage, currentQuestion]);

    // Timer countdown
    useEffect(() => {
        if (timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
    };

    const handleRunTests = async () => {
        if (!code.trim()) {
            toast.error('No code to run!');
            return;
        }

        setIsRunning(true);
        setTestResults(null);

        try {
            toast.info('Running tests...', {
                description: `Executing ${currentQuestion.testCases?.length || 0} test cases`
            });

            const result = await codeExecutionService.runTests(
                code,
                selectedLanguage,
                currentQuestion.testCases
            );

            setTestResults(result);

            if (result.allPassed) {
                toast.success('All tests passed! ✅', {
                    description: `${result.passedTests}/${result.totalTests} test cases passed`
                });
            } else {
                toast.warning('Some tests failed', {
                    description: `${result.passedTests}/${result.totalTests} test cases passed`
                });
            }
        } catch (error) {
            console.error('Test execution error:', error);
            toast.error('Execution failed', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmitCode = () => {
        if (!code.trim()) {
            toast.error('Cannot submit empty code!');
            return;
        }

        // Save current question result
        const result = {
            questionId: currentQuestion.id,
            code,
            language: selectedLanguage,
            testResults: testResults || null,
            timestamp: new Date().toISOString()
        };

        const newResults = new Map(questionResults);
        newResults.set(currentQuestionIndex, result);
        setQuestionResults(newResults);

        toast.success('Code submitted!', {
            description: testResults
                ? `Tests: ${testResults.passedTests}/${testResults.totalTests} passed`
                : 'Run tests to validate your solution'
        });

        // Move to next question if available
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleAutoSubmit = () => {
        toast.error('Time is up!', {
            description: 'Auto-submitting your interview...'
        });

        setTimeout(() => {
            handleFinalSubmit();
        }, 2000);
    };

    const handleFinalSubmit = () => {
        setIsSubmitting(true);

        // Get security violations
        const violations = getSecurityViolations(interviewId);

        // Prepare final results
        const finalResults = Array.from(questionResults.values());

        // Include security info
        const submissionData = {
            results: finalResults,
            securityViolations: violations,
            completedAt: new Date().toISOString()
        };

        console.log('📤 Submitting interview:', submissionData);

        // Call parent onSubmit callback
        onSubmit(finalResults);
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'Medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'Hard':
                return 'bg-red-100 text-red-800 border-red-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <>
            {/* Security Monitor */}
            <SecurityMonitor enabled={true} interviewId={interviewId} />

            <div className="flex flex-col h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Code2 className="h-6 w-6 text-blue-600" />
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">
                                Technical Coding Interview
                            </h1>
                            <p className="text-sm text-gray-500">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Timer */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            <Clock className="h-5 w-5" />
                            <span className="font-mono font-semibold text-lg">
                                {formatTime(timeRemaining)}
                            </span>
                        </div>

                        {/* Progress */}
                        <div className="hidden sm:block">
                            <Progress value={progress} className="w-32" />
                        </div>

                        {/* Final Submit */}
                        <Button
                            onClick={handleFinalSubmit}
                            disabled={isSubmitting || questionResults.size === 0}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Submit Interview
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Problem Description Panel */}
                    <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
                        <div className="p-6 space-y-6">
                            {/* Title and Difficulty */}
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {currentQuestion.title}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                                        {currentQuestion.difficulty}
                                    </Badge>
                                    {(currentQuestion.tags || []).map(tag => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Description */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {currentQuestion.description}
                                </p>
                            </div>

                            {/* Constraints */}
                            {currentQuestion.constraints && currentQuestion.constraints.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Constraints</h3>
                                    <ul className="list-disc list-inside space-y-1">
                                        {currentQuestion.constraints.map((constraint, idx) => (
                                            <li key={idx} className="text-sm text-gray-700">
                                                {constraint}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Test Cases */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Test Cases</h3>
                                <div className="space-y-3">
                                    {(currentQuestion.testCases || []).map((testCase, idx) => (
                                        <Card key={idx} className="bg-gray-50">
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-medium text-gray-600">
                                                        {testCase.isHidden ? '🔒 Hidden Test' : `Test Case ${idx + 1}`}
                                                    </span>
                                                    {!testCase.isHidden && testResults && (
                                                        testResults.testResults[idx]?.passed ? (
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-red-600" />
                                                        )
                                                    )}
                                                </div>
                                                {!testCase.isHidden && (
                                                    <>
                                                        <div className="text-xs space-y-1">
                                                            <div>
                                                                <span className="font-medium text-gray-700">Input: </span>
                                                                <code className="bg-white px-2 py-1 rounded text-gray-900">
                                                                    {JSON.stringify(testCase.input)}
                                                                </code>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-700">Expected: </span>
                                                                <code className="bg-white px-2 py-1 rounded text-gray-900">
                                                                    {JSON.stringify(testCase.expectedOutput)}
                                                                </code>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Code Editor Panel */}
                    <div className="flex-1 flex flex-col bg-gray-900">
                        {/* Editor Controls */}
                        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                            <div className="flex items-center gap-3">
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                    <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(LANGUAGE_IDS).map(lang => (
                                            <SelectItem key={lang} value={lang}>
                                                {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
                                    <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vs-dark">Dark</SelectItem>
                                        <SelectItem value="light">Light</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleRunTests}
                                    disabled={isRunning}
                                    variant="outline"
                                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-700"
                                >
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Running...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4 mr-2" />
                                            Run Tests
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={handleSubmitCode}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Submit Code
                                </Button>
                            </div>
                        </div>

                        {/* Monaco Editor */}
                        <div className="flex-1">
                            <Editor
                                height="100%"
                                language={selectedLanguage}
                                value={code}
                                onChange={(value) => setCode(value || '')}
                                theme={theme}
                                onMount={handleEditorDidMount}
                                options={{
                                    fontSize: 14,
                                    minimap: { enabled: true },
                                    scrollBeyondLastLine: false,
                                    wordWrap: 'on',
                                    automaticLayout: true,
                                }}
                            />
                        </div>

                        {/* Test Results */}
                        {testResults && (
                            <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-semibold">Test Results</h3>
                                    <Badge className={testResults.allPassed ? 'bg-green-600' : 'bg-red-600'}>
                                        {testResults.passedTests}/{testResults.totalTests} Passed
                                    </Badge>
                                </div>
                                <div className="text-xs text-gray-400 space-x-4">
                                    <span>Time: {testResults.totalTime.toFixed(2)}ms</span>
                                    <span>Memory: {testResults.averageMemory.toFixed(0)}KB</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
                    <Button
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        variant="outline"
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>

                    <div className="text-sm text-gray-600">
                        {questionResults.size} of {questions.length} questions attempted
                    </div>

                    <Button
                        onClick={handleNext}
                        disabled={currentQuestionIndex === questions.length - 1}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </>
    );
};
