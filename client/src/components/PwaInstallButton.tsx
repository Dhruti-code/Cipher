import React, { useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Download, Smartphone, X, Share } from 'lucide-react';

export interface PwaInstallButtonProps {
  className?: string;
}

export const PwaInstallButton: React.FC<PwaInstallButtonProps> = ({ className = '' }) => {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Detect iOS Safari where beforeinstallprompt is not supported
  const isIos =
    typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  if (isInstalled) {
    return null; // Already installed, no need to clutter UI
  }

  // Handle standard Chromium / Android / Edge install prompt
  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  // Only display if install prompt is ready OR if running on iOS outside standalone
  if (!canInstall && !isIos) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={handleInstallClick}
        title="Install Cipher as an app"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs sm:text-sm font-heading font-bold text-sketch-fg bg-sketch-paper hover:bg-sketch-muted border-2 border-sketch-line rounded-sketch-btn shadow-sketch-sm active:translate-x-0.5 active:translate-y-0.5 transition-transform"
      >
        <Download className="w-3.5 h-3.5 text-sketch-accent" />
        <span>Install App</span>
      </button>

      {/* iOS Safari instructions tooltip modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xs p-5 bg-sketch-paper border-sketch-thick border-sketch-line rounded-sketch-card shadow-sketch-lg">
            <div className="flex items-center justify-between mb-3 border-b-2 border-sketch-line pb-2">
              <div className="flex items-center gap-2 font-heading text-lg font-bold text-sketch-fg">
                <Smartphone className="w-5 h-5 text-sketch-secondary" />
                <span>Install on iOS</span>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 text-sketch-fg hover:text-sketch-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-sm font-body text-sketch-fg space-y-2 list-decimal list-inside">
              <li>Tap the <Share className="w-4 h-4 inline text-sketch-secondary" /> <strong>Share</strong> icon at the bottom of Safari.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top right.</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="mt-4 w-full py-1.5 font-heading font-bold text-center border-2 border-sketch-line rounded-sketch-btn bg-sketch-bg hover:bg-sketch-muted shadow-sketch-sm"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
