import "./globals.css";
import { cn } from "@/lib/utils";

import CommandPalette from "@/components/command-palette";
import TopNav from "@/components/top-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

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
