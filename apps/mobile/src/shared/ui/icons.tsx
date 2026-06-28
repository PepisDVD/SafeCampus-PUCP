import type { ReactNode } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type IconProps = {
  color?: string;
  size?: number;
};

function IconShell({ children, size = 24 }: IconProps & { children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

export function HomeIcon(props: IconProps) {
  const color = props.color ?? "#F8FAFC";
  return (
    <IconShell {...props}>
      <Path d="M4 11.5 12 5l8 6.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 10.5V19h11v-8.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 19v-5h4v5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </IconShell>
  );
}

export function ShieldIcon(props: IconProps) {
  const color = props.color ?? "#F8FAFC";
  return (
    <IconShell {...props}>
      <Path d="M12 3 19 6v5c0 4.5-2.8 8.2-7 10-4.2-1.8-7-5.5-7-10V6l7-3Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="m9 12 2 2 4-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </IconShell>
  );
}

export function MapIcon(props: IconProps) {
  const color = props.color ?? "#F8FAFC";
  return (
    <IconShell {...props}>
      <Path d="M9 18 4 20V6l5-2 6 2 5-2v14l-5 2-6-2Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M9 4v14M15 6v14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </IconShell>
  );
}

export function PackageIcon(props: IconProps) {
  const color = props.color ?? "#F8FAFC";
  return (
    <IconShell {...props}>
      <Path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M4 8.5V16l8 4 8-4V8.5M12 13v7" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </IconShell>
  );
}

export function UserIcon(props: IconProps) {
  const color = props.color ?? "#F8FAFC";
  return (
    <IconShell {...props}>
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
      <Path d="M4.5 20c1.5-4 13.5-4 15 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </IconShell>
  );
}

export function BellIcon(props: IconProps) {
  const color = props.color ?? "#F8FAFC";
  return (
    <IconShell {...props}>
      <Path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3v-4Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M10 20h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </IconShell>
  );
}

export function LogoutIcon(props: IconProps) {
  const color = props.color ?? "#F8FAFC";
  return (
    <IconShell {...props}>
      <Path d="M10 5H5v14h5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 8l4 4-4 4M18 12H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </IconShell>
  );
}

export function PlusIcon(props: IconProps) {
  const color = props.color ?? "#F8FAFC";
  return (
    <IconShell {...props}>
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </IconShell>
  );
}

export function CameraIcon(props: IconProps) {
  const color = props.color ?? "#F8FAFC";
  return (
    <IconShell {...props}>
      <Rect x={4} y={7} width={16} height={12} rx={3} stroke={color} strokeWidth={2} />
      <Path d="M9 7l1.5-2h3L15 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={3} stroke={color} strokeWidth={2} />
    </IconShell>
  );
}
