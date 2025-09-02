
import { useContext } from 'react';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { LOGO_SVG } from "@/lib/config";
import { AppDataContext } from '@/context/AppDataContext';


const Logo = ({ className }: { className?: string }) => {
  const { platformConfig } = useContext(AppDataContext);

  if (platformConfig?.platformLogoUrl) {
    return (
        <div className={cn("relative", className)}>
            <Image 
                src={platformConfig.platformLogoUrl}
                alt="Platform Logo"
                fill
                sizes="100px"
                className="object-contain"
            />
        </div>
    )
  }

  // Fallback to default SVG
  if (LOGO_SVG) {
    return (
        <div
        className={cn("text-primary", className)}
        dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
        />
    );
  }
  
  return null;
};

export default Logo;
