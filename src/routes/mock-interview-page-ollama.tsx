/* eslint-disable @typescript-eslint/no-unused-vars */
import { Interview } from "@/types";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { InteractiveLoadingPage } from "@/components/interactive-loading-page";
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";
import { QuestionSectionOllama } from "@/components/question-section-ollama";
import { AptitudeQuestionSection, MCQQuestion } from "@/components/aptitude-question-section";
import { CodingInterviewPage } from "@/routes/coding-interview-page";
import { SecurityMonitor, getSecurityViolations } from "@/components/security-monitor";
import { toast } from "sonner";
import { aiService } from "@/scripts/ai-service"; // Import unified AI service
import { CODING_QUESTIONS } from "@/scripts/coding-questions";
import { ollamaService } from "@/scripts/ollama";
import { questionHistoryService } from "@/services/question-history.service";

// AI helper function that works with both Ollama (local) and Gemini (cloud)
async function generateQuestionsFromStoredInterview(
  interview: Interview,
  userId: string
): Promise<string[]> {
  try {
    // Extract resume text from base64 if available
    let resumeText = "";
    if (interview.resumeFile) {
      try {
        resumeText = atob(interview.resumeFile.data);
      } catch {
        resumeText = "Resume content available";
      }
    }

    console.log('🔍 Checking for previously asked questions...');
    // Get previously asked questions for this user
    const askedQuestions = await questionHistoryService.getUserAskedQuestions(userId);

    // Generate slightly more questions than needed to account for filtering
    // OPTIMIZED: Reduced from 3x to 1.5x for faster generation
    const requestedCount = interview.numQuestions || 5;
    const generateCount = askedQuestions.length > 0
      ? Math.ceil(requestedCount * 1.5)  // Only 50% extra instead of 200% extra
      : requestedCount;

    console.log(`📝 Generating ${generateCount} questions (need ${requestedCount} unique)`);
    console.log(`⚡ Speed optimization: Reduced generation count from ${requestedCount * 3} to ${generateCount}`);

    // Use AI service (automatically selects Ollama or Gemini)
    const allQuestions = await aiService.generateInterviewQuestions({
      objective: interview.objective || interview.position || 'General Interview',
      interviewType: interview.interviewType || 'Technical',
      depthLevel: interview.depthLevel || 'Intermediate',
      numQuestions: generateCount,
      resumeText: resumeText || undefined,
      jobDescription: interview.jobDescription || undefined,
    });

    if (allQuestions.length === 0) {
      throw new Error("No questions were generated");
    }

    // Filter out previously asked questions
    const filteredQuestions = questionHistoryService.filterUnaskedQuestions(
      allQuestions,
      askedQuestions
    );

    // Take only the number of questions we need
    let finalQuestions = filteredQuestions.slice(0, requestedCount);

    // If we didn't get enough unique questions, request more (rare case)
    if (finalQuestions.length < requestedCount && askedQuestions.length > 0) {
      console.log(`⚠️ Need ${requestedCount - finalQuestions.length} more questions, requesting additional batch...`);

      const additionalQuestions = await aiService.generateInterviewQuestions({
        objective: interview.objective || interview.position || 'General Interview',
        interviewType: interview.interviewType || 'Technical',
        depthLevel: interview.depthLevel || 'Intermediate',
        numQuestions: requestedCount - finalQuestions.length + 2,
        resumeText: resumeText || undefined,
        jobDescription: interview.jobDescription || undefined,
      });

      const additionalFiltered = questionHistoryService.filterUnaskedQuestions(
        additionalQuestions,
        [...askedQuestions, ...finalQuestions]
      );

      finalQuestions = [...finalQuestions, ...additionalFiltered].slice(0, requestedCount);
    }

    // If still not enough questions after filtering, use the original generated questions
    // This ensures the interview always has questions even if all were previously asked
    if (finalQuestions.length === 0) {
      console.warn(`⚠️ All questions were previously asked. Using generated questions anyway.`);
      finalQuestions = allQuestions.slice(0, requestedCount);
      toast.info('Recycled questions', {
        description: `All available questions have been asked before. Some questions may repeat. Consider trying a different interview type or topic!`
      });
    } else if (finalQuestions.length < requestedCount) {
      // Fill remaining slots with already-asked questions to meet the count
      const remainingNeeded = requestedCount - finalQuestions.length;
      const usedQuestionSet = new Set(finalQuestions.map(q => q.toLowerCase().trim()));
      const recycledQuestions = allQuestions
        .filter(q => !usedQuestionSet.has(q.toLowerCase().trim()))
        .slice(0, remainingNeeded);
      finalQuestions = [...finalQuestions, ...recycledQuestions].slice(0, requestedCount);
      console.warn(`⚠️ Padded with ${recycledQuestions.length} previously asked questions to reach ${finalQuestions.length} total`);
      toast.info('Some recycled questions', {
        description: `${finalQuestions.length} questions ready. Some may have been asked before.`
      });
    } else {
      console.log(`✅ Selected ${finalQuestions.length} fresh questions`);
    }

    return finalQuestions;
  } catch (err) {
    console.error("AI generation error:", err);
    throw err;
  }
}

