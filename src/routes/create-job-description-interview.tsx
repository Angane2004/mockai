import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { toast } from 'sonner';
import { Loader2, FileText, Clock, Users, Target, ArrowLeft, Sparkles } from 'lucide-react';

import { CustomBreadCrumb } from '@/components/custom-bread-crumb';
import { Headings } from '@/components/headings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const CreateJobDescriptionInterview = () => {
  const [formData, setFormData] = useState({
    interviewName: '',
    jobDescription: '',
    jobTitle: '',
    companyName: '',
    interviewType: '',
    depthLevel: '',
    numQuestions: 5,
    duration: 30
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { userId } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.interviewName || !formData.jobDescription || !formData.jobTitle || 
        !formData.interviewType || !formData.depthLevel) {
      toast.error('Missing fields', {
        description: 'Please fill in all required fields'
      });
      return;
    }

    setIsLoading(true);

    try {
      const interviewData = {
        name: formData.interviewName,
        objective: formData.jobTitle,
        jobDescription: formData.jobDescription,
        companyName: formData.companyName,
        interviewType: formData.interviewType,
        depthLevel: formData.depthLevel,
        numQuestions: formData.numQuestions,
        duration: formData.duration,
        userId,
        type: 'job-description',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'interviews'), interviewData);
      
      toast.success('Interview Created! 🎉', {
        description: 'Starting your interview...',
      });

      // Navigate directly to interview start page
      navigate(`/generate/interview/${docRef.id}/start`);
    } catch (error) {
      console.error('Error creating interview:', error);
      toast.error('Failed to create interview', {
        description: 'Please try again later'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      <CustomBreadCrumb
        breadCrumbPage="Job Description Interview"
        breadCrumpItems={[
          { label: 'Dashboard', link: '/generate' },
          { label: 'Create Interview', link: '/generate' }
        ]}
      />

      <div className="flex items-center justify-between">
        <Headings
          title="Create Job-Based Interview"
          description="Generate interview questions based on job requirements"
        />
        <Button
          variant="ghost"
          onClick={() => navigate('/generate')}
          className="flex items-center gap-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Job Description Interview</CardTitle>
          <CardDescription>
            Create targeted interview questions based on specific job requirements and company needs
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Interview Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="interviewName" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Interview Name *
                </Label>
                <Input
                  id="interviewName"
                  placeholder="e.g., Frontend Developer Interview"
                  value={formData.interviewName}
                  onChange={(e) => handleInputChange('interviewName', e.target.value)}
                  className="focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Job Title *
                </Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g., Senior React Developer"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  className="focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g., Google, Microsoft, Startup Inc. (Optional)"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Job Description */}
            <div className="space-y-2">
              <Label htmlFor="jobDescription" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Job Description *
              </Label>
              <Textarea
                id="jobDescription"
                placeholder="Paste the complete job description here including responsibilities, requirements, and qualifications..."
                value={formData.jobDescription}
                onChange={(e) => handleInputChange('jobDescription', e.target.value)}
                className="min-h-[120px] focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              />
              <p className="text-sm text-gray-500">
                Tip: Include specific technologies, years of experience, and key responsibilities for better questions
              </p>
            </div>

            {/* Interview Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Interview Type *</Label>
                <Select value={formData.interviewType} onValueChange={(value) => handleInputChange('interviewType', value)}>
                  <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Behavioral">Behavioral</SelectItem>
                    <SelectItem value="System Design">System Design</SelectItem>
                    <SelectItem value="Mixed">Mixed Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty Level *</Label>
                <Select value={formData.depthLevel} onValueChange={(value) => handleInputChange('depthLevel', value)}>
                  <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fresher">Fresher (0-1 years)</SelectItem>
                    <SelectItem value="Intermediate">Intermediate (2-4 years)</SelectItem>
                    <SelectItem value="Experienced">Experienced (5+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numQuestions" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Questions Count
                </Label>
                <Select value={formData.numQuestions.toString()} onValueChange={(value) => handleInputChange('numQuestions', parseInt(value))}>
                  <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Questions</SelectItem>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="7">7 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Interview Duration (minutes)
              </Label>
              <Select value={formData.duration.toString()} onValueChange={(value) => handleInputChange('duration', parseInt(value))}>
                <SelectTrigger className="focus:ring-2 focus:ring-blue-500 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Info Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">AI-Powered Question Generation</h4>
                    <p className="text-sm text-blue-700">
                      Our local Llama AI will analyze your job description and create relevant, targeted questions. 
                      The more detailed your job description, the better the questions will be!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Interview...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create Job Interview
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};