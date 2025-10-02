import { toast as toastRadix } from "@/components/ui/ToastProvider";

export const toast = (props: { title: string; description?: string }) => {
  toastRadix(props);
};
