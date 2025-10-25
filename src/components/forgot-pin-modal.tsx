import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PopupModal } from "./ui/popup-modal";
import { X, KeyRound, Mail } from "lucide-react";

interface ForgotPinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPinModal = ({ isOpen, onClose }: ForgotPinModalProps) => {
  const [email, setEmail] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Predefined admin email and security answer (in production, use secure backend)
  const ADMIN_EMAIL = "admin@aimock.com";
  const SECURITY_ANSWER = "aimock2024";

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && securityAnswer === SECURITY_ANSWER) {
      setModalType("success");
      setModalTitle("PIN Reset Successful!");
      setModalMessage("Your admin PIN is: 112233. Please use this to login.");
      setShowModal(true);
      
      setTimeout(() => {
        onClose();
        setEmail("");
        setSecurityAnswer("");
      }, 3000);
    } else {
      setModalType("error");
      setModalTitle("Reset Failed");
      setModalMessage("Invalid email or security answer. Please contact system administrator.");
      setShowModal(true);
    }

    setLoading(false);
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (modalType === "error") {
      setSecurityAnswer("");
    }
  };

  if (!isOpen) return null;

  return (
    <>
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

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <KeyRound className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Forgot PIN?
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter your admin email and security answer to reset your PIN
            </p>
          </div>

          {/* Development Info */}
          <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
              🔐 Development Credentials
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Email: admin@aimock.com</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Security Answer: aimock2024</p>
          </div>

          {/* Form */}
          <form onSubmit={handleResetPin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Admin Email
              </Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="admin@aimock.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="security-answer" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Security Answer
              </Label>
              <Input
                id="security-answer"
                type="text"
                placeholder="Enter security answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Resetting..." : "Reset PIN"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Popup Modal */}
      <PopupModal
        isOpen={showModal}
        onClose={handleModalClose}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
      />
    </>
  );
};
