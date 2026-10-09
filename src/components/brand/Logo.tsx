import React from 'react';
import officialLogo from '../../assets/logo-sabor-no-pote.jpg';

interface LogoProps {
  variant?: 'full' | 'horizontal' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showSubtitle = true,
  theme = 'light',
}) => {
  // Sizing mappings for the official circular emblem
  const iconDimensions = {
    sm: 'w-8 h-8',
    md: 'w-13 h-13 sm:w-16 sm:h-16 md:w-[68px] md:h-[68px]',
    lg: 'w-20 h-20 sm:w-24 sm:h-24',
    xl: 'w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-3xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px] sm:text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  const textColor = theme === 'dark' ? 'text-white' : 'text-[#171717]';
  const subtextColor = theme === 'dark' ? 'text-[#FFD447]' : 'text-[#FF981B]';

  // Official Logo Emblem Image with high-definition styling
  const OfficialLogoImage = (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 aspect-square ${iconDimensions[size]} transition-all duration-300 group-hover:scale-105 shadow-md shadow-black/15 ring-2 ring-[#FFBF32]/40`}
    >
      <img
        src={officialLogo}
        alt="Sabor no Pote - Logomarca Oficial"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center select-none"
        loading="eager"
      />
    </div>
  );

  // Icon only
  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{OfficialLogoImage}</div>;
  }

  // Full Hero / Showcase centered layout
  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center group ${className}`}>
        <div className="relative p-1 rounded-full bg-gradient-to-b from-[#FFBF32]/30 via-transparent to-[#FF981B]/20">
          {OfficialLogoImage}
        </div>
        <div className="mt-3">
          <span
            className={`block font-extrabold tracking-wider font-display ${textColor} ${textSizes[size]}`}
          >
            SABOR <span className="text-[#FF981B]">NO POTE</span>
          </span>
          {showSubtitle && (
            <span
              className={`block font-semibold tracking-[0.2em] uppercase mt-0.5 ${subtextColor} ${subtitleSizes[size]}`}
            >
              Gastronomia Artesanal
            </span>
          )}
        </div>
      </div>
    );
  }

  // Horizontal variant (default for Header and inline bars)
  return (
    <div className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {OfficialLogoImage}
      <div className="flex flex-col text-left justify-center">
        <span
          className={`font-extrabold tracking-wide font-display leading-tight ${textColor} ${textSizes[size]}`}
        >
          SABOR <span className="text-[#FF981B]">NO POTE</span>
        </span>
        {showSubtitle && (
          <span
            className={`font-semibold tracking-[0.16em] uppercase leading-none mt-1 ${subtextColor} ${subtitleSizes[size]}`}
          >
            Gastronomia no Pote
          </span>
        )}
      </div>
    </div>
  );
};
