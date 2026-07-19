import Link from "next/link";
import ThemeToggle from "./theme-toggle";

// App-wide top bar: logo mark + serif title on the left; theme toggle, admin
// link, a profile avatar chip, and sign-out on the right.
export default function AppHeader({
  displayName,
  isAdmin,
}: {
  displayName?: string | null;
  isAdmin?: boolean;
}) {
  const initial = (displayName ?? "").trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-hair bg-background/85 px-5 py-3 backdrop-blur">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
          <BookOpen />
        </span>
        <span className="hidden font-serif text-lg font-semibold text-heading sm:inline">
          Bible Reading Challenge
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-4 text-sm text-muted">
        <ThemeToggle />
        {isAdmin && (
          <Link href="/admin" className="hover:text-heading">
            Admin
          </Link>
        )}
        <Link
          href="/profile"
          title="Profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white"
        >
          {initial}
        </Link>
        <form action="/auth/signout" method="post" className="flex">
          <button type="submit" title="Sign out" className="hover:text-heading">
            <SignOutIcon />
          </button>
        </form>
      </div>
    </header>
  );
}

function BookOpen() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 6.5A6 6 0 0 0 6 4c-1 0-2 .2-3 .5v13A6 6 0 0 1 6 17c2.2 0 4 .8 6 2m0-12.5A6 6 0 0 1 18 4c1 0 2 .2 3 .5v13A6 6 0 0 0 18 17a6 6 0 0 0-6 2m0-12.5V19" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
    </svg>
  );
}
