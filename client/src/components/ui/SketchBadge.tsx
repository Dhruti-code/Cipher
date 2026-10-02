import React from 'react';

export interface SketchBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'secondary' | 'success';
  children: React.ReactNode;
}

export const SketchBadge: React.FC<SketchBadgeProps> = ({
  variant = 'default',
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-sketch-muted text-sketch-fg',
    accent: 'bg-sketch-accent text-white border-sketch-fg',
    secondary: 'bg-sketch-secondary text-white border-sketch-fg',
    success: 'bg-[#7bc67a] text-sketch-fg border-sketch-fg',
  }[variant];

  return (
    <span className={`sketch-badge ${variantStyles} ${className}`} {...props}>
      {children}
    </span>
  );
};
