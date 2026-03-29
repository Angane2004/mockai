import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Shield, Sparkles, Coffee, Clock, Cpu, Database, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveLoadingPageProps {
  loadingMessage: string;
  subtitle?: string;
  estimatedTime?: number; // in seconds
  hasResume?: boolean; // whether resume was uploaded
}

export const InteractiveLoadingPage = ({
  loadingMessage,
  subtitle = "Using local AI - no internet required!",
  estimatedTime = 30,
  hasResume = false
}: InteractiveLoadingPageProps) => {
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const processingSteps = hasResume ? [
    {
      icon: <Database className="h-6 w-6" />,
      title: "Loading Model",
      description: "Initializing Llama 3 AI model",
      color: "text-blue-500"
    },
    {
      icon: <Cpu className="h-6 w-6" />,
      title: "Processing Resume",
      description: "Analyzing skills and experience",
      color: "text-green-500"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Generating Questions",
      description: "Creating personalized interview questions",
      color: "text-purple-500"
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Final Preparation",
      description: "Setting up your interview environment",
      color: "text-orange-500"
    }
  ] : [
    {
      icon: <Database className="h-6 w-6" />,
      title: "Loading Model",
      description: "Initializing Llama 3 AI model",
      color: "text-blue-500"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Generating Questions",
      description: "Creating tailored interview questions",
      color: "text-purple-500"
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Final Preparation",
      description: "Setting up your interview environment",
      color: "text-orange-500"
    }
  ];

  const tips = [
    {
      icon: <Brain className="h-5 w-5 text-blue-500" />,
      title: "AI-Powered Analysis",
      description: "Llama 3 is analyzing your resume and generating personalized questions"
    },
    {
      icon: <Shield className="h-5 w-5 text-green-500" />,
      title: "Privacy First",
      description: "Everything runs locally on your machine - your data never leaves your device"
    },
    {
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      title: "Real-time Feedback",
      description: "Get instant, detailed feedback on your interview performance"
    },
    {
      icon: <Network className="h-5 w-5 text-cyan-500" />,
      title: "Offline Capability",
      description: "No internet required! Everything processes locally for privacy and speed"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      setProgress(prev => Math.min(prev + (100 / estimatedTime), 95));
    }, 1000);

    // Cycle through processing steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % processingSteps.length);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, [estimatedTime, processingSteps.length]);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 4000);

    return () => clearInterval(tipInterval);
  }, [tips.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">

        {/* Main Loading Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full"
            >
              <Brain className="h-12 w-12 text-white" />
            </motion.div>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {loadingMessage}
          </h1>
          <p className="text-lg text-gray-600">{subtitle}</p>

          {/* Enhanced Animated Progress Bar */}
          <div className="w-full max-w-md mx-auto space-y-3">
            {/* Progress container with glass morphism */}
            <div className="relative p-1 rounded-full bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 shadow-lg">
              {/* Inner progress track */}
              <div className="relative h-4 bg-white/80 backdrop-blur-sm rounded-full overflow-hidden shadow-inner">
                {/* Animated gradient progress fill */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {/* Shimmer effect overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />

                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 blur-sm opacity-50" />
                </motion.div>

                {/* Particle effects */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-white rounded-full"
                      animate={{
                        x: ['0%', '100%'],
                        y: [
                          `${Math.random() * 50}%`,
                          `${Math.random() * 50}%`,
                        ],
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                      }}
                      transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeInOut"
                      }}
                      style={{
                        left: `${(progress / 100) * 100}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Progress percentage badge */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 bg-white rounded-full px-2 py-0.5 shadow-md border-2 border-purple-300 text-xs font-bold text-purple-600"
                  animate={{ left: `calc(${progress}% - 20px)` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {Math.round(progress)}%
                </motion.div>
              </div>

              {/* Outer glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-20 blur-md -z-10"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            {/* Time display with icons and animations */}
            <div className="flex justify-between items-center text-sm">
              <motion.div
                className="flex items-center gap-2 text-gray-600"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="font-medium">
                  Elapsed: <span className="text-blue-600 font-bold">{formatTime(elapsedTime)}</span>
                </span>
              </motion.div>

              <motion.div
                className="flex items-center gap-2 text-gray-600"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="font-medium">
                  Est: <span className="text-purple-600 font-bold">~{formatTime(estimatedTime)}</span>
                </span>
              </motion.div>
            </div>

            {/* Progress milestone indicators */}
            <div className="flex justify-between items-center px-1">
              {[25, 50, 75, 100].map((milestone) => (
                <motion.div
                  key={milestone}
                  className="flex flex-col items-center gap-1"
                  initial={{ opacity: 0.3, scale: 0.8 }}
                  animate={{
                    opacity: progress >= milestone ? 1 : 0.3,
                    scale: progress >= milestone ? 1 : 0.8,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className={`w-2 h-2 rounded-full ${progress >= milestone
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg'
                      : 'bg-gray-300'
                      }`}
                    animate={
                      progress >= milestone
                        ? { scale: [1, 1.3, 1] }
                        : {}
                    }
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                  <span className={`text-xs font-medium ${progress >= milestone ? 'text-purple-600' : 'text-gray-400'
                    }`}>
                    {milestone}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Interactive Tips Section */}
        <motion.div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <CardContent className="p-0">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Did You Know?
              </h3>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTip}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {tips[currentTip].icon}
                    <div>
                      <h4 className="font-medium text-gray-800">
                        {tips[currentTip].title}
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {tips[currentTip].description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center mt-4 space-x-1">
                {tips.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentTip ? 'bg-blue-500 w-6' : 'bg-gray-300'
                      }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Processing Visualization */}
          <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-0">
              <h3 className="font-semibold text-gray-800 mb-6 flex items-center justify-center gap-2">
                <Cpu className="h-5 w-5 text-purple-500" />
                AI Processing Pipeline
              </h3>

              <div className="space-y-4">
                {processingSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0.3, scale: 0.95 }}
                    animate={{
                      opacity: index === currentStep ? 1 : 0.4,
                      scale: index === currentStep ? 1 : 0.95,
                      x: index === currentStep ? 5 : 0
                    }}
                    transition={{ duration: 0.5 }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${index === currentStep
                      ? 'bg-white shadow-md border-l-4 border-l-purple-500'
                      : 'bg-transparent'
                      }`}
                  >
                    <div className={`p-2 rounded-lg ${index === currentStep ? 'bg-purple-100' : 'bg-gray-100'
                      }`}>
                      <div className={step.color}>
                        {step.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${index === currentStep ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm ${index === currentStep ? 'text-gray-700' : 'text-gray-500'
                        }`}>
                        {step.description}
                      </p>
                    </div>
                    {index === currentStep && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Processing Animation */}
              <div className="mt-6 flex justify-center">
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      className="w-2 h-2 bg-purple-500 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Messages */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-center space-x-4 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Analyzing resume content
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  Generating questions
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  Preparing interview
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fun Facts for Long Loading Times */}
        {elapsedTime > 40 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  <strong>⚡ Hang tight!</strong><br />
                  Ollama is processing locally on your machine. First-time model loading takes longer, but it's worth the wait for your privacy! ✨
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};