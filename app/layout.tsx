import "./globals.css";
import { cn } from "@/lib/utils";
import { headers } from "next/headers";

import AppChrome from "@/components/app-chrome";
import PlannerDeadlineManager from "@/components/planner-deadline-manager";
import TopNav from "@/components/top-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function RootLayout({
children,
}:{
children:React.ReactNode;
}){
const headerStore = await headers();
const host = headerStore.get("host");
const protocol = headerStore.get("x-forwarded-proto") ?? "https";

if (host) {
  void fetch(`${protocol}://${host}/api/internal/post-deploy-cleanup`, {
    method: "POST",
    cache: "no-store",
  }).catch(() => {
    // Ignore cleanup trigger failures during page rendering.
  });
}

return (

<html lang="ru" className={cn("font-sans")}>

<body suppressHydrationWarning>
<TooltipProvider>
<AppChrome/>
<PlannerDeadlineManager/>
<TopNav/>

{children}
</TooltipProvider>

</body>

</html>

);

}
