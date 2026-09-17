import { Link } from "@/i18n/routing";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "./language-switcher";

export async function AppShell({children}:{children:React.ReactNode}){
  const user=await currentUser();
  if(!user) redirect("/login");
  const t = await getTranslations("common.appShell");
  return (
    <div className="shell">
      <header>
        <Link className="brand" href="/dashboard"><span>AK</span>AgentKid</Link>
        <nav>
          <Link href="/dashboard">{t("navParent")}</Link>
          <Link href="/kid">{t("navKid")}</Link>
          {user.role==="admin" && <Link href="/admin">{t("navAdmin")}</Link>}
          <LanguageSwitcher />
          <LogoutButton/>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

