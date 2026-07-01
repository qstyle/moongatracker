/**
 * Brand logo mark: a red square badge with a white crescent (a nod to the
 * "moon" in moonga). Used before the "moonga tracker" wordmark.
 */
export function LogoMark({ className = 'size-6' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-primary text-primary-foreground ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[65%]">
        <path
          fill="currentColor"
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        />
      </svg>
    </span>
  );
}
