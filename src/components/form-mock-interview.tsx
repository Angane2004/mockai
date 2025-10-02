import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Headings } from "./headings";
import { Button } from "./ui/button";
import { Loader, Upload } from "lucide-react";
import { Separator } from "./ui/separator";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/config/firebase.config";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

// ---------------- Schema -----------------
const formSchema = z.object({
  interviewName: z.string().min(1, "Interview Name is required"),
  interviewer: z.enum(["Lisa", "Bob"], {
    required_error: "Please select an interviewer",
  }),
  objective: z.string().min(5, "Objective is required"),
  pdfFile: z.any().optional(),
  anonymous: z.boolean().default(false),
  numQuestions: z.coerce.number().min(1, "At least 1 question"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  interviewType: z.enum(["HR Round", "Technical Round", "HR+Technical Round"], {
    required_error: "Please select an interview type",
  }),
  depthLevel: z.enum(["Beginner", "Intermediate", "Advanced"], {
    required_error: "Please select a depth level",
  }),
});

type FormData = z.infer<typeof formSchema>;

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const FormMockInterview = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      interviewName: "",
      interviewer: "Lisa",
      objective: "",
      pdfFile: null,
      anonymous: false,
      numQuestions: 5,
      duration: 30,
      interviewType: "HR Round",
      depthLevel: "Intermediate",
    },
  });

  const { isValid, isSubmitting } = form.formState;
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      let resumeFileData: any = null;
      if (data.pdfFile) {
        const dataUrl = await readFileAsDataURL(data.pdfFile);
        const base64 = dataUrl.split(',')[1];
        resumeFileData = {
          mimeType: data.pdfFile.type,
          data: base64,
          name: data.pdfFile.name,
        };
      }

      const docRef = await addDoc(collection(db, "interviews"), {
        userId,
        name: data.interviewName,
        interviewer: data.interviewer,
        objective: data.objective,
        resumeFile: resumeFileData,
        questions: [],
        numQuestions: data.numQuestions,
        duration: data.duration,
        anonymous: data.anonymous,
        interviewType: data.interviewType,
        depthLevel: data.depthLevel,
        createdAt: serverTimestamp(),
      });

      toast("Created!", { description: "Interview created successfully." });
      navigate(`/generate/interview/${docRef.id}`, { replace: true });
    } catch (error) {
      console.error("Error creating interview:", error);
      toast.error("Error", {
        description: "Something went wrong. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-col space-y-4">
      <div className="mt-4 flex items-center justify-between w-full">
        <Headings title="Create an Interview" isSubHeading />
      </div>
      <Separator className="my-4" />

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full p-8 rounded-lg flex-col flex items-start justify-start gap-6 shadow-md"
        >
          {/* Interview Name */}
          <FormField
            control={form.control}
            name="interviewName"
            render={({ field }) => (
              <FormItem className="w-full space-y-2">
                <FormLabel>Interview Name</FormLabel>
                <FormControl>
                  <Input className="h-12" placeholder="Frontend Dev Interview" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Interview Type and Depth Level */}
          <div className="w-full flex gap-6">
            <FormField
              control={form.control}
              name="interviewType"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-2">
                  <FormLabel>Interview Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select interview type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="HR Round">HR Round</SelectItem>
                      <SelectItem value="Technical Round">Technical Round</SelectItem>
                      <SelectItem value="HR+Technical Round" disabled>HR+Technical Round (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="depthLevel"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-2">
                  <FormLabel>Questions Depth</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select depth level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Interviewer Selection */}
          <FormField
            control={form.control}
            name="interviewer"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Select an Interviewer</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-row space-x-4"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Lisa" />
                      </FormControl>
                      <FormLabel className="font-normal">Lisa</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Bob" />
                      </FormControl>
                      <FormLabel className="font-normal">Bob</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Objective */}
          <FormField
            control={form.control}
            name="objective"
            render={({ field }) => (
              <FormItem className="w-full space-y-2">
                <FormLabel>Objective</FormLabel>
                <FormControl>
                  <Textarea
                    className="h-24"
                    placeholder="Assess candidate’s React + Firebase skills"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Resume Upload */}
          <FormField
            control={form.control}
            name="pdfFile"
            render={({ field }) => (
              <FormItem className="w-full space-y-2">
                <FormLabel>Upload Resume</FormLabel>
                <FormControl>
                  {!field.value ? (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer relative">
                      <Upload className="h-8 w-8 mb-2 text-gray-500" />
                      <span className="text-gray-500">
                        Drop .pdf or .docx here or click to upload
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) field.onChange(file);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border-2 rounded-lg p-6 bg-green-50 border-green-400">
                      <span className="text-green-600 font-medium text-lg">
                        Uploaded: {field.value.name}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => field.onChange(null)}
                      >
                        Re-upload
                      </Button>
                    </div>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Number of Questions + Duration */}
          <div className="w-full flex gap-6">
            <FormField
              control={form.control}
              name="numQuestions"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-2">
                  <FormLabel>Number of Questions</FormLabel>
                  <FormControl>
                    <Input type="number" className="h-12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-2">
                  <FormLabel>Duration (mins)</FormLabel>
                  <FormControl>
                    <Input type="number" className="h-12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Buttons */}
          <div className="w-full flex items-center justify-end gap-6">
            <Button type="button" size="sm" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button>
            <Button
              type="submit"
              className="bg-blue-500 text-white hover:bg-blue-600"
              size="sm"
              disabled={isSubmitting || !isValid || loading}
            >
              {loading ? <Loader className="animate-spin" /> : "Create Interview"}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};