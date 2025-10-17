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
            fill="currentColor"
            className={className}
        >
            <path d="M12 2L10.25 4.5H13.75L12 2Z" />
            <path d="M4.5 9.5C4.5 10.0523 4.94772 10.5 5.5 10.5H18.5C19.0523 10.5 19.5 10.0523 19.5 9.5C19.5 8.94772 19.0523 8.5 18.5 8.5H5.5C4.94772 8.5 4.5 8.94772 4.5 9.5Z" />
            <path d="M11.5 15.5C11.5 16.0523 11.9477 16.5 12.5 16.5H18.5C19.0523 16.5 19.5 16.0523 19.5 15.5C19.5 14.9477 19.0523 14.5 18.5 14.5H12.5C11.9477 14.5 11.5 14.9477 11.5 15.5Z" />
            <path d="M11.5 5.5L11.5 22.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M7 8L4 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M17 8L20 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
};

export default Logo;
