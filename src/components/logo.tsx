
import { useContext } from 'react';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { AppDataContext } from '@/context/AppDataContext';
import placeholderImages from '@/lib/placeholder-images.json';

const Logo = ({ className }: { className?: string }) => {
  const { platformConfig } = useContext(AppDataContext);

  const logoUrl = platformConfig?.platformLogoUrl || placeholderImages.platformLogo.src;

  if (logoUrl) {
    // Check if the logoUrl is a Base64 string or a regular URL/path
    if (logoUrl.startsWith('data:image')) {
      return (
        <div className={cn("relative", className)}>
            <Image 
                src={logoUrl}
                alt="Platform Logo"
                fill
                sizes="100px"
                className="object-contain"
            />
        </div>
      )
    }
    // Handle regular URLs/paths
    return (
        <div className={cn("relative", className)}>
            <Image 
                src={logoUrl}
                alt="Platform Logo"
                fill
                sizes="100px"
                className="object-contain"
                unoptimized // Add this if your static paths are not configured in next.config.js
            />
        </div>
    )
  }
  
  return null;
};

export default Logo;
