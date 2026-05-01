type OfficialLogoMarkProps = {
  className?: string;
};

export function OfficialLogoMark({ className }: OfficialLogoMarkProps) {
  return (
    <img
      src="/logo-main.svg"
      alt="SafeCampus"
      className={`${className ?? ""} object-contain invert`}
      loading="eager"
      decoding="async"
    />
  );
}
