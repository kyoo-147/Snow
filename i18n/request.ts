import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !(routing.locales as readonly string[]).includes(locale as string)) {
    locale = routing.defaultLocale;
  }
  
  const common = (await import(`../messages/${locale}/common.json`)).default;
  const parent = (await import(`../messages/${locale}/parent.json`)).default;
  const kid = (await import(`../messages/${locale}/kid.json`)).default;
  const admin = (await import(`../messages/${locale}/admin.json`)).default;
  
  return {
    locale,
    messages: {
      common,
      parent,
      kid,
      admin
    }
  };
});


