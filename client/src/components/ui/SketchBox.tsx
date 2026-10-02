import React from 'react';

export interface SketchBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'paper' | 'muted';
  rotation?: 'none' | 'left' | 'right';
  className?: string;
  children?: React.ReactNode;
}

export const SketchBox = React.forwardRef<HTMLDivElement, SketchBoxProps>(
  ({ variant = 'white', rotation = 'none', className = '', children, ...props }, ref) => {
    const bgClasses = {
      white: 'bg-white',
      paper: 'bg-sketch-paper',
      muted: 'bg-sketch-muted',
    }[variant];

    const rotationClasses = {
      none: '',
      left: '-rotate-[0.5deg]',
      right: 'rotate-[0.5deg]',
    }[rotation];

    return (
      <div
        ref={ref}
        className={`sketch-box ${bgClasses} ${rotationClasses} p-6 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SketchBox.displayName = 'SketchBox';
