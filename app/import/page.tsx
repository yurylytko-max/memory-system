import { redirect } from "next/navigation";

export default function LegacyImportRedirectPage() {
  redirect("/languages/import");
}
