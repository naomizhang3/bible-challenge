export default function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <svg
        className="h-7 w-7 animate-spin text-brand"
        viewBox="0 0 24 24"
        fill="none"
        role="status"
        aria-label="Loading"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
        />
      </svg>
    </div>
  );
}
