import { useState, useRef, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";

// Permanent admin PIN
const ADMIN_PIN = "112233";

export const AdminSignInPage = () => {
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^[0-9]$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value) {
      const fullPin = newPin.join("");
      if (fullPin.length === 6) {
        handleSubmit(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (fullPin: string) => {
    setLoading(true);
    setError("");

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (fullPin === ADMIN_PIN) {
      // Store admin session
      localStorage.setItem("adminSession", "true");
      
      // Redirect to admin dashboard
      setTimeout(() => {
        navigate("/admin-dashboard");
      }, 1500);
    } else {
      setError("Invalid PIN. Please try again.");
      setPin(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullPin = pin.join("");
    if (fullPin.length === 6) {
      handleSubmit(fullPin);
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-12 px-4">
      <div className="mx-auto grid w-[450px] gap-8">
        <div className="grid gap-3 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <KeyRound className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Admin Login
          </h1>
          <p className="text-muted-foreground text-lg">
            Enter your 6-digit PIN to access the dashboard
          </p>
        </div>
        
        <form onSubmit={handleManualSubmit} className="grid gap-6">
          <div className="grid gap-4">
            <Label className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
              Enter PIN
            </Label>
            
            {/* 6 PIN Input Boxes */}
            <div className="flex justify-center gap-3">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="w-14 h-16 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800 dark:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus={index === 0}
                />
              ))}
            </div>
            
            {/* Error Message */}
            {error && (
              <p className="text-center text-sm text-red-500 font-medium animate-shake">
                {error}
              </p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 text-lg font-semibold" 
            disabled={loading || pin.join("").length !== 6}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Authenticating...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </div>

      {/* Professional Loading Animation Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="relative">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 w-24 h-24">
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
            </div>
            {/* Middle rotating ring */}
            <div className="absolute inset-2 w-20 h-20">
              <div className="absolute inset-0 border-4 border-transparent border-b-purple-500 border-l-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            </div>
            {/* Inner pulsing circle */}
            <div className="absolute inset-4 w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            </div>
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-white z-10" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
