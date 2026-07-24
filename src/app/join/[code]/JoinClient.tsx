"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  code: string;
}

export default function JoinClient({ code }: Props) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setJoining(true);
    setError("");
    try {
      const res = await fetch("/api/tutor/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not join class");
        return;
      }
      router.push("/learn");
    } catch {
      setError("Something went wrong. กรุณาลองใหม่");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">
          {error}
        </div>
      )}
      <button
        onClick={handleJoin}
        disabled={joining}
        className="w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-50"
      >
        {joining ? "Joining... / กำลังเข้าร่วม..." : "Join Class / เข้าร่วมชั้นเรียน"}
      </button>
    </div>
  );
}
