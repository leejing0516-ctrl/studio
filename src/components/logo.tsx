"use client";
import { useSchoolStore } from '@/store/useSchoolStore';
import Image from 'next/image';

const Logo = ({ className }: { className?: string }) => {
    const { config } = useSchoolStore();
    const logoUrl = config?.logoUrl;

    if (logoUrl) {
        return <Image src={logoUrl} alt="Logo" width={40} height={40} className={className} />;
    }

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
        </svg>
    );
};

export default Logo;