export const MockInterviewPageOllama = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [aptitudeQuestions, setAptitudeQuestions] = useState<any[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { userId } = useAuth(); // Move userId here so it's accessible in

  useEffect(() => {
    const fetchInterviewAndGenerateQuestions = async () => {
      if (!interviewId) {
        navigate("/generate", { replace: true });
        return;
      }
      try {
        setIsLoading(true);
        const interviewDoc = await getDoc(doc(db, "interviews", interviewId));
        if (interviewDoc.exists()) {
          const fetched = {
            id: interviewDoc.id,
            ...interviewDoc.data(),
          } as Interview;
          setInterview(fetched);


          // Check interview type and prepare accordingly
          if (fetched.interviewType === 'Aptitude') {
            // Aptitude interview - Use AI to generate MCQ questions
            toast("Generating aptitude questions with AI...", {
              description: "Please wait while AI creates your test questions.",
            });

            try {
              // Generate proper MCQ questions using AI
              const difficulty = ((fetched as any).aptitudeDifficulty || 'Easy') as 'Easy' | 'Medium' | 'Hard';
              const questionCount = fetched.numQuestions || 10;

              // Build context from job description or resume
              let context = '';
              if (fetched.jobDescription) {
                context = fetched.jobDescription.substring(0, 300);
              } else if (fetched.resumeFile) {
                try { context = atob(fetched.resumeFile.data).substring(0, 300); } catch { }
              }

              const mcqQuestions = await aiService.generateAptitudeMCQQuestions(
                difficulty,
                questionCount,
                context || undefined
              );

              if (mcqQuestions.length > 0) {
                setAptitudeQuestions(mcqQuestions);
                const aiType = aiService.isUsingOllama() ? 'Ollama (local)' : 'Gemini API';
                toast.success("Aptitude Test Ready!", {
                  description: `${mcqQuestions.length} ${difficulty} AI-generated MCQ questions loaded using ${aiType}.`,
                });
              } else {
                throw new Error('No AI MCQ questions generated');
              }
            } catch (err) {
              console.warn('⚠️ AI aptitude MCQ generation failed, using pre-defined questions:', err);
              // Fallback to pre-defined questions
              const difficulty = ((fetched as any).aptitudeDifficulty || 'Easy') as 'Easy' | 'Medium' | 'Hard';
              const mcqQuestions = ollamaService.generateAptitudeQuestions(difficulty);
              setAptitudeQuestions(mcqQuestions);
              toast.success("Aptitude Test Ready!", {
                description: `${mcqQuestions.length} ${difficulty} questions loaded (pre-defined fallback).`,
              });
            }

            const difficulty = (fetched as any).aptitudeDifficulty || 'Easy';
            const timeLimits = { Easy: 15 * 60, Medium: 20 * 60, Hard: 25 * 60 };
            setTimeRemaining(timeLimits[difficulty as keyof typeof timeLimits] || 15 * 60);

            setIsLoading(false);

            if (userId) {
              await questionHistoryService.saveAskedQuestions(
                userId,
                interviewId!,
                aptitudeQuestions.map(q => q.question),
                'Aptitude'
              );
            }
          } else if (fetched.interviewType === 'Technical Code' || fetched.interviewType === 'Technical' || fetched.interviewType === 'Technical Coding') {
            // Technical/Coding interview - Use AI to generate coding questions
            const rawDifficulty = (fetched as any).codingDifficulty || fetched.depthLevel || 'Easy';
            const difficultyMap: Record<string, string> = {
              'Fresher': 'Easy', 'Beginner': 'Easy', 'Easy': 'Easy',
              'Intermediate': 'Medium', 'Medium': 'Medium',
              'Advanced': 'Hard', 'Expert': 'Hard', 'Hard': 'Hard',
            };
            const difficulty = difficultyMap[rawDifficulty] || 'Easy';

            toast("Generating coding questions with AI...", {
              description: "Please wait while AI creates your coding problems.",
            });

            try {
              // Generate technical questions using AI
              const numQuestions = fetched.numQuestions || 3;
              const aiQuestions = await aiService.generateInterviewQuestions({
                objective: fetched.objective || fetched.position || 'Software Development',
                interviewType: 'Technical Code',
                depthLevel: difficulty,
                numQuestions: numQuestions,
                jobDescription: fetched.jobDescription || undefined,
              });

              // Convert AI text questions to coding question format
              const codingQuestionsFromAI = aiQuestions.map((q, index) => ({
                id: `ai-tech-${index}`,
                title: q.split('?')[0].split(':').pop()?.trim() || `Problem ${index + 1}`,
                description: q,
                difficulty: difficulty as 'Easy' | 'Medium' | 'Hard',
                timeLimit: difficulty === 'Hard' ? 30 : difficulty === 'Medium' ? 20 : 15,
                starterCode: {
                  python: '# Write your solution here\n\ndef solution():\n    pass\n',
                  javascript: '// Write your solution here\n\nfunction solution() {\n  \n}\n',
                  java: '// Write your solution here\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
                  cpp: '// Write your solution here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
                  c: '// Write your solution here\n\n#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
                },
                testCases: [
                  { input: 'Sample Input', expectedOutput: 'Sample Output', isHidden: false },
                ],
                hints: ['Think about the problem step by step', 'Consider edge cases'],
                tags: ['AI Generated', difficulty],
              }));

              if (codingQuestionsFromAI.length > 0) {
                setCodingQuestions(codingQuestionsFromAI);
                setTimeRemaining(codingQuestionsFromAI.reduce((total, q) => total + q.timeLimit, 0) * 60);
                const aiType = aiService.isUsingOllama() ? 'Ollama (local)' : 'Gemini API';
                toast.success("Coding Interview Ready!", {
                  description: `${codingQuestionsFromAI.length} AI-generated ${difficulty} problems using ${aiType}.`,
                });
              } else {
                throw new Error('No AI coding questions generated');
              }
            } catch (err) {
              console.warn('⚠️ AI coding generation failed, using pre-defined questions:', err);
              // Fallback to pre-defined coding questions
              let difficultyQuestions = CODING_QUESTIONS.filter(q => q.difficulty === difficulty);
              if (difficultyQuestions.length === 0) difficultyQuestions = [...CODING_QUESTIONS];

              const numQuestions = fetched.numQuestions || 3;
              const selectedQuestions = difficultyQuestions
                .sort(() => Math.random() - 0.5)
                .slice(0, numQuestions);

              setCodingQuestions(selectedQuestions);
              setTimeRemaining(selectedQuestions.reduce((total, q) => total + q.timeLimit, 0) * 60);
              toast.success("Coding Interview Ready!", {
                description: `${selectedQuestions.length} ${difficulty} coding problems loaded (pre-defined fallback).`,
              });
            }

            setIsLoading(false);
          } else {
            // Regular interview (behavioral/technical Q&A)
            toast("Generating questions with AI...", {
              description: "Please wait while AI generates interview questions.",
            });

            const newQuestions = await generateQuestionsFromStoredInterview(fetched, userId!);
            setQuestions(newQuestions);

            // Save these questions to history to prevent repetition
            await questionHistoryService.saveAskedQuestions(
              userId!,
              interviewId!,
              newQuestions,
              fetched.interviewType || 'General'
            );

            const aiType = aiService.isUsingOllama() ? 'Ollama (local)' : 'Gemini API';
            toast.success("Questions generated successfully!", {
              description: `Generated ${newQuestions.length} questions using ${aiType}.`,
            });
          }
        } else {
          navigate("/generate", { replace: true });
        }
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "Error loading interview";
        toast.error("Error", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterviewAndGenerateQuestions();
  }, [interviewId, navigate]);

  // Timer countdown for aptitude tests
  useEffect(() => {
    if (interview?.interviewType === 'Aptitude' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-submit when time runs out
            toast.warning('Time Up!', {
              description: 'Submitting your test automatically...'
            });
            setTimeout(async () => {
              const results = ollamaService.evaluateAptitudeAnswers(aptitudeQuestions, userAnswers);

              // Calculate overall rating
              const overallRating = Math.round((results.scoredMarks / results.totalMarks) * 10);
              let overallFeedback = overallRating >= 7
                ? 'Good performance under time pressure! You completed the test within the given timeframe.'
                : 'Time management is key! Consider practicing with timed tests to improve your speed and accuracy.';

              // Store results
              await updateDoc(doc(db, 'interviews', interviewId!), {
                aptitudeResults: results,
                completed: true
              });

              // Create report
              await addDoc(collection(db, 'interviewReports'), {
                interviewId: interviewId!,
                userId: userId!,
                overallRating: overallRating,
                overallFeedback: overallFeedback,
                questionFeedbacks: aptitudeQuestions.map(q => ({
                  question: q.question,
                  userAnswer: userAnswers[q.id] || 'Not answered',
                  correctAnswer: q.options[q.correctAnswer],
                  ratings: userAnswers[q.id] === q.correctAnswer ? 10 : 0,
                  feedback: userAnswers[q.id] === q.correctAnswer
                    ? '✓ Correct!'
                    : `✗ Incorrect. Correct: ${q.options[q.correctAnswer]}`,
                  correct_ans: q.options[q.correctAnswer]
                })),
                aptitudeResults: results,
                createdAt: new Date().toISOString(),
                interviewType: 'Aptitude'
              });

              navigate(`/generate/feedback/${interviewId}`);
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [interview?.interviewType, timeRemaining, aptitudeQuestions, userAnswers, interviewId, navigate]);

  if (
    isLoading ||
    (interview?.interviewType === 'Aptitude' && !aptitudeQuestions.length) ||
    ((interview?.interviewType === 'Technical Code' || interview?.interviewType === 'Technical' || interview?.interviewType === 'Technical Coding') && !codingQuestions.length) ||
    (interview?.interviewType !== 'Aptitude' && interview?.interviewType !== 'Technical Code' && interview?.interviewType !== 'Technical' && interview?.interviewType !== 'Technical Coding' && !questions.length)
  ) {
    return (
      <InteractiveLoadingPage
        loadingMessage={interview?.interviewType === 'Aptitude' ? "Loading Aptitude Test" : "Generating Interview Questions"}
        subtitle="Ultra-fast generation with smart caching!"
        estimatedTime={interview?.interviewType === 'Aptitude' ? 2 : 5}
        hasResume={!!interview?.resumeFile}
      />
    );
  }

  if (!interviewId || !interview) {
    navigate("/generate", { replace: true });
    return null;
  }

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      <CustomBreadCrumb
        breadCrumbPage="Start"
        breadCrumpItems={[
          { label: "Mock Interviews", link: "/generate" },
          {
            label: interview?.name || "",
            link: `/generate/interview/${interview?.id}`,
          },
        ]}
      />

      <div className="w-full">
        <Alert className="bg-green-100 border border-green-200 p-4 rounded-lg flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-green-600" />
          <div>
            <AlertTitle className="text-green-800 font-semibold">
              Powered by AI
            </AlertTitle>
            <AlertDescription className="text-sm text-green-700 mt-1 leading-relaxed">
              Your interview questions and feedback are generated using AI (Ollama locally if available, or Gemini API in the cloud).
              <br />
              <br />
              <strong>How to use:</strong>{" "}
              Press "Record Answer" to begin answering each question. After completing
              all questions, you'll receive detailed AI-powered feedback.
              <br />
              <br />
              <strong>Privacy note:</strong>{" "}
              <span className="font-medium">Your video is never recorded.</span>
              You can disable the webcam anytime if preferred.
            </AlertDescription>
          </div>
        </Alert>
      </div>

      {/* Security Monitor for all interviews */}
      <SecurityMonitor enabled={true} interviewId={interviewId!} />

      <div className="mt-4 w-full flex flex-col items-start gap-4">
        {(interview.interviewType === 'Technical Code' || interview.interviewType === 'Technical' || interview.interviewType === 'Technical Coding') && codingQuestions.length > 0 ? (
          <CodingInterviewPage
            questions={codingQuestions}
            interviewId={interviewId!}
            duration={Math.floor(timeRemaining / 60)}
            onSubmit={async (results) => {
              console.log('📊 Coding results:', results);

              // Get security violations
              const violations = getSecurityViolations(interviewId!);

              // Save to Firebase
              await updateDoc(doc(db, 'interviews', interviewId!), {
                codingResults: results,
                securityViolations: violations,
                completed: true
              });

              // Build detailed questionFeedbacks for the feedback page
              const overallRating = results.length > 0
                ? results.reduce((sum: number, r: any) => {
                  const score = r.testResults?.passedTests || 0;
                  const total = r.testResults?.totalTests || 1;
                  return sum + (score / total) * 10;
                }, 0) / results.length
                : 5;

              const questionFeedbacks = results.map((r: any, idx: number) => {
                const question = codingQuestions[idx];
                const passed = r.testResults?.passedTests || 0;
                const total = r.testResults?.totalTests || 1;
                const score = Math.round((passed / total) * 10);

                let feedback = '';
                if (score >= 8) {
                  feedback = 'Excellent solution! Your code is clean and passes most/all test cases. Keep up the great work!';
                } else if (score >= 5) {
                  feedback = 'Good attempt! Your solution works for some cases but may need optimization or edge case handling. Review your logic carefully.';
                } else {
                  feedback = 'Needs improvement. Focus on understanding the problem requirements, consider edge cases, and practice similar problems to build your skills.';
                }

                return {
                  question: question?.description || question?.title || `Coding Problem ${idx + 1}`,
                  userAnswer: r.code || 'No code submitted',
                  rating: score,
                  feedback: feedback,
                  idealAnswer: `This problem requires a well-structured solution in ${r.language || 'your chosen language'}. Test Results: ${passed}/${total} passed.`,
                };
              });

              // Generate overall feedback
              let overallFeedback = '';
              if (overallRating >= 8) {
                overallFeedback = 'Outstanding coding performance! You demonstrated strong problem-solving skills and clean code practices.';
              } else if (overallRating >= 6) {
                overallFeedback = 'Good job! You showed solid coding abilities. Keep practicing to handle edge cases and optimize your solutions.';
              } else if (overallRating >= 4) {
                overallFeedback = 'Decent effort! Focus on practicing common patterns and data structures to improve your problem-solving speed.';
              } else {
                overallFeedback = 'Keep practicing! Work through more coding challenges on platforms like LeetCode to build your skills.';
              }

              // Create report with detailed feedback
              await addDoc(collection(db, 'interviewReports'), {
                interviewId: interviewId!,
                userId: userId!,
                codingResults: results,
                securityViolations: violations,
                overallRating: Math.round(overallRating * 10) / 10,
                overallFeedback: overallFeedback,
                questionFeedbacks: questionFeedbacks,
                createdAt: new Date().toISOString()
              });

              toast.success('Interview submitted successfully!');
              navigate(`/generate/feedback/${interviewId}`);
            }}
          />
        ) : interview.interviewType === 'Aptitude' ? (
          <AptitudeQuestionSection
            questions={aptitudeQuestions}
            currentQuestionIndex={currentQuestionIndex}
            userAnswers={userAnswers}
            onAnswerChange={(questionId, answer) => {
              setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
            }}
            onNavigate={setCurrentQuestionIndex}
            onSubmit={async () => {
              // Evaluate answers
              const results = ollamaService.evaluateAptitudeAnswers(aptitudeQuestions, userAnswers);

              // Calculate overall rating (1-10 scale)
              const overallRating = Math.round((results.scoredMarks / results.totalMarks) * 10);

              // Generate overall feedback based on score
              let overallFeedback = '';
              if (overallRating >= 9) {
                overallFeedback = 'Outstanding performance! You demonstrated exceptional analytical and problem-solving abilities.';
              } else if (overallRating >= 7) {
                overallFeedback = 'Great job! You showed strong aptitude across multiple areas. Keep up the excellent work!';
              } else if (overallRating >= 5) {
                overallFeedback = 'Good effort! You have a solid foundation. Focus on practicing more challenging problems to improve.';
              } else {
                overallFeedback = 'Keep practicing! Review the fundamental concepts and try more practice problems to build your skills.';
              }

              // Store results in interviews collection
              await updateDoc(doc(db, 'interviews', interviewId!), {
                aptitudeResults: results,
                completed: true
              });

              // Create report document for feedback page
              const reportData = {
                interviewId: interviewId!,
                userId: userId!,
                overallRating: overallRating,
                overallFeedback: overallFeedback,
                questionFeedbacks: aptitudeQuestions.map((q, index) => ({
                  question: q.question,
                  userAnswer: userAnswers[q.id] || 'Not answered',
                  correctAnswer: q.options[q.correctAnswer],
                  ratings: userAnswers[q.id] === q.correctAnswer ? 10 : 0,
                  feedback: userAnswers[q.id] === q.correctAnswer
                    ? '✓ Correct! Well done.'
                    : `✗ Incorrect. The correct answer is: ${q.options[q.correctAnswer]}`,
                  correct_ans: q.options[q.correctAnswer],
                  category: q.category,
                  difficulty: q.difficulty,
                  marks: q.marks
                })),
                aptitudeResults: results,
                createdAt: new Date().toISOString(),
                interviewType: 'Aptitude'
              };

              await addDoc(collection(db, 'interviewReports'), reportData);

              toast.success('Test Submitted!', {
                description: 'Your aptitude test has been evaluated successfully.'
              });

              navigate(`/generate/feedback/${interviewId}`);
            }}
            timeRemaining={timeRemaining}
          />
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg w-full">
              <h3 className="text-blue-800 font-semibold mb-2">
                Generated Questions ({questions.length})
              </h3>
              <p className="text-sm text-blue-700">
                Questions tailored for {interview.interviewType} interview at {interview.depthLevel} level
              </p>
            </div>

            <QuestionSectionOllama
              questions={questions}
              interviewType={interview.interviewType || 'Technical'}
              depthLevel={interview.depthLevel || 'Intermediate'}
              duration={interview.duration || 30}
            />
          </>
        )}
      </div>
    </div>
  );
};