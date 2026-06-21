import Link from "next/link";

export function Topbar() {
  return (
    <header className="bg-surface-container-lowest text-primary text-headline-md font-headline-md fixed top-0  w-full z-50 flex justify-between items-center px-page-margin h-16 border-b border-border-divider shadow-sm">
      <div className="flex items-center gap-element-gap pl-4">
        <div className="h-8 w-8 rounded bg-primary-container text-on-primary flex items-center justify-center font-bold">
          <span className="material-symbols-outlined text-sm">security</span>
        </div>
        <div>
          <Link href="/">
            <h2 className="text-section-header font-section-header text-primary cursor-pointer hover:underline">
              BugBusters
            </h2>
          </Link>
        </div>
      </div>
    </header>
  );
}
