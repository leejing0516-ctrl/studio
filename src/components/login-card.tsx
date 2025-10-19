import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface LoginCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function LoginCard({ icon, title, description, children }: LoginCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col items-center text-center">
        <div className="p-3 bg-primary/10 rounded-full mb-2">
            {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="px-4">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
