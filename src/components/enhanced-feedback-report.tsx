import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Star, 
  Award, 
  Target, 
  Brain, 
  Clock, 
  CheckCircle2,
  ThumbsUp,
  Download,
  Share,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

interface FeedbackData {
  overallRating: number;
  overallFeedback: string;
  questionFeedbacks: Array<{
    question: string;
    userAnswer: string;
    rating: number;
    feedback: string;
    idealAnswer: string;
  }>;
  analysisData?: {
    confidenceLevel: number;
    clarityScore: number;
    technicalAccuracy: number;
    communicationSkills: number;
  };
}

interface EnhancedFeedbackReportProps {
  feedbackData: FeedbackData;
  interviewType: string;
  interviewDuration: number;
  onDownload?: () => void;
  onShare?: () => void;
}

export const EnhancedFeedbackReport: React.FC<EnhancedFeedbackReportProps> = ({
  feedbackData,
  interviewType,
  interviewDuration,
  onDownload,
  onShare
}) => {
  const [animatedRating, setAnimatedRating] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Animate overall rating
    const timer = setTimeout(() => {
      setAnimatedRating(feedbackData.overallRating);
    }, 500);

    // Show confetti for high scores
    if (feedbackData.overallRating >= 8) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    return () => clearTimeout(timer);
  }, [feedbackData.overallRating]);

  const getRatingEmoji = (rating: number) => {
    if (rating >= 9) return '🏆';
    if (rating >= 8) return '🌟';
    if (rating >= 7) return '😊';
    if (rating >= 6) return '👍';
    if (rating >= 5) return '😐';
    if (rating >= 4) return '😕';
    return '😢';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBgColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-100 border-green-200';
    if (rating >= 6) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  const averageRating = feedbackData.questionFeedbacks.reduce((acc, q) => acc + q.rating, 0) / feedbackData.questionFeedbacks.length;

  const performanceInsights = [
    {
      title: 'Confidence Level',
      score: feedbackData.analysisData?.confidenceLevel || Math.min(averageRating * 10, 100),
      icon: <Target className="h-5 w-5" />,
      color: 'blue'
    },
    {
      title: 'Clarity Score',
      score: feedbackData.analysisData?.clarityScore || Math.min((averageRating + 1) * 10, 100),
      icon: <Brain className="h-5 w-5" />,
      color: 'purple'
    },
    {
      title: 'Technical Accuracy',
      score: feedbackData.analysisData?.technicalAccuracy || Math.min(averageRating * 12, 100),
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'green'
    },
    {
      title: 'Communication',
      score: feedbackData.analysisData?.communicationSkills || Math.min((averageRating + 0.5) * 10, 100),
      icon: <Activity className="h-5 w-5" />,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-red-400 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: -10,
                rotate: 0,
              }}
              animate={{
                y: window.innerHeight + 10,
                rotate: 360,
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className={`text-6xl animate-bounce`}>
            {getRatingEmoji(feedbackData.overallRating)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Interview Complete!</h1>
            <p className="text-lg text-gray-600">Here's your detailed performance report</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3">
          <Button onClick={onDownload} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
          <Button onClick={onShare} variant="outline">
            <Share className="h-4 w-4 mr-2" />
            Share Results
          </Button>
        </div>
      </motion.div>

      {/* Overall Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className={`text-center ${getRatingBgColor(feedbackData.overallRating)} border-2`}>
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-4">
              <div className="text-8xl font-bold">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={getRatingColor(feedbackData.overallRating)}
                >
                  {animatedRating.toFixed(1)}
                </motion.span>
                <span className="text-4xl text-gray-400">/10</span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-6 w-6 text-yellow-500 fill-current" />
                  <span className="text-xl font-semibold">Overall Rating</span>
                </div>
                <p className="text-gray-700 max-w-md">{feedbackData.overallFeedback}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Insights
            </CardTitle>
            <CardDescription>
              Detailed analysis of your interview performance across key areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {performanceInsights.map((insight, index) => (
                <motion.div
                  key={insight.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-${insight.color}-100`}>
                        {insight.icon}
                      </div>
                      <span className="font-semibold">{insight.title}</span>
                    </div>
                    <span className={`text-lg font-bold text-${insight.color}-600`}>
                      {insight.score.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={insight.score} 
                    className={`h-2 bg-${insight.color}-100`}
                  />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Interview Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{interviewDuration}</div>
              <div className="text-sm text-gray-500">Minutes Duration</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{feedbackData.questionFeedbacks.length}</div>
              <div className="text-sm text-gray-500">Questions Answered</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex items-center justify-center mb-2">
                <Award className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">{interviewType}</div>
              <div className="text-sm text-gray-500">Interview Type</div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Detailed Question Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Question-by-Question Analysis
            </CardTitle>
            <CardDescription>
              Detailed feedback for each interview question
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="0" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 gap-1">
                {feedbackData.questionFeedbacks.map((_, index) => (
                  <TabsTrigger 
                    key={index} 
                    value={index.toString()} 
                    className="text-xs"
                  >
                    Q{index + 1}
                  </TabsTrigger>
                ))}
              </TabsList>

              {feedbackData.questionFeedbacks.map((question, index) => (
                <TabsContent key={index} value={index.toString()} className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-2">
                          Question {index + 1}
                        </h3>
                        <p className="text-gray-700">{question.question}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-2xl">{getRatingEmoji(question.rating)}</span>
                        <div className={`text-xl font-bold ${getRatingColor(question.rating)}`}>
                          {question.rating}/10
                        </div>
                      </div>
                    </div>

                    {/* Answer Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ThumbsUp className="h-4 w-4 text-yellow-600" />
                            Your Answer
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-gray-700">{question.userAnswer}</p>
                        </CardContent>
                      </Card>

                      <Card className="border-green-200 bg-green-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Ideal Answer
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-gray-700">{question.idealAnswer}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Feedback */}
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          AI Feedback & Suggestions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-700">{question.feedback}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Motivational Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      >
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold mb-2">Keep Practicing!</h3>
            <p className="text-blue-100 mb-4">
              Every interview is a learning opportunity. Use this feedback to improve and ace your next interview!
            </p>
            <div className="flex justify-center gap-2 text-sm">
              <span>💪 Stay confident</span>
              <span>•</span>
              <span>📚 Keep learning</span>
              <span>•</span>
              <span>🎯 Practice more</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};