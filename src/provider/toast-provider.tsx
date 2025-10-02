import { Toaster } from "@/components/ui/sonner";

export const ToasterProvider = () => {
  return (
    <Toaster
      theme="light"
      richColors
      position="top-right"
      className="bg-blue-100 shadow-lg"
    />
  );
};
