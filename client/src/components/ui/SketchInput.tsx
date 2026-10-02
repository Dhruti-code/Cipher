import React from 'react';

export interface SketchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const SketchInput: React.FC<SketchInputProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-base font-semibold text-sketch-fg select-none tracking-wide"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`sketch-input ${error ? 'border-sketch-accent' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-sketch-accent font-medium">{error}</span>}
    </div>
  );
};
