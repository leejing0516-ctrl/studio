
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { LOGO_URL } from '@/lib/config';

const Logo = ({ className }: { className?: string }) => {
  if (!LOGO_URL) {
    return (
        <div className={cn("relative bg-muted rounded-md", className)}>
            {/* Placeholder for when no logo is set */}
        </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
        <Image 
            src={LOGO_URL}
            alt="Platform Logo"
            fill
            sizes="(max-width: 768px) 100vw, 100px" // Provide appropriate sizes
            className="object-contain"
            priority // Prioritize loading the logo
        />
    </div>
  )
};

export default Logo;
