import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
export async function AppShell({children}:{children:React.ReactNode}){const user=await currentUser();if(!user)redirect("/login");return <div className="shell"><header><Link className="brand" href="/dashboard"><span>AK</span>AgentKid</Link><nav><Link href="/dashboard">Parent</Link><Link href="/kid">Kid</Link>{user.role==="admin"&&<Link href="/admin">Admin</Link>}<LogoutButton/></nav></header><main>{children}</main></div>;}
