import { ClipboardList, Info, type LucideIcon, Settings, Timer } from "lucide-react";

export interface MenuItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  /** Items without an href show a "Soon" badge. Add the href when the page exists. */
  href?: string;
  /** Opens something on the page instead of going to another one. */
  action?: "settings" | "about";
}

export const MAIN_ITEMS: MenuItem[] = [
  {
    id: "village",
    label: "My village",
    hint: "Import it to see every timer",
    icon: ClipboardList,
    href: "/village.html",
  },
  {
    id: "finish",
    label: "Finish time",
    hint: "Enter the time left and your boosts",
    icon: Timer,
    href: "/finish.html",
  },
];

export const FOOT_ITEMS: MenuItem[] = [
  {
    id: "settings",
    label: "Settings",
    hint: "Theme, clock and saved data",
    icon: Settings,
    action: "settings",
  },
  {
    id: "about",
    label: "About",
    hint: "Why I made it, how it works, credits",
    icon: Info,
    action: "about",
  },
];

// The app's local server answers an address with no file extension with the home page, so every link names its file.
// "/finish", "/finish/" and "/finish.html" are all the same page here.
const pageOf = (path: string) => path.replace(/(?:\/index)?\.html$/, "").replace(/\/$/, "");

// "/" shows the Finish time calculator until its script moves the address, so it highlights Finish time too.
export const isCurrent = (item: MenuItem, path: string) =>
  item.href !== undefined && pageOf(item.href) === (pageOf(path) || "/finish");
