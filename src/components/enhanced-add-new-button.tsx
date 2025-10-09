import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown, FileText, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EnhancedAddNewButton = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleJobDescriptionInterview = () => {
    navigate('/generate/create/job-description');
    setIsOpen(false);
  };

  const handleResumeBasedInterview = () => {
    navigate('/generate/create/resume-based');
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          className="bg-transparent text-blue-500 border border-blue-500 hover:text-white hover:border-transparent transition-all duration-300 relative overflow-hidden group py-2 px-4 rounded-full hover:bg-blue-500"
        >
          <span className="absolute inset-0 block bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out"></span>
          <span className="relative z-10 flex items-center justify-center transition-transform duration-300">
            <Plus className="mr-2 transition-transform duration-300 group-hover:rotate-90" />
            Add New
            <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-64 p-2 bg-white border border-gray-200 shadow-lg rounded-xl animate-in fade-in-0 zoom-in-95"
      >
        <DropdownMenuItem
          onClick={handleJobDescriptionInterview}
          className="flex items-center p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-3 group-hover:bg-blue-200 transition-colors">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Job Description</p>
            <p className="text-sm text-gray-500">Create interview based on job requirements</p>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleResumeBasedInterview}
          className="flex items-center p-3 rounded-lg hover:bg-green-50 transition-colors cursor-pointer group mt-2"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg mr-3 group-hover:bg-green-200 transition-colors">
            <Upload className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Resume Based</p>
            <p className="text-sm text-gray-500">Upload resume for personalized questions</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};