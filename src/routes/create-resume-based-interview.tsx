import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { toast } from 'sonner';
import { Loader2, Upload, Clock, Target, ArrowLeft, Sparkles, FileUp, CheckCircle2, X } from 'lucide-react';

import { CustomBreadCrumb } from '@/components/custom-bread-crumb';
import { Headings } from '@/components/headings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FileUploadState {
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

export const CreateResumeBasedInterview = () => {
  const [formData, setFormData] = useState({
    interviewName: '',
    interviewType: '',
    depthLevel: '',
    numQuestions: 5,
    duration: 30
  });
  
  const [fileState, setFileState] = useState<FileUploadState>({
    file: null,
    uploading: false,
    uploaded: false,
    error: null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { userId } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFile = useCallback((file: File) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setFileState(prev => ({
        ...prev,
        error: 'Please upload a PDF, DOC, DOCX, or TXT file'
      }));
      return;
    }

    if (file.size > maxSize) {
      setFileState(prev => ({
        ...prev,
        error: 'File size should be less than 10MB'
      }));
      return;
    }

    setFileState(prev => ({
      ...prev,
      file,
      error: null,
      uploading: true
    }));

    // Simulate file processing
    setTimeout(() => {
      setFileState(prev => ({
        ...prev,
        uploading: false,
        uploaded: true
      }));

      // Show success animation
      toast.success('Resume uploaded successfully! 🎉', {
        description: `${file.name} is ready for analysis`,
        duration: 3000,
        className: 'animate-bounce'
      });
    }, 2000);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const removeFile = () => {
    setFileState({
      file: null,
      uploading: false,
      uploaded: false,
      error: null
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.interviewName || !formData.interviewType || !formData.depthLevel) {
      toast.error('Missing fields', {
        description: 'Please fill in all required fields'
      });
      return;
    }

    if (!fileState.uploaded || !fileState.file) {
      toast.error('Resume required', {
        description: 'Please upload your resume to continue'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        const interviewData = {
          name: formData.interviewName,
          objective: 'Resume-based Interview',
          interviewType: formData.interviewType,
          depthLevel: formData.depthLevel,
          numQuestions: formData.numQuestions,
          duration: formData.duration,
          userId,
          type: 'resume-based',
          resumeFile: {
            name: fileState.file!.name,
            size: fileState.file!.size,
            type: fileState.file!.type,
            data: base64Data.split(',')[1], // Remove data:type;base64, prefix
            mimeType: fileState.file!.type
          },
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'interviews'), interviewData);
        
        toast.success('Resume Interview Created! 🎉', {
          description: 'Starting your personalized interview...',
        });

        // Navigate directly to interview start page
        navigate(`/generate/interview/${docRef.id}/start`);
      };

      reader.readAsDataURL(fileState.file);
    } catch (error) {
      console.error('Error creating interview:', error);
      toast.error('Failed to create interview', {
        description: 'Please try again later'
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      <CustomBreadCrumb
        breadCrumbPage="Resume-Based Interview"
        breadCrumpItems={[
          { label: 'Dashboard', link: '/generate' },
          { label: 'Create Interview', link: '/generate' }
        ]}
      />

      <div className="flex items-center justify-between">
        <Headings
          title="Create Resume-Based Interview 📄"
          description="Upload your resume for personalized interview questions"
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
            <div className="bg-green-100 p-4 rounded-full">
              <Upload className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Resume-Based Interview</CardTitle>
          <CardDescription>
            Upload your resume and let AI create personalized questions based on your experience
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Interview Name */}
            <div className="space-y-2">
              <Label htmlFor="interviewName" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Interview Name *
              </Label>
              <Input
                id="interviewName"
                placeholder="e.g., My Software Engineering Interview"
                value={formData.interviewName}
                onChange={(e) => handleInputChange('interviewName', e.target.value)}
                className="focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>

            {/* Resume Upload */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                Upload Resume *
              </Label>
              
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
                  dragActive 
                    ? 'border-green-500 bg-green-50' 
                    : fileState.uploaded 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileInput}
                  accept=".pdf,.doc,.docx,.txt"
                />

                {fileState.uploading ? (
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <Loader2 className="h-12 w-12 text-green-600 animate-spin" />
                    </div>
                    <p className="text-green-600 font-medium">Processing your resume...</p>
                    <p className="text-sm text-gray-500">This may take a moment</p>
                  </div>
                ) : fileState.uploaded && fileState.file ? (
                  <div className="text-center">
                    <div className="relative mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-green-600 animate-pulse" />
                      <div className="absolute inset-0 bg-green-600 rounded-full animate-ping opacity-20"></div>
                    </div>
                    <p className="text-green-700 font-medium">✨ Resume uploaded successfully!</p>
                    <p className="text-sm text-gray-600 mt-1">{fileState.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(fileState.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="mt-2 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileUp className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drop your resume here or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports PDF, DOC, DOCX, TXT (Max 10MB)
                    </p>
                  </div>
                )}

                {fileState.error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{fileState.error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Interview Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Interview Type *</Label>
                <Select value={formData.interviewType} onValueChange={(value) => handleInputChange('interviewType', value)}>
                  <SelectTrigger className="focus:ring-2 focus:ring-green-500">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">🔧 Technical</SelectItem>
                    <SelectItem value="Behavioral">🧠 Behavioral</SelectItem>
                    <SelectItem value="System Design">🏗️ System Design</SelectItem>
                    <SelectItem value="Mixed">🎯 Mixed Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Experience Level *</Label>
                <Select value={formData.depthLevel} onValueChange={(value) => handleInputChange('depthLevel', value)}>
                  <SelectTrigger className="focus:ring-2 focus:ring-green-500">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fresher">🌱 Fresher (0-1 years)</SelectItem>
                    <SelectItem value="Intermediate">🚀 Intermediate (2-4 years)</SelectItem>
                    <SelectItem value="Experienced">⭐ Experienced (5+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numQuestions" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Questions Count
                </Label>
                <Select value={formData.numQuestions.toString()} onValueChange={(value) => handleInputChange('numQuestions', parseInt(value))}>
                  <SelectTrigger className="focus:ring-2 focus:ring-green-500">
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
                <SelectTrigger className="focus:ring-2 focus:ring-green-500 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes ⚡</SelectItem>
                  <SelectItem value="30">30 minutes 📝</SelectItem>
                  <SelectItem value="45">45 minutes 🎯</SelectItem>
                  <SelectItem value="60">60 minutes 🔥</SelectItem>
                  <SelectItem value="90">90 minutes 💪</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Info Card */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Sparkles className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">AI Resume Analysis</h4>
                    <p className="text-sm text-green-700">
                      Our Llama AI will analyze your resume and create questions based on your skills, 
                      experience, and projects. Get ready for a truly personalized interview experience!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={isLoading || !fileState.uploaded}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Interview...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create Resume Interview
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