import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Video, 
  Monitor,
  Download,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from './ui/button';

interface ManualRecordingGuideProps {
  className?: string;
}

export const ManualRecordingGuide: React.FC<ManualRecordingGuideProps> = ({ 
  className = '' 
}) => {
  return (
    <Card className={`${className} border-2 border-orange-300`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Alternative Recording Options
          </CardTitle>
          <Badge variant="secondary">Manual Setup</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Browser Upgrade Option */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-800 mb-2">Recommended: Upgrade Browser</h3>
              <p className="text-sm text-blue-700 mb-3">
                The best solution is to use a modern browser with built-in recording support.
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.open('https://www.google.com/chrome/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get Chrome
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open('https://www.microsoft.com/edge/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get Edge
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Recording Instructions */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 mb-2">Alternative: Use Built-in Screen Recording</h3>
              <p className="text-sm text-yellow-700 mb-3">
                If you can't upgrade your browser, use your operating system's built-in recording:
              </p>
              
              <div className="space-y-3">
                {/* Windows Instructions */}
                <div className="p-3 bg-white rounded border">
                  <h4 className="font-medium text-gray-800 mb-2">🪟 Windows (Windows 10/11)</h4>
                  <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Windows + G</kbd></li>
                    <li>Click "Yes, this is a game" if prompted</li>
                    <li>Click the Record button (circle icon)</li>
                    <li>Start your interview</li>
                    <li>Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Windows + Alt + R</kbd> to stop</li>
                  </ol>
                </div>

                {/* Mac Instructions */}
                <div className="p-3 bg-white rounded border">
                  <h4 className="font-medium text-gray-800 mb-2">🍎 macOS</h4>
                  <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Cmd + Shift + 5</kbd></li>
                    <li>Select "Record Entire Screen" or "Record Selected Portion"</li>
                    <li>Click Record</li>
                    <li>Start your interview</li>
                    <li>Click the stop button in menu bar when done</li>
                  </ol>
                </div>

                {/* Third-party Tools */}
                <div className="p-3 bg-white rounded border">
                  <h4 className="font-medium text-gray-800 mb-2">🛠️ Third-party Tools</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>• <strong>OBS Studio</strong> (Free, advanced)</div>
                    <div>• <strong>Loom</strong> (Browser extension)</div>
                    <div>• <strong>Screencastify</strong> (Chrome extension)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recording Tips */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Monitor className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-800 mb-2">Recording Tips</h3>
              <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                <li>Record your entire screen for best results</li>
                <li>Make sure your microphone is working</li>
                <li>Close unnecessary applications to improve performance</li>
                <li>Test your setup before the actual interview</li>
                <li>Keep the recording file for your records</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center pt-2">
          <p className="text-sm text-gray-600 mb-3">
            You can continue with the interview even without automatic recording.
          </p>
          <Badge variant="outline" className="text-xs">
            The interview questions and speech analysis will still work normally
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};