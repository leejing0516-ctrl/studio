"use client";

import Image from 'next/image';
import { cn } from "@/lib/utils";
import { DEFAULT_LOGO_URL } from '@/lib/config';
import { useSchoolStore } from '@/store/useSchoolStore';

const Logo = ({ className }: { className?: string }) => {
  const { config: platformConfig } = useSchoolStore();
  const logoUrl = platformConfig?.logoUrl || DEFAULT_LOGO_URL;

  if (!logoUrl) {
    return (
        <div className={cn("relative bg-muted rounded-md", className)}>
            {/* Placeholder for when no logo is set */}
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
