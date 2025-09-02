import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 36 20"
    className={cn("text-primary", className)}
    aria-label="南梓實小虛擬銀行 Logo"
  >
    <defs>
        <linearGradient id="teal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#20A496" />
            <stop offset="100%" stopColor="#43C4B8" />
        </linearGradient>
        <linearGradient id="orange-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F29422" />
            <stop offset="100%" stopColor="#FDB86D" />
        </linearGradient>
    </defs>
    <g fill="#1E4258">
      <path d="M0 8 L4 0 L8 8 Z" />
      <path d="M4 20 L8 12 L12 20 Z" />
      <path d="M12 8 L8 16 L4 8 Z" />
      <path d="M16 8 L12 16 L8 8 Z" />
      <path d="M16 8 L20 0 L24 8 Z" />
      <path d="M28 20 L24 12 L20 20 Z" />
      <path d="M32 8 L28 16 L24 8 Z" />
      <path d="M36 0 L32 8 L28 0 Z" />
    </g>
    <g fill="#B0B0B0">
      <path d="M4 0 L8 8 L12 0 Z" />
      <path d="M8 12 L12 20 L16 12 Z" />
      <path d="M12 16 L16 8 L20 16 Z" />
      <path d="M20 0 L24 8 L28 0 Z" />
      <path d="M24 12 L28 20 L32 12 Z" />
      <path d="M28 8 L32 0 L36 8 Z" />
    </g>
    <g fill="url(#teal-gradient)">
      <path d="M12 8 L16 16 L20 8 Z" />
      <path d="M16 20 L12 12 L8 20 Z" />
    </g>
    <g fill="url(#orange-gradient)">
      <path d="M24 8 L28 16 L32 8 Z" />
      <path d="M28 0 L32 8 L32 0 Z" />
      <path d="M28 20 L32 12 L32 20 Z" />
    </g>
  </svg>
);

export default Logo;
