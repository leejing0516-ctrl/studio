
"use client";
import Image from "next/image";
import { useSchoolStore } from "@/store/school-store";

const Logo = ({ className }: { className?: string }) => {
  const { config } = useSchoolStore();
  const logoUrl = config?.logoUrl;

  if (logoUrl) {
    return (
      <div className={`relative w-12 h-12 ${className}`}>
        <Image src={logoUrl} alt="School Logo" fill style={{ objectFit: 'contain' }} />
      </div>
    );
  }

  // Default fallback SVG logo
  return (
    <div className={`w-12 h-12 ${className}`}>
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <g fill="hsl(var(--primary))">
                <path d="M50,10 C77.61,10 100,32.39 100,60 C100,87.61 77.61,110 50,110 C22.39,110 0,87.61 0,60 C0,32.39 22.39,10 50,10 Z M50,20 C27.91,20 10,37.91 10,60 C10,82.09 27.91,100 50,100 C72.09,100 90,82.09 90,60 C90,37.91 72.09,20 50,20 Z" />
                <path d="M50,40 C55.52,40 60,44.48 60,50 C60,55.52 55.52,60 50,60 C44.48,60 40,55.52 40,50 C40,44.48 44.48,40 50,40 Z" />
                <path d="M25,60H75V70H25z" />
            </g>
        </svg>
    </div>
  );
};

export default Logo;
