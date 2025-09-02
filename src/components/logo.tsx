import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    className={cn("text-primary", className)}
    aria-label="南梓實小虛擬銀行 Logo"
  >
    <defs>
      <linearGradient id="teal-gradient-new" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#20A496" />
        <stop offset="100%" stopColor="#43C4B8" />
      </linearGradient>
      <linearGradient id="orange-gradient-new" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F29422" />
        <stop offset="100%" stopColor="#FDB86D" />
      </linearGradient>
    </defs>
    <path
      fill="url(#teal-gradient-new)"
      d="M89.34,39.53a6.15,6.15,0,0,0-10.66,0L53,80.82a6.15,6.15,0,0,0,5.33,9.22H73A6.15,6.15,0,0,0,73,77.7H63.6L89.34,39.53Z"
    />
    <path
      fill="url(#orange-gradient-new)"
      d="M41.7,21.36a6.15,6.15,0,0,0,5.33-9.22L21.36,2.61a6.15,6.15,0,0,0-10.66,0L-5,39.53a6.15,6.15,0,0,0,5.33,9.22H21.36a6.15,6.15,0,0,0,0-12.3H16L36.37,6.15,47.06,25.6a6.15,6.15,0,0,0,10.66,0L78.64,62.52a6.15,6.15,0,0,0,5.33,9.22H95.33a6.15,6.15,0,1,0,0-12.3H89.3L63.56,21.36Z"
    />
  </svg>
);

export default Logo;
