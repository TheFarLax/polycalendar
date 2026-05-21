import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', iconOnly = false, size = 'md' }: LogoProps) {
  // Determine sizing classes
  const sizeMap = {
    sm: { icon: 'w-6 h-6', text: 'text-base' },
    md: { icon: 'w-10 h-10', text: 'text-xl font-bold tracking-tight' },
    lg: { icon: 'w-24 h-24', text: 'text-3xl font-extrabold tracking-tight' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* SVG Icon matching the branding asset */}
      <svg
        className={currentSize.icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Calendar Outer Rounded Box (Blue) */}
        <rect
          x="12"
          x1="12"
          y="18"
          width="76"
          height="70"
          rx="14"
          stroke="#2563eb"
          strokeWidth="6"
          fill="none"
        />

        {/* Calendar Left Peg */}
        <rect x="28" y="8" width="6" height="14" rx="3" fill="#2563eb" />

        {/* Calendar Right Peg */}
        <rect x="66" y="8" width="6" height="14" rx="3" fill="#2563eb" />

        {/* Left Side: Double Triangle (Polymarket P-Style) */}
        {/* Top/Back Triangle */}
        <polygon
          points="28,32 52,44 28,56"
          stroke="#2563eb"
          strokeWidth="5"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Bottom/Front Triangle */}
        <polygon
          points="28,52 52,64 28,76"
          stroke="#2563eb"
          strokeWidth="5"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Right Side: Timeline Indicator */}
        {/* Vertical Timeline Line */}
        <line x1="72" y1="36" x2="72" y2="72" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
        
        {/* Top Grey Dot */}
        <circle cx="72" cy="36" r="4" fill="#cbd5e1" />
        
        {/* Middle Active Blue Dot */}
        <circle cx="72" cy="54" r="6" fill="#2563eb" />
        
        {/* Bottom Grey Dot */}
        <circle cx="72" cy="72" r="4" fill="#cbd5e1" />
      </svg>

      {/* Brand Text */}
      {!iconOnly && (
        <span className={`font-sans leading-none ${currentSize.text}`}>
          <span className="text-[#2563eb] font-semibold">Poly</span>
          <span className="text-[#1e293b] font-bold">Calendar</span>
        </span>
      )}
    </div>
  );
}
