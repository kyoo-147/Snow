"use client";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations("common.logoutButton");
  return (
    <button className="button secondary" onClick={async()=>{
      await fetch("/api/auth/logout",{method:"POST"});
      router.push("/login");
      router.refresh();
    }}>
      {t("logOut")}
    </button>
  );
}
