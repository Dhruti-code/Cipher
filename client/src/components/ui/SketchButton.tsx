import React from 'react';

export interface SketchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'default';
  children?: React.ReactNode;
}

export const SketchButton = React.forwardRef<HTMLButtonElement, SketchButtonProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const variantClass = {
      default: 'sketch-button',
      primary: 'sketch-button sketch-button-secondary', // #2d5da1
      secondary: 'sketch-button bg-sketch-muted',
      accent: 'sketch-button sketch-button-accent', // #ff4d4d
    }[variant];

    return (
      <button ref={ref} className={`${variantClass} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
SketchButton.displayName = 'SketchButton';
