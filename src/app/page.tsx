import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-background">
      <div className="flex flex-col items-center text-center mb-8">
        <Logo />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mt-4">
          南梓實小虛擬銀行
        </h1>
        <p className="text-gray-600 mt-2">
          為每一個努力的你,獻上更值得的未來。
        </p>
      </div>

      <LoginForm />
      
    </main>
  );
}
