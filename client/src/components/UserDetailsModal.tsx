import React, { useEffect, useRef } from 'react';
import { UserSearchResult } from '../services/api';
import { SketchButton } from './ui/SketchButton';
import { SketchBox } from './ui/SketchBox';
import { User, Loader2, X } from 'lucide-react';

export interface UserDetailsModalProps {
  user: UserSearchResult;
  onStartChat: () => Promise<void>;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  onStartChat,
  onClose,
  loading,
  error,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus Start Chat on mount
  useEffect(() => {
    startBtnRef.current?.focus();
  }, []);

  // Keyboard: Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [loading, onClose]);

  // Backdrop click closes
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sketch-fg/30"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-detail-name"
    >
      <SketchBox
        ref={modalRef}
        variant="paper"
        rotation="left"
        className="w-full max-w-sm p-8 flex flex-col items-center text-center gap-5"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close user details"
          className="absolute top-4 right-4 p-1.5 border-2 border-sketch-line rounded-sketch-badge hover:bg-sketch-muted transition active:translate-y-0.5"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User icon */}
        <div className="w-16 h-16 bg-white border-2 border-sketch-line rounded-sketch-badge shadow-sketch flex items-center justify-center -rotate-2">
          <User className="w-8 h-8 text-sketch-secondary" strokeWidth={2.2} />
        </div>

        {/* Username */}
        <div className="flex flex-col items-center gap-1.5 max-w-full">
          <h2
            id="user-detail-name"
            className="text-3xl font-bold sketch-heading text-sketch-fg break-words [overflow-wrap:anywhere] max-w-full"
          >
            {user.username}
          </h2>
          <span className="inline-flex items-center gap-1.5 text-sm text-sketch-fg/60">
            <span
              className="w-2.5 h-2.5 rounded-full bg-sketch-muted border border-sketch-line inline-block"
              aria-hidden="true"
            />
            Start a 1-to-1 conversation
          </span>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="w-full p-2.5 bg-[#fff1f0] border-2 border-sketch-accent rounded-sketch-badge text-sm font-medium text-sketch-accent shadow-sketch-xs"
          >
            {error}
          </div>
        )}

        {/* Start Chat CTA */}
        <SketchButton
          ref={startBtnRef}
          variant="primary"
          onClick={onStartChat}
          disabled={loading}
          className="w-full min-h-[48px] text-xl py-3"
          aria-label={`Start chat with ${user.username}`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Opening...
            </span>
          ) : (
            'Start Chat'
          )}
        </SketchButton>
      </SketchBox>
    </div>
  );
};
