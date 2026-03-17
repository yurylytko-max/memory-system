import { redirect } from "next/navigation";

export default function LegacyLessonDetailRedirectPage() {
  redirect("/languages");
}
