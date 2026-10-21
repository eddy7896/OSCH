import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link/useRouter/usePathname: switching language keeps the page and changes only the language prefix.
export const { Link, usePathname, useRouter } = createNavigation(routing);
