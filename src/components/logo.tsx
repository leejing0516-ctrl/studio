
import { useContext } from 'react';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { AppDataContext } from '@/context/AppDataContext';

const Logo = ({ className }: { className?: string }) => {
  const { platformConfig, isLoading } = useContext(AppDataContext);

  const logoUrl = platformConfig?.platformLogoUrl;

  // Do not render anything if still loading config or if no URL is set
  if (isLoading || !logoUrl) {
    return (
        <div className={cn("relative bg-muted rounded-md", className)}>
            {/* You can place a skeleton loader here if you want */}
        </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
        <Image 
            src={logoUrl}
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
