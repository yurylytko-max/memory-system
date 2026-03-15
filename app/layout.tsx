import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

import CommandPalette from "@/components/command-palette";
import TopNav from "@/components/top-nav";

const inter = Inter({
subsets:["latin"],
variable:"--font-sans"
});

export default function RootLayout({
children,
}:{
children:React.ReactNode;
}){

return (

<html lang="ru" className={cn("font-sans",inter.variable)}>

<body suppressHydrationWarning>

<CommandPalette/>
<TopNav/>

{children}

</body>

</html>

);

}
