import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center justify-center h-24 w-48 rounded-lg bg-white p-2">
       <Image
          src="https://picsum.photos/seed/banklogo/200/100"
          alt="Virtual Bank Logo"
          width={180}
          height={90}
          className="object-contain"
          data-ai-hint="modern bank logo"
        />
    </div>
  );
}
