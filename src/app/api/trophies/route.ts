import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface TrophyCheck {
  trophy_type: string;
  subject_id: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { child_id, subject_id, score, total } = body;

    // Use child_id if provided (parent viewing child), otherwise user.id
    const profileId = child_id || user.id;

    // Get existing trophies for this child
    const { data: existingTrophies } = await supabase
      .from("trophies")
      .select("trophy_type, subject_id")
      .eq("child_id", profileId);

    const existing = existingTrophies || [];
    const hasTrophy = (type: string, sid: string | null = null) =>
      existing.some((t) => t.trophy_type === type && t.subject_id === sid);

    // Get all attempts for this child
    const { data: allAttempts } = await supabase
      .from("quiz_attempts")
      .select("subject_id, score, total, completed_at")
      .eq("child_id", profileId);

    const attempts = allAttempts || [];

    const newTrophies: TrophyCheck[] = [];

    // 🏆 First Steps - Complete your first quiz
    if (!hasTrophy("first_steps") && attempts.length >= 1) {
      newTrophies.push({ trophy_type: "first_steps", subject_id: null });
    }

    // 🌟 Perfect Score - Get 10/10 on any quiz
    if (!hasTrophy("perfect_score") && score === total) {
      newTrophies.push({ trophy_type: "perfect_score", subject_id: null });
    }

    // 📚 Subject Master - Get 3 stars (9+ out of 10) on a subject 3 times
    const subjectAttempts = attempts.filter((a) => a.subject_id === subject_id);
    const threeStarCount = subjectAttempts.filter(
      (a) => a.score >= Math.ceil(a.total * 0.9)
    ).length;
    if (!hasTrophy("subject_master", subject_id) && threeStarCount >= 3) {
      newTrophies.push({ trophy_type: "subject_master", subject_id });
    }

    // 🔥 On Fire - Complete 5 quizzes in one day
    const today = new Date().toISOString().split("T")[0];
    const todayAttempts = attempts.filter(
      (a) => a.completed_at && a.completed_at.startsWith(today)
    );
    if (!hasTrophy("on_fire") && todayAttempts.length >= 5) {
      newTrophies.push({ trophy_type: "on_fire", subject_id: null });
    }

    // 🎯 Sharp Shooter - Get 3 stars on 5 different subjects
    const subjectsWithThreeStars = new Set<string>();
    for (const attempt of attempts) {
      if (attempt.score >= Math.ceil(attempt.total * 0.9)) {
        subjectsWithThreeStars.add(attempt.subject_id);
      }
    }
    if (!hasTrophy("sharp_shooter") && subjectsWithThreeStars.size >= 5) {
      newTrophies.push({ trophy_type: "sharp_shooter", subject_id: null });
    }

    // 🦉 Ollie's Star - Complete all subjects in module 1
    const { data: module1Subjects } = await supabase
      .from("subjects")
      .select("id")
      .eq("module", 1)
      .eq("is_published", true);

    if (module1Subjects && !hasTrophy("ollies_star")) {
      const completedSubjects = new Set(attempts.map((a) => a.subject_id));
      const allComplete = module1Subjects.every((s) => completedSubjects.has(s.id));
      if (allComplete) {
        newTrophies.push({ trophy_type: "ollies_star", subject_id: null });
      }
    }

    // Insert new trophies
    const awarded: string[] = [];
    for (const trophy of newTrophies) {
      const { error } = await supabase.from("trophies").insert({
        child_id: profileId,
        trophy_type: trophy.trophy_type,
        subject_id: trophy.subject_id,
      });
      if (!error) awarded.push(trophy.trophy_type);
    }

    return NextResponse.json({ awarded });
  } catch (error: unknown) {
    console.error("Trophy check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
