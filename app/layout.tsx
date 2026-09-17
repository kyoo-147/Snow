import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"AgentKid",description:"A safe learning companion foundation"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
