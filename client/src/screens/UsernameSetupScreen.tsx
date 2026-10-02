import React, { useState } from 'react';
import { SketchBox } from '../components/ui/SketchBox';
import { SketchButton } from '../components/ui/SketchButton';
import { SketchInput } from '../components/ui/SketchInput';
import { User as UserIcon, ArrowLeft, Loader2 } from 'lucide-react';

export interface UsernameSetupScreenProps {
  onJoin: (username: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  serverError: string | null;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export const UsernameSetupScreen: React.FC<UsernameSetupScreenProps> = ({
  onJoin,
  onBack,
  loading,
  serverError,
}) => {
  const [username, setUsername] = useState<string>('');
  const [clientError, setClientError] = useState<string | null>(null);

  const validateInput = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Please enter a username.';
    }
    if (value.includes(' ')) {
      return 'Spaces are not allowed in usernames.';
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
      return 'Username must be between 3 and 20 characters.';
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      return 'Use only letters, numbers, and underscores.';
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);

    // Provide immediate feedback if error was already shown
    if (clientError) {
      setClientError(validateInput(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateInput(username);
    if (error) {
      setClientError(error);
      return;
    }

    setClientError(null);
    await onJoin(username.trim());
  };

  const activeError = clientError || serverError;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <SketchBox
        variant="white"
        rotation="right"
        className="w-full max-w-md p-8 md:p-10 flex flex-col gap-6"
      >
        {/* Back navigation button */}
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="self-start flex items-center gap-1.5 text-base text-sketch-fg/70 hover:text-sketch-fg transition py-1 focus:outline-none focus:underline"
          aria-label="Back to Welcome Screen"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 bg-sketch-paper border-2 border-sketch-line rounded-sketch-badge shadow-sketch-sm flex items-center justify-center rotate-1 mb-1">
            <UserIcon className="w-7 h-7 text-sketch-accent" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold sketch-heading text-sketch-fg">
            Choose a Username
          </h1>
          <p className="text-lg text-sketch-fg/75">
            Enter a unique username to join
          </p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <SketchInput
              id="username-input"
              label="Username"
              type="text"
              placeholder="Enter username..."
              value={username}
              onChange={handleInputChange}
              disabled={loading}
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!!activeError}
              aria-describedby={activeError ? 'username-error' : undefined}
              className="min-h-[48px] text-lg px-4"
            />

            {/* Error Message */}
            {activeError && (
              <div
                id="username-error"
                role="alert"
                className="mt-1 p-2.5 bg-[#fff1f0] border-2 border-sketch-accent rounded-sketch-badge text-sketch-fg flex items-start gap-2 shadow-sketch-xs"
              >
                <span className="text-sketch-accent font-bold text-base leading-none">!</span>
                <span className="text-sm font-medium text-sketch-accent">{activeError}</span>
              </div>
            )}

            <p className="text-xs text-sketch-fg/60 mt-1">
              Allowed: 3–20 characters, letters, numbers, and underscores.
            </p>
          </div>

          {/* Submit Action */}
          <SketchButton
            type="submit"
            variant="accent"
            disabled={loading}
            className="w-full min-h-[48px] text-xl font-bold py-3 mt-2"
            aria-label={loading ? 'Joining chat...' : 'Join Chat'}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </span>
            ) : (
              'Join Chat'
            )}
          </SketchButton>
        </form>
      </SketchBox>
    </div>
  );
};
