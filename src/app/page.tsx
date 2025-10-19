import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/login-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-12 md:p-24 bg-background">
      <div className="w-full max-w-md mx-auto mb-8">
        <Logo />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 text-primary">
        小小巴菲特
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground text-center mb-8">
        校園理財通
      </p>
      <LoginForm />
    </main>
  );
}
