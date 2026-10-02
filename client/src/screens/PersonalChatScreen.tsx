import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, ConversationWithDetails, Message } from 'chat-app-shared';
import { api } from '../services/api';
import { socketService, SocketConnectionState } from '../services/socket';
import { ArrowLeft, Send, MessageSquareDashed, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export interface PersonalChatScreenProps {
  currentUser: User;
  conversation: ConversationWithDetails;
  onBack: () => void;
}

const MAX_MESSAGE_LENGTH = 2000;
const TYPING_INACTIVITY_MS = 1800;
const TYPING_FAILSAFE_MS = 3000;

export const PersonalChatScreen: React.FC<PersonalChatScreenProps> = ({
  currentUser,
  conversation,
  onBack,
}) => {
  const peer = conversation.participants.find((p) => p.id !== currentUser.id);
  const peerName = peer?.username ?? 'Unknown';
  const peerId = peer?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [connState, setConnState] = useState<SocketConnectionState>('connecting');

  // ─── Phase 4 State: Peer Presence & Typing ──────────────────────────────
  const [peerPresence, setPeerPresence] = useState<'online' | 'offline'>('offline');
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);

  const isLocallyTypingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerTypingFailsafeRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Phase 5 State: Last Read Tracking ──────────────────────────────────
  const lastReadMessageIdRef = useRef<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Helper: check if near bottom and mark read if user scrolled to bottom
  const checkIsNearBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceToBottom < 120;
    isNearBottomRef.current = nearBottom;

    // Phase 5: If user scrolled to bottom, mark any unread peer messages as read
    if (nearBottom && messages.length > 0 && peerId) {
      const peerMessages = messages.filter((m) => m.senderId === peerId);
      const latestPeerMsg = peerMessages[peerMessages.length - 1];
      if (latestPeerMsg && latestPeerMsg.id !== lastReadMessageIdRef.current) {
        socketService.markRead(conversation.id, latestPeerMsg.id);
        lastReadMessageIdRef.current = latestPeerMsg.id;
      }
    }
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // ─── Fetch Initial Message History ──────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const history = await api.getConversationMessages(conversation.id, currentUser.id);
      setMessages(history);

      // Phase 5: Mark delivered and read for existing history if near bottom
      if (peerId) {
        const peerMessages = history.filter((m) => m.senderId === peerId);
        if (peerMessages.length > 0) {
          const latestPeerMsg = peerMessages[peerMessages.length - 1];
          // Acknowledge delivery for peer messages
          peerMessages.forEach((m) => {
            if (m.deliveryState !== 'read') {
              socketService.markDelivered(conversation.id, m.id);
            }
          });
          // Mark read through latest message if opening conversation
          socketService.markRead(conversation.id, latestPeerMsg.id);
          lastReadMessageIdRef.current = latestPeerMsg.id;
        }
      }

      setTimeout(() => scrollToBottom('auto'), 50);
    } catch (err) {
      setHistoryError((err as Error).message || 'Failed to load conversation history.');
    } finally {
      setLoadingHistory(false);
    }
  }, [conversation.id, currentUser.id, peerId, scrollToBottom]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ─── Socket Lifecycle, Presence, Typing, Delivery & Read Listeners ──────
  useEffect(() => {
    // 1. Connect socket
    socketService.connect(currentUser.id);

    // 2. Join conversation room
    socketService.joinConversation(conversation.id);

    // 3. Initial Presence Query
    if (peerId) {
      socketService.getPresence(peerId).then((status) => {
        setPeerPresence(status);
      });
    }

    // 4. Connection State Listener
    const unsubscribeConn = socketService.onConnectionChange((state) => {
      setConnState(state);
      if (state === 'connected') {
        if (peerId) {
          socketService.getPresence(peerId).then((status) => {
            setPeerPresence(status);
          });
        }
        // Quietly sync messages on reconnection to catch up on any missed messages
        api.getConversationMessages(conversation.id, currentUser.id).then((history) => {
          setMessages(history);
        }).catch(() => {});
      }
    });

    // 5. Incoming Presence Updates Listener
    const unsubscribePresence = socketService.onPresenceUpdate((payload) => {
      if (payload.userId === peerId) {
        setPeerPresence(payload.status);
      }
    });

    // 6. Incoming Messages Listener
    const unsubscribeMsg = socketService.onNewMessage((newMsg) => {
      if (newMsg.conversationId !== conversation.id) {
        return;
      }

      // If message is from peer:
      if (newMsg.senderId === peerId) {
        // Clear typing indicator
        if (peerTypingFailsafeRef.current) {
          clearTimeout(peerTypingFailsafeRef.current);
          peerTypingFailsafeRef.current = null;
        }
        setIsPeerTyping(false);

        // Phase 5: Acknowledge delivery immediately
        socketService.markDelivered(conversation.id, newMsg.id);

        // Phase 5: If currently viewing / near bottom, also mark as read
        if (isNearBottomRef.current) {
          socketService.markRead(conversation.id, newMsg.id);
          lastReadMessageIdRef.current = newMsg.id;
        }
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg];
      });

      if (isNearBottomRef.current || newMsg.senderId === currentUser.id) {
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    });

    // 7. Incoming Peer Typing Events Listener
    const unsubscribeTyping = socketService.onUserTyping((payload) => {
      if (payload.conversationId !== conversation.id || payload.userId !== peerId) {
        return;
      }

      if (payload.isTyping) {
        setIsPeerTyping(true);
        if (peerTypingFailsafeRef.current) {
          clearTimeout(peerTypingFailsafeRef.current);
        }
        peerTypingFailsafeRef.current = setTimeout(() => {
          setIsPeerTyping(false);
        }, TYPING_FAILSAFE_MS);

        if (isNearBottomRef.current) {
          setTimeout(() => scrollToBottom('smooth'), 50);
        }
      } else {
        if (peerTypingFailsafeRef.current) {
          clearTimeout(peerTypingFailsafeRef.current);
          peerTypingFailsafeRef.current = null;
        }
        setIsPeerTyping(false);
      }
    });

    // 8. Phase 5: Real-Time Message Status Updates Listener (Delivered / Read)
    const unsubscribeStatus = socketService.onMessageStatus((payload) => {
      if (payload.conversationId !== conversation.id) {
        return;
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === payload.messageId) {
            return {
              ...m,
              deliveryState: payload.status,
            };
          }
          return m;
        })
      );
    });

    // 9. Cleanup on unmount or conversation change
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (peerTypingFailsafeRef.current) {
        clearTimeout(peerTypingFailsafeRef.current);
        peerTypingFailsafeRef.current = null;
      }

      if (isLocallyTypingRef.current) {
        socketService.stopTyping(conversation.id);
        isLocallyTypingRef.current = false;
      }

      unsubscribeMsg();
      unsubscribeConn();
      unsubscribePresence();
      unsubscribeTyping();
      unsubscribeStatus();
      socketService.leaveConversation(conversation.id);
    };
  }, [conversation.id, currentUser.id, peerId, scrollToBottom]);

  // ─── Local Typing Input Handler ─────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (sendError) setSendError(null);

    const trimmed = text.trim();

    if (!trimmed) {
      if (isLocallyTypingRef.current) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socketService.stopTyping(conversation.id);
        isLocallyTypingRef.current = false;
      }
      return;
    }

    if (!isLocallyTypingRef.current) {
      socketService.startTyping(conversation.id);
      isLocallyTypingRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(conversation.id);
      isLocallyTypingRef.current = false;
    }, TYPING_INACTIVITY_MS);
  };

  // ─── Send Message Handler ───────────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmed = inputText.trim();
    if (!trimmed || sending) {
      return;
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setSendError(`Message exceeds maximum limit of ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isLocallyTypingRef.current) {
      socketService.stopTyping(conversation.id);
      isLocallyTypingRef.current = false;
    }

    setSending(true);
    setSendError(null);

    try {
      const savedMessage = await socketService.sendMessage(conversation.id, trimmed);

      setMessages((prev) => {
        if (prev.some((m) => m.id === savedMessage.id)) {
          return prev;
        }
        return [...prev, savedMessage];
      });

      setInputText('');
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      setSendError((err as Error).message || "Message couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-sketch-bg select-text">
      {/* ── Top Header Bar ────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-b-2 border-sketch-line shadow-sketch-xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Chat Home"
            className="flex items-center justify-center w-9 h-9 border-2 border-sketch-line rounded-sketch-badge bg-sketch-paper shadow-sketch-xs hover:bg-sketch-muted transition active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-sketch-secondary focus:ring-offset-1"
          >
            <ArrowLeft className="w-5 h-5 text-sketch-fg" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 flex-shrink-0 bg-sketch-muted border-2 border-sketch-line rounded-sketch-badge flex items-center justify-center">
              <span className="text-base font-bold sketch-heading text-sketch-fg/70">
                {peerName[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-xl font-bold sketch-heading text-sketch-fg truncate leading-tight">
                {peerName}
              </h1>

              {/* Peer Presence Indicator */}
              <div className="flex items-center gap-1.5 mt-0.5" aria-label={`Presence: ${peerPresence}`}>
                {peerPresence === 'online' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-body font-semibold text-green-700">
                    <span className="w-2 h-2 rounded-full bg-green-500 border border-green-700 inline-block" aria-hidden="true" />
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-body text-sketch-fg/50">
                    <span className="w-2 h-2 rounded-full bg-sketch-muted border border-sketch-line/50 inline-block" aria-hidden="true" />
                    Offline
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Socket Connection State Badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {connState === 'connected' && (
            <span
              className="inline-flex items-center gap-1 text-xs font-body font-semibold text-green-700 bg-green-50 border border-green-600/40 px-2 py-0.5 rounded-full"
              title="Real-time messaging active"
            >
              <Wifi className="w-3 h-3 text-green-600" />
              <span className="hidden sm:inline">Connected</span>
            </span>
          )}
          {connState === 'connecting' && (
            <span
              className="inline-flex items-center gap-1 text-xs font-body font-semibold text-amber-700 bg-amber-50 border border-amber-500/40 px-2 py-0.5 rounded-full"
              title="Connecting to real-time gateway..."
            >
              <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
              <span className="hidden sm:inline">Connecting...</span>
            </span>
          )}
          {connState === 'disconnected' && (
            <span
              className="inline-flex items-center gap-1 text-xs font-body font-semibold text-red-700 bg-red-50 border border-red-500/40 px-2 py-0.5 rounded-full"
              title="Connection lost. Reconnecting automatically..."
            >
              <WifiOff className="w-3 h-3 text-red-600" />
              <span className="hidden sm:inline">Connection lost</span>
            </span>
          )}
        </div>
      </header>

      {/* ── Scrollable Message History Area ───────────────────────────────── */}
      <main
        ref={scrollContainerRef}
        onScroll={checkIsNearBottom}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        aria-label="Conversation messages"
        aria-live="polite"
      >
        {/* Loading history spinner */}
        {loadingHistory && (
          <div className="flex items-center justify-center gap-2 py-10 text-sketch-fg/60">
            <Loader2 className="w-5 h-5 animate-spin text-sketch-secondary" />
            <span className="font-body text-base">Loading messages...</span>
          </div>
        )}

        {/* History error */}
        {historyError && !loadingHistory && (
          <div className="flex items-center gap-2 p-3 bg-[#fff1f0] border-2 border-sketch-accent rounded-sketch-badge text-sm text-sketch-accent font-medium self-center my-4 shadow-sketch-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{historyError}</span>
            <button
              onClick={loadHistory}
              className="underline font-bold ml-2 hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty conversation placeholder */}
        {!loadingHistory && !historyError && messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2.5 text-sketch-fg/60 select-none py-12">
            <div className="w-14 h-14 bg-white border-2 border-sketch-line rounded-sketch-badge shadow-sketch-sm flex items-center justify-center -rotate-1">
              <MessageSquareDashed className="w-7 h-7 text-sketch-fg/30" strokeWidth={1.8} />
            </div>
            <p className="text-xl font-bold font-heading text-sketch-fg">
              No messages yet
            </p>
            <p className="text-sm text-sketch-fg/65 max-w-xs">
              Say hello to start the conversation with <strong className="text-sketch-fg">{peerName}</strong>!
            </p>
          </div>
        )}

        {/* Message Bubble List */}
        {!loadingHistory &&
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${
                  isMe ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                {/* Wobbly Bubble */}
                <div
                  className={`px-4 py-2.5 border-2 border-sketch-line text-base md:text-lg font-body leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap ${
                    isMe
                      ? 'bg-sketch-paper rounded-sketch-card shadow-sketch-sm text-sketch-fg'
                      : 'bg-white rounded-sketch-card shadow-sketch-sm text-sketch-fg'
                  }`}
                  style={{
                    borderRadius: isMe
                      ? '255px 15px 225px 15px / 15px 225px 15px 255px'
                      : '15px 225px 15px 255px / 225px 15px 255px 15px',
                  }}
                >
                  {msg.content}
                </div>

                {/* Timestamp & Status Indicator (Phase 5) */}
                <div className="flex items-center gap-1.5 mt-1 px-1 select-none">
                  <span className="text-xs text-sketch-fg/50 font-body">
                    {formatTime(msg.createdAt)}
                  </span>

                  {isMe && (
                    <span
                      className="inline-flex items-center text-xs font-bold font-body"
                      aria-label={`Status: ${msg.deliveryState || 'sent'}`}
                      title={`Status: ${msg.deliveryState || 'sent'}`}
                    >
                      {msg.deliveryState === 'read' ? (
                        <span className="text-sketch-secondary inline-flex items-center gap-0.5">
                          <span>✓✓</span>
                          <span className="text-[10px]">Read</span>
                        </span>
                      ) : msg.deliveryState === 'delivered' ? (
                        <span className="text-sketch-fg/60">✓✓</span>
                      ) : (
                        <span className="text-sketch-fg/40">✓</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {/* Typing Indicator Bubble */}
        {isPeerTyping && (
          <div
            role="status"
            aria-live="polite"
            aria-label={`${peerName} is typing`}
            className="self-start flex flex-col max-w-[85%] sm:max-w-[70%] animate-fadeIn"
          >
            <div
              className="px-4 py-2 bg-sketch-paper border-2 border-sketch-line rounded-sketch-card shadow-sketch-xs flex items-center gap-2 text-sketch-fg font-body text-sm select-none"
              style={{
                borderRadius: '15px 225px 15px 255px / 225px 15px 255px 15px',
              }}
            >
              <span className="font-bold text-sketch-fg/80">{peerName} is typing</span>
              <span className="inline-flex items-center gap-1 ml-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-sketch-secondary inline-block animate-bounce [animation-delay:-0.3s] motion-reduce:animate-none" />
                <span className="w-1.5 h-1.5 rounded-full bg-sketch-secondary inline-block animate-bounce [animation-delay:-0.15s] motion-reduce:animate-none" />
                <span className="w-1.5 h-1.5 rounded-full bg-sketch-secondary inline-block animate-bounce motion-reduce:animate-none" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </main>

      {/* ── Fixed Bottom Message Input ────────────────────────────────────── */}
      <footer className="flex-shrink-0 border-t-2 border-sketch-line bg-white px-4 py-3">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex flex-col gap-1.5">
          {sendError && (
            <div
              role="alert"
              className="flex items-center justify-between p-2.5 bg-[#fff1f0] border-2 border-sketch-accent rounded-sketch-input text-xs text-sketch-accent font-medium mb-1 shadow-sketch-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{sendError}</span>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={sending}
                  className="font-bold underline hover:text-red-900 focus:outline-none"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setSendError(null)}
                  className="underline hover:text-red-900 focus:outline-none"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2.5">
            <label htmlFor="chat-message-input" className="sr-only">
              Type a message
            </label>
            <textarea
              id="chat-message-input"
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Type a message..."
              maxLength={MAX_MESSAGE_LENGTH}
              className="sketch-input flex-1 py-2.5 px-4 text-base resize-none min-h-[46px] max-h-32 overflow-y-auto leading-normal"
              aria-label="Type a message"
            />

            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              aria-label={sending ? 'Sending message...' : 'Send message'}
              className="flex items-center justify-center w-12 h-12 border-2 border-sketch-line rounded-sketch-badge bg-sketch-secondary text-white shadow-sketch hover:bg-[#234c85] transition active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-sketch-secondary disabled:active:translate-y-0 flex-shrink-0"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {inputText.length > 1800 && (
            <div className="text-right text-xs text-sketch-fg/50 pr-1">
              {inputText.length} / {MAX_MESSAGE_LENGTH}
            </div>
          )}
        </form>
      </footer>
    </div>
  );
};
