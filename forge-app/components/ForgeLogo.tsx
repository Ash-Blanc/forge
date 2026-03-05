import { useId } from "react";

interface ForgeLogoProps {
    className?: string;
    decorative?: boolean;
}

export function ForgeLogo({ className, decorative = true }: ForgeLogoProps) {
    const strokeGradientId = useId();
    const fillGradientId = useId();
    const titleId = useId();

    return (
        <svg
            className={className}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden={decorative}
            role={decorative ? undefined : "img"}
            aria-labelledby={decorative ? undefined : titleId}
        >
            {!decorative ? <title id={titleId}>FORGE logo</title> : null}
            <defs>
                <linearGradient id={strokeGradientId} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#E6E6E6" />
                    <stop offset="1" stopColor="#636367" />
                </linearGradient>
                <linearGradient id={fillGradientId} x1="20" y1="16" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#4A4A4D" />
                    <stop offset="1" stopColor="#181819" />
                </linearGradient>
            </defs>

            <path
                d="M32 4L54.5 17V43L32 56L9.5 43V17L32 4Z"
                stroke={`url(#${strokeGradientId})`}
                strokeWidth="4"
                fill="none"
            />
            <path
                d="M32 13L46.7 21.5V38.5L32 47L17.3 38.5V21.5L32 13Z"
                fill={`url(#${fillGradientId})`}
            />
            <path
                d="M26 20H39.5V24.5H30.8V28.8H37.8V33.1H30.8V40H26V20Z"
                fill="#FFFFFF"
            />
        </svg>
    );
}
