import React from 'react';
import { SketchBox } from '../components/ui/SketchBox';
import { SketchButton } from '../components/ui/SketchButton';
import { PwaInstallButton } from '../components/PwaInstallButton';
import { MessageSquareText } from 'lucide-react';

export interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <SketchBox
        variant="paper"
        rotation="left"
        className="w-full max-w-md p-8 md:p-10 flex flex-col items-center text-center gap-6"
      >
        {/* Hand-drawn Chat Icon Container */}
        <div className="w-20 h-20 bg-white border-2 border-sketch-line rounded-sketch-badge shadow-sketch flex items-center justify-center -rotate-2">
          <MessageSquareText className="w-10 h-10 text-sketch-secondary" strokeWidth={2.2} />
        </div>

        {/* Heading & Tagline */}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-5xl font-bold sketch-heading text-sketch-fg tracking-tight">
            Welcome to Cipher
          </h1>
          <p className="text-xl md:text-2xl text-sketch-fg/80 leading-relaxed font-body">
            Personal conversations<br />made simple.
          </p>
        </div>

        {/* Decorative sketch line */}
        <div className="w-24 h-0.5 bg-sketch-line/40 rounded-full" />

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 w-full">
          <SketchButton
            variant="primary"
            onClick={onGetStarted}
            className="w-full sm:w-auto min-w-[200px] min-h-[48px] text-xl px-8 py-3"
            aria-label="Get Started with Cipher"
          >
            Get Started
          </SketchButton>

          <PwaInstallButton className="mt-1" />
        </div>
      </SketchBox>
    </div>
  );
};
