import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface InterviewCompleteProps {
  onGenerateReport: () => void;
  isLoading: boolean;
}

export const InterviewComplete = ({ onGenerateReport, isLoading }: InterviewCompleteProps) => {
  const { width, height } = useWindowSize();
  const navigate = useNavigate();
  const { interviewId } = useParams();
  const [isConfettiActive, setIsConfettiActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConfettiActive(false);
    }, 10000); // Stop confetti after 10 seconds
    return () => clearTimeout(timer);
  }, []);

  const handleViewReport = () => {
    navigate(`/generate/feedback/${interviewId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[50vh] p-6 bg-white rounded-lg shadow-xl relative">
      {isConfettiActive && <Confetti width={width} height={height} recycle={false} />}
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500 mb-4 animate-fadeIn">
          Interview Complete!
        </h2>
        <p className="text-xl text-gray-700 mb-8 max-w-lg">
          Congratulations on completing your mock interview! Your personalized feedback report is being generated.
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={onGenerateReport}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 transition-colors duration-300"
          >
            {isLoading ? (
              <><Loader2 className="animate-spin mr-2" /> Generating Report...</>
            ) : (
              "Generate Report"
            )}
          </Button>

          <Button
            onClick={handleViewReport}
            disabled={isLoading}
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-100"
          >
            View Report
          </Button>
        </div>
      </div>
    </div>
  );
};