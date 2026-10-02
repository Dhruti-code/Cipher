import React, { useState, useEffect, useCallback } from 'react';
import { User, ConversationWithDetails } from 'chat-app-shared';
import { api } from './services/api';
import { storage } from './services/storage';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { UsernameSetupScreen } from './screens/UsernameSetupScreen';
import { ChatHomeScreen } from './screens/ChatHomeScreen';
import { PersonalChatScreen } from './screens/PersonalChatScreen';
import { SketchBox } from './components/ui/SketchBox';
import { SketchButton } from './components/ui/SketchButton';
import { Loader2, AlertCircle } from 'lucide-react';

export type ScreenState =
  | 'CHECKING_AUTH'
  | 'WELCOME'
  | 'USERNAME_SETUP'
  | 'CHAT_HOME'
  | 'PERSONAL_CHAT';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('CHECKING_AUTH');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationWithDetails | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // ─── Returning User Check ───────────────────────────────────────────────
  const checkStoredUser = useCallback(async () => {
    setInitError(null);
    const stored = storage.getStoredUser();
    if (!stored) {
      setScreen('WELCOME');
      return;
    }
    try {
      const verifiedUser = await api.getUserById(stored.userId);
      setCurrentUser(verifiedUser);
      setScreen('CHAT_HOME');
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg.includes("Couldn't connect") || msg.includes('Failed to fetch')) {
        setInitError("Couldn't connect to the server. Please ensure the server is running and try again.");
      } else {
        console.warn('Stale stored user — clearing local identity.');
        storage.clearStoredUser();
        setCurrentUser(null);
        setScreen('WELCOME');
      }
    }
  }, []);

  useEffect(() => {
    checkStoredUser();
  }, [checkStoredUser]);

  // ─── New User Registration ──────────────────────────────────────────────
  const handleJoin = async (username: string) => {
    setLoading(true);
    setServerError(null);
    try {
      const user = await api.registerUser(username);
      storage.saveUser({ id: user.id, username: user.username });
      setCurrentUser(user);
      setScreen('CHAT_HOME');
    } catch (err) {
      setServerError((err as Error).message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Navigation Handlers ────────────────────────────────────────────────
  const handleOpenConversation = (convo: ConversationWithDetails) => {
    setActiveConversation(convo);
    setScreen('PERSONAL_CHAT');
  };

  const handleBackToHome = () => {
    setActiveConversation(null);
    setScreen('CHAT_HOME');
  };

  const handleLogout = () => {
    storage.clearStoredUser();
    setCurrentUser(null);
    setActiveConversation(null);
    setServerError(null);
    setScreen('WELCOME');
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <main
      className={`min-h-screen bg-sketch-bg text-sketch-fg selection:bg-sketch-muted selection:text-sketch-fg ${screen === 'PERSONAL_CHAT' ? '' : 'flex flex-col justify-center'}`}
    >
      {/* 1. Initial auth check */}
      {screen === 'CHECKING_AUTH' && (
        <div className="flex items-center justify-center p-4">
          <SketchBox variant="paper" className="p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
            {initError ? (
              <>
                <div className="w-12 h-12 bg-red-50 border-2 border-sketch-accent rounded-sketch-badge shadow-sketch-xs flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-sketch-accent" />
                </div>
                <h2 className="text-2xl font-bold sketch-heading text-sketch-fg">Connection Issue</h2>
                <p className="text-base text-sketch-fg/80">{initError}</p>
                <div className="flex flex-col gap-2 w-full mt-2">
                  <SketchButton variant="primary" onClick={checkStoredUser}>
                    Retry Connection
                  </SketchButton>
                  <SketchButton
                    variant="default"
                    onClick={() => {
                      storage.clearStoredUser();
                      setScreen('WELCOME');
                    }}
                  >
                    Start as New User
                  </SketchButton>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-sketch-secondary" />
                <p className="text-xl font-heading font-bold text-sketch-fg">
                  Checking remembered user...
                </p>
                <p className="text-sm text-sketch-fg/60">Restoring your workspace</p>
              </>
            )}
          </SketchBox>
        </div>
      )}

      {/* 2. Welcome Screen */}
      {screen === 'WELCOME' && (
        <WelcomeScreen onGetStarted={() => setScreen('USERNAME_SETUP')} />
      )}

      {/* 3. Username Setup */}
      {screen === 'USERNAME_SETUP' && (
        <UsernameSetupScreen
          onJoin={handleJoin}
          onBack={() => {
            setServerError(null);
            setScreen('WELCOME');
          }}
          loading={loading}
          serverError={serverError}
        />
      )}

      {/* 4. Chat Home */}
      {screen === 'CHAT_HOME' && currentUser && (
        <ChatHomeScreen
          currentUser={currentUser}
          onOpenConversation={handleOpenConversation}
          onLogout={handleLogout}
        />
      )}

      {/* 5. Personal Chat */}
      {screen === 'PERSONAL_CHAT' && currentUser && activeConversation && (
        <PersonalChatScreen
          currentUser={currentUser}
          conversation={activeConversation}
          onBack={handleBackToHome}
        />
      )}
    </main>
  );
};

export default App;
