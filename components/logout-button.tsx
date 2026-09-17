"use client";
import { useRouter } from "next/navigation";
export function LogoutButton(){const router=useRouter();return <button className="button secondary" onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});router.push("/login");router.refresh();}}>Log out</button>;}
