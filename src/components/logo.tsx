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
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
            <path d="M12 3v18" />
            <path d="m18 9-6-6-6 6" />
        </svg>
    );
};

export default Logo;
