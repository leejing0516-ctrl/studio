import Image from 'next/image';
import Logo from '@/components/logo';
import { useSchoolStore } from '@/store/useSchoolStore';
import LoginForm from './login-form';

export default function LoginPage() {
  const config = useSchoolStore.getState().config;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground font-sans">
      <div className="text-center mb-8">
        <Logo className="h-24 w-24 mx-auto mb-4 text-primary" />
        <h1 className="text-4xl font-bold text-foreground">南梓實小虛擬銀行</h1>
        <p className="text-muted-foreground mt-2 text-lg">為每一個努力的你,獻上更值得的未來。</p>
      </div>

      <LoginForm />

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>贊助單位</p>
        <div className="flex items-center justify-center gap-4 mt-2">
           <Image src="/esun-bank-logo.png" alt="E.Sun Bank" width={100} height={40} data-ai-hint="bank logo" />
           <Image src="/parenting-logo.png" alt="Parenting" width={100} height={40} data-ai-hint="parenting magazine logo" />
           <Image src="/kist-logo.png" alt="KIST" width={80} height={40} data-ai-hint="KIST logo" />
           <Image src="/tainan-gov-logo.png" alt="Tainan Gov" width={100} height={40} data-ai-hint="government logo" />
        </div>
        {config?.footerText && <p className="mt-4">{config.footerText}</p>}
      </footer>
    </div>
  );
}
