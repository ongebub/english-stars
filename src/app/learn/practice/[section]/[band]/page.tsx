import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PracticeQuizClient from "./PracticeQuizClient";

export const dynamic = "force-dynamic";

const VALID_SECTIONS = ["expression", "reading", "structure", "vocabulary"];
const VALID_BANDS = ["K", "1", "2", "3"];

interface Question {
  id: string;
  item_number: number;
  part: string;
  points: number;
  situation_en: string | null;
  dialogue_en: string | null;
  prompt_en: string | null;
  passage_id: string | null;
  is_inference: boolean;
  options: {
    id: string;
    option_number: number;
    text_en: string;
    is_correct: boolean;
  }[];
}

interface Passage {
  id: string;
  sort_order: number;
  title_en: string | null;
  body_en: string;
}

export default async function PracticeQuizPage({
  params,
}: {
  params: Promise<{ section: string; band: string }>;
}) {
  const { section, band } = await params;

  if (!VALID_SECTIONS.includes(section) || !VALID_BANDS.includes(band)) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate: subscription required
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (subscription?.status !== "active") {
    redirect("/subscribe");
  }

  // Fetch assessment
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, title_en, section, grade_band, total_points")
    .eq("kind", "practice_quiz")
    .eq("section", section)
    .eq("grade_band", band)
    .eq("is_published", true)
    .single();

  if (!assessment) notFound();

  // Fetch passages (for reading quizzes)
  const { data: passages } = await supabase
    .from("assessment_passages")
    .select("id, sort_order, title_en, body_en")
    .eq("assessment_id", assessment.id)
    .order("sort_order");

  // Fetch questions with options
  const { data: questions } = await supabase
    .from("assessment_questions")
    .select(
      "id, item_number, part, points, situation_en, dialogue_en, prompt_en, passage_id, is_inference"
    )
    .eq("assessment_id", assessment.id)
    .order("item_number");

  const questionIds = (questions ?? []).map((q) => q.id);
  const { data: allOptions } = questionIds.length
    ? await supabase
        .from("assessment_options")
        .select("id, question_id, option_number, text_en, is_correct")
        .in("question_id", questionIds)
        .order("option_number")
    : { data: [] };

  // Group options by question
  type OptionRow = { id: string; question_id: string; option_number: number; text_en: string; is_correct: boolean };
  const optionsByQuestion: Record<string, OptionRow[]> = {};
  for (const opt of (allOptions ?? []) as OptionRow[]) {
    if (!optionsByQuestion[opt.question_id])
      optionsByQuestion[opt.question_id] = [];
    optionsByQuestion[opt.question_id]!.push(opt);
  }

  const questionsWithOptions: Question[] = (questions ?? []).map((q) => ({
    ...q,
    options: (optionsByQuestion[q.id] ?? []).map((o) => ({
      id: o.id,
      option_number: o.option_number,
      text_en: o.text_en,
      is_correct: o.is_correct,
    })),
  }));

  return (
    <PracticeQuizClient
      assessment={{
        id: assessment.id,
        title_en: assessment.title_en,
        section: assessment.section!,
        grade_band: assessment.grade_band!,
        total_points: assessment.total_points,
      }}
      questions={questionsWithOptions}
      passages={(passages ?? []) as Passage[]}
      userId={user.id}
    />
  );
}
