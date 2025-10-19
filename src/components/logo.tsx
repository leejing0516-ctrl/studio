import Image from "next/image";

export function Logo() {
  return (
    <div className="relative w-40 h-32">
       <Image
          src="https://picsum.photos/seed/banklogo/200/150"
          alt="Virtual Bank Logo"
          width={200}
          height={150}
          className="object-contain"
          data-ai-hint="virtual bank kids"
        />
    </div>
  );
}
