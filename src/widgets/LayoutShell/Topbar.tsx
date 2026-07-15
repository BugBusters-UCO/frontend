import Link from "next/link";
import { ThemeToggle } from "@/shared/ui/molecules/ThemeToggle";

export function Topbar() {
  return (
    <header className="bg-background/80 backdrop-blur-xl text-text-primary fixed top-0 w-full z-50 flex justify-between items-center px-page-margin h-16 border-b border-border-subtle shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-colors duration-300">
      <div className="flex items-center gap-element-gap pl-4">
        <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(31,111,235,0.15)] dark:bg-primary/20 dark:border-primary/30 dark:shadow-[0_0_15px_rgba(31,111,235,0.2)]">
          <span className="material-symbols-outlined text-lg">security</span>
        </div>
        <div>
          <Link href="/">
            <h2 className="text-section-header font-sans font-bold tracking-wider text-text-primary cursor-pointer hover:text-primary transition-colors duration-200">
              BUGBUSTERS
            </h2>
          </Link>
        </div>
      </div>
      
      <div className="flex items-center gap-4 pr-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
