import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, Brain } from 'lucide-react';
import { toast } from 'sonner';

export interface MCQQuestion {
    id: string;
    question: string;
    options: {
        A: string;
        B: string;
        C: string;
        D: string;
    };
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    difficulty: 'Easy' | 'Medium' | 'Hard';
    category: 'Mathematics' | 'Logical Reasoning' | 'Analytical' | 'Quantitative Aptitude' | 'Verbal Reasoning';
    marks: number;
}

interface AptitudeQuestionSectionProps {
    questions: MCQQuestion[];
    currentQuestionIndex: number;
    userAnswers: Record<string, string>;
    onAnswerChange: (questionId: string, answer: string) => void;
    onNavigate: (index: number) => void;
    onSubmit: () => void;
    timeRemaining: number;
}

export const AptitudeQuestionSection: React.FC<AptitudeQuestionSectionProps> = ({
    questions,
    currentQuestionIndex,
    userAnswers,
    onAnswerChange,
    onNavigate,
    onSubmit,
    timeRemaining
}) => {
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const answeredCount = Object.keys(userAnswers).length;

    // Format time remaining
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            onNavigate(currentQuestionIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            onNavigate(currentQuestionIndex - 1);
        }
    };

    const handleSubmitClick = () => {
        if (answeredCount < questions.length) {
            toast.warning('Incomplete Test', {
                description: `You have answered ${answeredCount} out of ${questions.length} questions. Continue anyway?`
            });
        }
        setShowSubmitConfirm(true);
    };

    const confirmSubmit = () => {
        setShowSubmitConfirm(false);
        onSubmit();
    };

    // Warning if time is running low
    useEffect(() => {
        if (timeRemaining === 60) {
            toast.warning('One Minute Remaining!', {
                description: 'Please review and submit your answers soon.',
                duration: 5000
            });
        }
    }, [timeRemaining]);

    if (!currentQuestion) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Header with Timer and Progress */}
            <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-purple-100 p-3 rounded-full">
                                <Brain className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-purple-900">Aptitude Test</h3>
                                <p className="text-sm text-purple-700">
                                    Question {currentQuestionIndex + 1} of {questions.length} • {answeredCount} Answered
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                            <Clock className={`h-5 w-5 ${timeRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-purple-600'}`} />
                            <span className={`font-mono font-bold text-lg ${timeRemaining < 60 ? 'text-red-600' : 'text-purple-900'}`}>
                                {formatTime(timeRemaining)}
                            </span>
                        </div>
                    </div>
                    <Progress value={progress} className="mt-4 h-2" />
                </CardContent>
            </Card>

            {/* Question Card */}
            <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                                    {currentQuestion.category}
                                </span>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                        currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                    }`}>
                                    {currentQuestion.difficulty}
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                    {currentQuestion.marks} Marks
                                </span>
                            </div>
                            <CardTitle className="text-xl text-gray-900 leading-relaxed">
                                {currentQuestion.question}
                            </CardTitle>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <RadioGroup
                        value={userAnswers[currentQuestion.id] || ''}
                        onValueChange={(value) => onAnswerChange(currentQuestion.id, value)}
                        className="space-y-4"
                    >
                        {Object.entries(currentQuestion.options).map(([key, value]) => (
                            <div
                                key={key}
                                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-purple-50 hover:border-purple-300 ${userAnswers[currentQuestion.id] === key
                                        ? 'bg-purple-100 border-purple-500 shadow-md'
                                        : 'border-gray-200 bg-white'
                                    }`}
                            >
                                <RadioGroupItem value={key} id={`option-${key}`} className="text-purple-600" />
                                <Label htmlFor={`option-${key}`} className="flex-1 cursor-pointer text-base">
                                    <span className="font-semibold text-purple-600 mr-2">{key}.</span>
                                    {value}
                                </Label>
                                {userAnswers[currentQuestion.id] === key && (
                                    <CheckCircle className="h-5 w-5 text-purple-600" />
                                )}
                            </div>
                        ))}
                    </RadioGroup>
                </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4">
                <Button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    variant="outline"
                    size="lg"
                    className="flex items-center gap-2 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-50"
                >
                    <ChevronLeft className="h-5 w-5" />
                    Previous
                </Button>

                <div className="flex items-center gap-2">
                    {/* Question number buttons */}
                    <div className="hidden md:flex gap-1">
                        {questions.slice(0, 10).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => onNavigate(idx)}
                                className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${idx === currentQuestionIndex
                                        ? 'bg-purple-600 text-white shadow-lg scale-110'
                                        : userAnswers[questions[idx].id]
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                        {questions.length > 10 && (
                            <span className="flex items-center px-2 text-gray-500">...</span>
                        )}
                    </div>
                </div>

                {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                        onClick={handleSubmitClick}
                        size="lg"
                        className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                    >
                        <CheckCircle className="h-5 w-5" />
                        Submit Test
                    </Button>
                ) : (
                    <Button
                        onClick={handleNext}
                        variant="default"
                        size="lg"
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                        Next
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Submit Confirmation Dialog */}
            {showSubmitConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <Card className="max-w-md mx-4 animate-scale-in">
                        <CardHeader>
                            <CardTitle className="text-center">Submit Aptitude Test?</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-center text-gray-700">
                                You have answered <span className="font-bold text-purple-600">{answeredCount}</span> out of{' '}
                                <span className="font-bold">{questions.length}</span> questions.
                            </p>
                            {answeredCount < questions.length && (
                                <p className="text-center text-orange-600 text-sm">
                                    Unanswered questions will be marked as incorrect.
                                </p>
                            )}
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => setShowSubmitConfirm(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmSubmit}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                >
                                    Confirm Submit
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
