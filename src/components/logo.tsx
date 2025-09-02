import { cn } from "@/lib/utils";
import { LOGO_SVG } from "@/lib/config";

const Logo = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn("text-primary", className)}
      dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
    />
  );
};

export default Logo;
