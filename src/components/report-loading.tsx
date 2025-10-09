import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, FileText, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReportLoadingProps {
  progress: number;
  currentStep: string;
  estimatedTime?: number;
}

export const ReportLoading: React.FC<ReportLoadingProps> = ({ 
  progress, 
  currentStep, 
  estimatedTime = 30 
}) => {
  const steps = [
    {
      id: 'analyzing',
      title: 'Analyzing Answers',
      description: 'AI is reviewing your responses',
      icon: <Brain className="h-6 w-6" />,
      color: 'blue'
    },
    {
      id: 'evaluating',
      title: 'Evaluating Performance',
      description: 'Calculating ratings and feedback',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'green'
    },
    {
      id: 'generating',
      title: 'Generating Report',
      description: 'Creating detailed recommendations',
      icon: <FileText className="h-6 w-6" />,
      color: 'purple'
    },
    {
      id: 'finalizing',
      title: 'Finalizing Results',
      description: 'Preparing your feedback report',
      icon: <Award className="h-6 w-6" />,
      color: 'orange'
    }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep) !== -1 
    ? steps.findIndex(step => step.id === currentStep) 
    : Math.floor((progress / 100) * steps.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Main Loading Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
              }}
              className="bg-gradient-to-r from-purple-500 to-blue-600 p-4 rounded-full"
            >
              <Brain className="h-12 w-12 text-white" />
            </motion.div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Generating Your Report
          </h1>
          <p className="text-lg text-gray-600">AI is analyzing your interview performance...</p>
          
          {/* Progress Bar */}
          <div className="w-full max-w-md mx-auto space-y-2">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{progress.toFixed(0)}% Complete</span>
              <span>Est: ~{estimatedTime}s</span>
            </div>
          </div>
        </motion.div>

        {/* Processing Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-800 mb-6 text-center">
                AI Processing Pipeline
              </h3>
              
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0.3, scale: 0.95 }}
                    animate={{ 
                      opacity: index <= currentStepIndex ? 1 : 0.4,
                      scale: index === currentStepIndex ? 1 : 0.95,
                      x: index === currentStepIndex ? 5 : 0
                    }}
                    transition={{ duration: 0.5 }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      index === currentStepIndex 
                        ? 'bg-white shadow-md border-l-4 border-l-purple-500' 
                        : 'bg-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      index === currentStepIndex ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <div className={`text-${step.color}-600`}>
                        {step.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        index === currentStepIndex ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm ${
                        index === currentStepIndex ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                    {index === currentStepIndex && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"
                      />
                    )}
                    {index < currentStepIndex && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fun Loading Messages */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-center space-x-4 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Processing responses
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  Calculating scores
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  Preparing feedback
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Floating particles animation */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-30"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 20,
              }}
              animate={{
                y: -20,
                x: Math.random() * window.innerWidth,
              }}
              transition={{
                duration: Math.random() * 10 + 15,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};