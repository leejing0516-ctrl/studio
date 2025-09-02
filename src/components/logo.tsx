import { cn } from "@/lib/utils";
import { LOGO_SVG } from "@/lib/config";

const Logo = ({ className }: { className?: string }) => (
  <div
    className={cn("text-primary", className)}
    dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
    aria-label="南梓實小虛擬銀行 Logo"
  />
);

export default Logo;
