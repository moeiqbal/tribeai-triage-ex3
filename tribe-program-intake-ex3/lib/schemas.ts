import { z } from "zod";

export const intakeCreateSchema = z.object({
  title: z.string().trim().min(1, { error: "Title is required" }).max(200),
  description: z.string().trim().min(1, { error: "Description is required" }).max(5000),
  budgetRange: z.string().trim().min(1, { error: "Budget range is required" }).max(100),
  timeline: z.string().trim().min(1, { error: "Timeline is required" }).max(100),
  industry: z.string().trim().min(1, { error: "Industry is required" }).max(100),
});
export type IntakeCreateInput = z.infer<typeof intakeCreateSchema>;

export const aiTriageOutputSchema = z.object({
  summary: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).length(3),
  risks: z.array(z.string().trim().min(1)).min(1),
});
export type AiTriageOutput = z.infer<typeof aiTriageOutputSchema>;
