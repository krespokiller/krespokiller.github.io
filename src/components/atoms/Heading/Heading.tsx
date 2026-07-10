import React from 'react';

interface HeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  style?: React.CSSProperties;
}

export const Heading: React.FC<HeadingProps> = ({
  children,
  level = 1,
  className = '',
  style,
}) => {
  const baseClasses = 'tracking-tight';

  const levelClasses = {
    1: 'text-4xl md:text-5xl font-light',
    2: 'text-3xl md:text-4xl font-light',
    3: 'text-2xl md:text-3xl',
    4: 'text-xl md:text-2xl font-light',
    5: 'text-lg md:text-xl font-light',
    6: 'text-base md:text-lg font-light',
  };

  const props = { className: `${baseClasses} ${levelClasses[level]} ${className}`, style };

  switch (level) {
    case 1: return <h1 {...props}>{children}</h1>;
    case 2: return <h2 {...props}>{children}</h2>;
    case 3: return <h3 {...props}>{children}</h3>;
    case 4: return <h4 {...props}>{children}</h4>;
    case 5: return <h5 {...props}>{children}</h5>;
    case 6: return <h6 {...props}>{children}</h6>;
    default: return <h1 {...props}>{children}</h1>;
  }
};
