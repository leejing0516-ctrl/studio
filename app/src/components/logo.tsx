import { PiggyBank } from 'lucide-react';

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={`w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 ${className}`}>
        <PiggyBank className="w-6 h-6 text-primary" />
    </div>
  );
};

export default Logo;
