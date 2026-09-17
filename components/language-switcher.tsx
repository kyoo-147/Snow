"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <select 
      value={locale} 
      onChange={onChange}
      className="btn btn-sm"
      style={{ marginLeft: "auto" }}
      aria-label="Language"
    >
      <option value="en">English</option>
      <option value="vi">Tiếng Việt</option>
    </select>
  );
}
