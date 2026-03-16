import "./globals.css";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

import TopNav from "@/components/top-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

const CommandPalette = dynamic(() => import("@/components/command-palette"), {
  ssr: false,
});

export default function RootLayout({
children,
}:{
children:React.ReactNode;
}){

return (

<html lang="ru" className={cn("font-sans")}>

<body suppressHydrationWarning>
<TooltipProvider>
<CommandPalette/>
<TopNav/>

{children}
</TooltipProvider>

</body>

</html>

);

}
