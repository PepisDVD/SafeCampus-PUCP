import Image from "next/image";

type OfficialLogoMarkProps = {
  className?: string;
};

export function OfficialLogoMark({ className }: OfficialLogoMarkProps) {
  return (
    <Image
      src="/logo-main.svg"
      alt="SafeCampus"
      width={32}
      height={32}
      className={`${className ?? ""} object-contain invert`}
      priority
    />
  );
}
