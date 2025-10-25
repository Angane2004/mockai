import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { db } from "@/config/firebase.config";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, User, BookOpen, Phone, Linkedin } from "lucide-react";

interface ProfileOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileOnboardingModal = ({ isOpen, onClose }: ProfileOnboardingModalProps) => {
  const { userId } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    collegeName: "",
    currentYear: "",
    degree: "",
    branch: "",
    phoneNumber: "",
    linkedinUrl: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.collegeName || !formData.currentYear || !formData.degree || !formData.branch) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "userProfiles"), {
        userId,
        userName: user?.fullName || user?.firstName || "User",
        userEmail: user?.primaryEmailAddress?.emailAddress || "",
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Profile completed successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-2">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-3 rounded-full">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to AI Mock Interview! 🎉</CardTitle>
              <CardDescription className="text-blue-100">
                Let's complete your profile to get started
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* College Name */}
            <div className="space-y-2">
              <Label htmlFor="collegeName" className="flex items-center gap-2 text-base font-semibold">
                <BookOpen className="h-4 w-4 text-blue-600" />
                College/Institute Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="collegeName"
                name="collegeName"
                placeholder="e.g., ABC Institute of Technology"
                value={formData.collegeName}
                onChange={handleInputChange}
                required
                className="text-base"
              />
            </div>

            {/* Current Year */}
            <div className="space-y-2">
              <Label htmlFor="currentYear" className="flex items-center gap-2 text-base font-semibold">
                <User className="h-4 w-4 text-blue-600" />
                Current Year <span className="text-red-500">*</span>
              </Label>
              <select
                id="currentYear"
                name="currentYear"
                value={formData.currentYear}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              >
                <option value="">Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Graduated">Graduated</option>
                <option value="Working Professional">Working Professional</option>
              </select>
            </div>

            {/* Degree */}
            <div className="space-y-2">
              <Label htmlFor="degree" className="flex items-center gap-2 text-base font-semibold">
                <GraduationCap className="h-4 w-4 text-blue-600" />
                Degree <span className="text-red-500">*</span>
              </Label>
              <select
                id="degree"
                name="degree"
                value={formData.degree}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              >
                <option value="">Select Degree</option>
                <optgroup label="Engineering">
                  <option value="B.Tech">B.Tech (Bachelor of Technology)</option>
                  <option value="M.Tech">M.Tech (Master of Technology)</option>
                  <option value="B.E.">B.E. (Bachelor of Engineering)</option>
                  <option value="M.E.">M.E. (Master of Engineering)</option>
                </optgroup>
                <optgroup label="Computer Applications">
                  <option value="BCA">BCA (Bachelor of Computer Applications)</option>
                  <option value="MCA">MCA (Master of Computer Applications)</option>
                </optgroup>
                <optgroup label="Science">
                  <option value="B.Sc">B.Sc (Bachelor of Science)</option>
                  <option value="M.Sc">M.Sc (Master of Science)</option>
                </optgroup>
                <optgroup label="Commerce">
                  <option value="B.Com">B.Com (Bachelor of Commerce)</option>
                  <option value="M.Com">M.Com (Master of Commerce)</option>
                </optgroup>
                <optgroup label="Arts & Humanities">
                  <option value="B.A.">B.A. (Bachelor of Arts)</option>
                  <option value="M.A.">M.A. (Master of Arts)</option>
                </optgroup>
                <optgroup label="Business & Management">
                  <option value="BBA">BBA (Bachelor of Business Administration)</option>
                  <option value="MBA">MBA (Master of Business Administration)</option>
                </optgroup>
                <optgroup label="Pharmacy">
                  <option value="B.Pharm">B.Pharm (Bachelor of Pharmacy)</option>
                  <option value="M.Pharm">M.Pharm (Master of Pharmacy)</option>
                  <option value="Pharm.D">Pharm.D (Doctor of Pharmacy)</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="Diploma">Diploma</option>
                  <option value="Other">Other</option>
                </optgroup>
              </select>
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <Label htmlFor="branch" className="flex items-center gap-2 text-base font-semibold">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Branch/Specialization <span className="text-red-500">*</span>
              </Label>
              <Input
                id="branch"
                name="branch"
                placeholder="e.g., Computer Science, Finance, Psychology, Marketing, etc."
                value={formData.branch}
                onChange={handleInputChange}
                required
                className="text-base"
              />
              <p className="text-xs text-gray-500">
                Enter your field of study (works for all backgrounds: Engineering, Commerce, Science, Arts, etc.)
              </p>
            </div>

            {/* Phone Number (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2 text-base font-semibold">
                <Phone className="h-4 w-4 text-gray-600" />
                Phone Number (Optional)
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="e.g., +91 9876543210"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="text-base"
              />
            </div>

            {/* LinkedIn URL (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl" className="flex items-center gap-2 text-base font-semibold">
                <Linkedin className="h-4 w-4 text-blue-700" />
                LinkedIn Profile (Optional)
              </Label>
              <Input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                value={formData.linkedinUrl}
                onChange={handleInputChange}
                className="text-base"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-base"
              >
                {loading ? "Saving..." : "Complete Profile & Get Started"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
