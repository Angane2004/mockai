import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, AlertCircle, CheckCircle, Chrome, Firefox, Edge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export const MicrophonePermissionModal = ({ isOpen, onClose, onRetry }: MicrophonePermissionModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const chromeSteps = [
    {
      icon: <Chrome className="h-5 w-5 text-blue-500" />,
      title: "Chrome Instructions",
      steps: [
        "1. Look for the microphone icon 🎤 in your browser's address bar",
        "2. Click on the microphone icon",
        "3. Select 'Always allow' for this site",
        "4. Click 'Done' and refresh the page"
      ]
    }
  ];

  const firefoxSteps = [
    {
      icon: <Firefox className="h-5 w-5 text-orange-500" />,
      title: "Firefox Instructions", 
      steps: [
        "1. Look for the microphone icon 🎤 in your browser's address bar",
        "2. Click on the microphone icon",
        "3. Select 'Allow' and check 'Remember this decision'",
        "4. Refresh the page"
      ]
    }
  ];

  const troubleshootingTips = [
    {
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      title: "Check your microphone",
      description: "Make sure your microphone is connected and not muted"
    },
    {
      icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
      title: "Browser permissions",
      description: "Ensure you haven't blocked microphone access for this website"
    },
    {
      icon: <MicOff className="h-4 w-4 text-red-500" />,
      title: "Other applications",
      description: "Close other applications that might be using your microphone"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-500" />
            Microphone Access Required
          </DialogTitle>
          <DialogDescription>
            We need microphone access to record your interview answers. Please follow the steps below to enable it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Browser-specific instructions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Enable Microphone Access:</h3>
            
            <Card className="p-3 bg-blue-50 border-blue-200">
              <CardContent className="p-0">
                <div className="flex items-start gap-3">
                  <Chrome className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Chrome & Edge</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Click the 🎤 icon in your address bar</li>
                      <li>• Select "Always allow"</li>
                      <li>• Refresh this page</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-3 bg-orange-50 border-orange-200">
              <CardContent className="p-0">
                <div className="flex items-start gap-3">
                  <Firefox className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Firefox</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Click the 🎤 icon in your address bar</li>
                      <li>• Select "Allow" and check "Remember"</li>
                      <li>• Refresh this page</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Troubleshooting tips */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Troubleshooting:</h3>
            <div className="space-y-2">
              {troubleshootingTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  {tip.icon}
                  <div>
                    <p className="font-medium">{tip.title}</p>
                    <p className="text-gray-600 text-xs">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fallback option */}
          <Card className="p-3 bg-gray-50 border-gray-200">
            <CardContent className="p-0">
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Can't enable microphone?</p>
                <p className="text-xs text-gray-600 mb-3">
                  You can still participate in the interview by typing your answers instead of speaking them.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Use Text Input
          </Button>
          <Button onClick={() => { onRetry?.(); onClose(); }} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Try Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};