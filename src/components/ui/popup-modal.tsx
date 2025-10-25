import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { Button } from "./button";

interface PopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "error";
  title: string;
  message: string;
}

export const PopupModal = ({ isOpen, onClose, type, title, message }: PopupModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isSuccess = type === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          {isSuccess ? (
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 animate-in zoom-in duration-300 delay-100">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3 animate-in zoom-in duration-300 delay-100">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="text-center space-y-3">
          <h2 className={`text-2xl font-bold ${isSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {message}
          </p>
        </div>

        {/* Action button */}
        <div className="mt-6">
          <Button
            onClick={onClose}
            className={`w-full ${
              isSuccess
                ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
            } text-white`}
          >
            {isSuccess ? 'Continue' : 'Try Again'}
          </Button>
        </div>
      </div>
    </div>
  );
};
