import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User, ConversationWithDetails } from 'chat-app-shared';
import { api, UserSearchResult } from '../services/api';
import { socketService } from '../services/socket';
import { SketchBox } from '../components/ui/SketchBox';
import { SketchBadge } from '../components/ui/SketchBadge';
import { UserDetailsModal } from '../components/UserDetailsModal';
import { PwaInstallButton } from '../components/PwaInstallButton';
import {
  MessageSquareText,
  Search,
  UserCheck,
  Users,
  LogOut,
  Loader2,
  AlertCircle,
  MessageSquare,
  X,
} from 'lucide-react';

export interface ChatHomeScreenProps {
  currentUser: User;
  onOpenConversation: (convo: ConversationWithDetails) => void;
  onLogout: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export const ChatHomeScreen: React.FC<ChatHomeScreenProps> = ({
  currentUser,
  onOpenConversation,
  onLogout,
}) => {
  // ─── Recent Conversations ─────────────────────────────────────────────
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [convosError, setConvosError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setConvosLoading(true);
    setConvosError(null);
    try {
      const data = await api.getConversations(currentUser.id);
      setConversations(data);
    } catch (err) {
      setConvosError((err as Error).message || 'Failed to load conversations.');
    } finally {
      setConvosLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadConversations();

    socketService.connect(currentUser.id);

    const unsubscribeUnread = socketService.onUnreadUpdate((payload) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId
            ? { ...c, unreadCount: payload.unreadCount }
            : c
        )
      );
    });

    const unsubscribePresence = socketService.onPresenceUpdate((payload) => {
      setOnlinePeers((prev) => ({
        ...prev,
        [payload.userId]: payload.status === 'online',
      }));
    });

    const unsubscribeStatus = socketService.onMessageStatus((payload) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === payload.conversationId && c.lastMessage && c.lastMessage.id === payload.messageId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                deliveryState: payload.status,
              },
            };
          }
          return c;
        })
      );
    });

    const unsubscribeNewMsg = socketService.onNewMessage((newMsg) => {
      setConversations((prev) => {
        const found = prev.find((c) => c.id === newMsg.conversationId);
        if (!found) {
          loadConversations();
          return prev;
        }
        const updated = {
          ...found,
          lastMessage: newMsg,
          updatedAt: newMsg.createdAt,
          unreadCount: newMsg.senderId !== currentUser.id ? found.unreadCount + 1 : found.unreadCount,
        };
        return [updated, ...prev.filter((c) => c.id !== newMsg.conversationId)];
      });
    });

    return () => {
      unsubscribeUnread();
      unsubscribePresence();
      unsubscribeStatus();
      unsubscribeNewMsg();
    };
  }, [currentUser.id, loadConversations]);

  // ─── Live Presence for Conversation Peers ────────────────────────────
  const [onlinePeers, setOnlinePeers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    conversations.forEach((convo) => {
      const peer = convo.participants.find((p) => p.id !== currentUser.id);
      if (peer && onlinePeers[peer.id] === undefined) {
        socketService.getPresence(peer.id).then((status) => {
          setOnlinePeers((prev) => ({
            ...prev,
            [peer.id]: status === 'online',
          }));
        });
      }
    });
  }, [conversations, currentUser.id, onlinePeers]);

  // ─── Search ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchDone, setSearchDone] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(searchQuery.trim(), 250);

  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setSearchError(null);
      setSearchDone(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const results = await api.searchUsers(debouncedQuery, currentUser.id);
        if (!cancelled) {
          setSearchResults(results);
          setSearchDone(true);
        }
      } catch (err) {
        if (!cancelled) {
          setSearchError((err as Error).message || 'Couldn\'t search users. Please try again.');
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery, currentUser.id]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setSearchDone(false);
    searchInputRef.current?.focus();
  };

  // ─── User Details / Start Chat ────────────────────────────────────────
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [startChatLoading, setStartChatLoading] = useState(false);
  const [startChatError, setStartChatError] = useState<string | null>(null);

  const handleSelectUser = (u: UserSearchResult) => {
    setSelectedUser(u);
    setStartChatError(null);
  };

  const handleStartChat = async () => {
    if (!selectedUser) return;
    setStartChatLoading(true);
    setStartChatError(null);
    try {
      const convo = await api.createOrGetConversation(selectedUser.id, currentUser.id);
      setSelectedUser(null);
      clearSearch();
      await loadConversations();
      onOpenConversation(convo);
    } catch (err) {
      setStartChatError((err as Error).message || 'Couldn\'t start this conversation. Please try again.');
    } finally {
      setStartChatLoading(false);
    }
  };


  const showSearchArea = searchQuery.trim().length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 flex flex-col gap-5 relative">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3 border-b-2 border-sketch-line pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-sketch-paper border-2 border-sketch-line rounded-sketch-badge shadow-sketch-sm flex items-center justify-center -rotate-2">
            <MessageSquareText className="w-5 h-5 text-sketch-secondary" strokeWidth={2.2} />
          </div>
          <span className="text-3xl font-bold sketch-heading text-sketch-fg tracking-tight">
            Cipher
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PwaInstallButton />
          <div className="hidden sm:flex items-center gap-1.5 bg-white border-2 border-sketch-line rounded-sketch-badge px-3 py-1.5 shadow-sketch-xs">
            <UserCheck className="w-4 h-4 text-sketch-secondary" />
            <span className="font-heading text-base font-bold text-sketch-fg">
              {currentUser.username}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Switch User"
            aria-label="Switch User or Log Out"
            className="flex items-center gap-1.5 px-3 py-2 bg-sketch-paper border-2 border-sketch-line rounded-sketch-badge shadow-sketch-xs hover:bg-sketch-muted transition active:translate-y-0.5 font-body text-sm font-semibold"
          >
            <LogOut className="w-4 h-4 text-sketch-accent" />
            <span className="hidden sm:inline">Switch</span>
          </button>
        </div>
      </header>

      {/* ── Main Layout (2-col desktop) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">

        {/* ── Left: Search + Recent Chats ────────────────────────────────────── */}
        <div className="md:col-span-2 flex flex-col gap-4">

          {/* Search Input */}
          <div className="relative" role="search">
            <label htmlFor="user-search" className="sr-only">
              Search username
            </label>
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              {searchLoading
                ? <Loader2 className="h-5 w-5 text-sketch-secondary animate-spin" />
                : <Search className="h-5 w-5 text-sketch-fg/50" />
              }
            </div>
            <input
              ref={searchInputRef}
              id="user-search"
              type="text"
              placeholder="Search username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Search username"
              aria-expanded={showSearchArea}
              aria-haspopup="listbox"
              className="sketch-input w-full pl-11 pr-10 py-3 text-base"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sketch-fg/50 hover:text-sketch-fg transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Results Panel */}
          {showSearchArea && (
            <div role="region" aria-label="Search results">
              {searchError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 bg-[#fff1f0] border-2 border-sketch-accent rounded-sketch-input text-sm text-sketch-accent font-medium shadow-sketch-xs"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {searchError}
                </div>
              )}

              {!searchLoading && !searchError && searchDone && searchResults.length === 0 && (
                <div className="py-6 text-center text-sketch-fg/70 sketch-box bg-sketch-paper text-base">
                  No users found for &quot;<strong>{debouncedQuery}</strong>&quot;
                </div>
              )}

              {searchResults.length > 0 && (
                <ul
                  role="listbox"
                  aria-label="User search results"
                  className="flex flex-col gap-1.5"
                >
                  {searchResults.map((u) => (
                    <li key={u.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full text-left flex items-center gap-3 px-4 py-3 bg-white border-2 border-sketch-line rounded-sketch-input shadow-sketch-xs hover:bg-sketch-paper hover:shadow-sketch transition active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-sketch-secondary focus:ring-offset-1"
                        aria-label={`Start chat with ${u.username}`}
                      >
                        <div className="w-9 h-9 flex-shrink-0 bg-sketch-muted border-2 border-sketch-line rounded-sketch-badge flex items-center justify-center">
                          <span className="text-base font-bold sketch-heading text-sketch-fg/70">
                            {u.username[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-lg font-heading font-bold text-sketch-fg">
                          {u.username}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Recent Chats Section */}
          {!showSearchArea && (
            <SketchBox variant="paper" className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between border-b-2 border-sketch-line/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-sketch-secondary" />
                  <h2 className="text-2xl font-bold sketch-heading text-sketch-fg">
                    Recent Chats
                  </h2>
                </div>
                {conversations.length > 0 && (
                  <SketchBadge variant="secondary" className="text-xs">
                    {conversations.length}
                  </SketchBadge>
                )}
              </div>

              {convosLoading && (
                <div className="py-8 flex items-center justify-center gap-2 text-sketch-fg/60">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading chats...</span>
                </div>
              )}

              {convosError && !convosLoading && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 bg-[#fff1f0] border-2 border-sketch-accent rounded-sketch-input text-sm text-sketch-accent font-medium"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {convosError}
                </div>
              )}

              {!convosLoading && !convosError && conversations.length === 0 && (
                <div className="py-12 flex flex-col items-center gap-2.5 text-center text-sketch-fg/70">
                  <div className="w-12 h-12 bg-white border-2 border-sketch-line rounded-sketch-badge shadow-sketch-xs flex items-center justify-center">
                    <MessageSquareText className="w-6 h-6 text-sketch-fg/30" />
                  </div>
                  <p className="text-xl font-bold font-heading text-sketch-fg">
                    No conversations yet
                  </p>
                  <p className="text-base text-sketch-fg/65 max-w-xs">
                    Search for someone above to start a conversation
                  </p>
                </div>
              )}

              {!convosLoading && conversations.length > 0 && (
                <ul className="flex flex-col gap-1.5" aria-label="Recent conversations">
                  {conversations.map((convo) => {
                    const peer = convo.participants.find((p) => p.id !== currentUser.id);
                    const peerName = peer?.username ?? 'Unknown';
                    const isPeerOnline = peer ? !!onlinePeers[peer.id] : false;

                    return (
                      <li key={convo.id}>
                        <button
                          type="button"
                          onClick={() => onOpenConversation(convo)}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 bg-white border-2 border-sketch-line rounded-sketch-input shadow-sketch-xs hover:bg-sketch-paper hover:shadow-sketch transition active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-sketch-secondary focus:ring-offset-1"
                          aria-label={`Open conversation with ${peerName}`}
                        >
                          {/* Initial avatar substitute with live online badge */}
                          <div className="relative w-10 h-10 flex-shrink-0">
                            <div className="w-10 h-10 bg-sketch-muted border-2 border-sketch-line rounded-sketch-badge flex items-center justify-center">
                              <span className="text-base font-bold sketch-heading text-sketch-fg/70">
                                {peerName[0]?.toUpperCase()}
                              </span>
                            </div>
                            {isPeerOnline && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sketch-xs"
                                title={`${peerName} is online`}
                                aria-label={`${peerName} is online`}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-lg font-heading truncate ${convo.unreadCount > 0 ? 'font-black text-sketch-fg' : 'font-bold text-sketch-fg'}`}>
                                {peerName}
                              </p>
                              {convo.unreadCount > 0 && (
                                <span className="w-2 h-2 rounded-full bg-sketch-accent" aria-hidden="true" />
                              )}
                            </div>
                            <p className={`text-sm truncate [overflow-wrap:anywhere] ${convo.unreadCount > 0 ? 'font-bold text-sketch-fg' : 'text-sketch-fg/65'}`}>
                              {convo.lastMessage ? (
                                convo.lastMessage.content
                              ) : (
                                <span className="italic text-sketch-fg/45">New conversation</span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="text-xs text-sketch-fg/40">
                              {new Date(convo.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            {convo.unreadCount > 0 && (
                              <span
                                className="px-2 py-0.5 bg-sketch-accent text-white font-heading font-bold text-xs rounded-full border border-sketch-line shadow-sketch-xs"
                                aria-label={`${convo.unreadCount} unread messages`}
                              >
                                {convo.unreadCount}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SketchBox>
          )}
        </div>

        {/* ── Right: Online Contacts Panel ───────────────────────────────────── */}
        <div>
          <SketchBox variant="white" rotation="right" className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between border-b-2 border-sketch-line/40 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sketch-accent" />
                <h2 className="text-2xl font-bold sketch-heading text-sketch-fg">
                  Online Users
                </h2>
              </div>
              {conversations.filter((c) => {
                const p = c.participants.find((part) => part.id !== currentUser.id);
                return p && onlinePeers[p.id];
              }).length > 0 ? (
                <SketchBadge variant="accent" className="text-xs">
                  {conversations.filter((c) => {
                    const p = c.participants.find((part) => part.id !== currentUser.id);
                    return p && onlinePeers[p.id];
                  }).length} online
                </SketchBadge>
              ) : (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-sketch-muted border border-sketch-line"
                  title="No contacts online"
                />
              )}
            </div>

            {conversations.filter((c) => {
              const p = c.participants.find((part) => part.id !== currentUser.id);
              return p && onlinePeers[p.id];
            }).length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center text-sketch-fg/65">
                <Users className="w-8 h-8 text-sketch-fg/25" />
                <p className="text-lg font-bold font-heading text-sketch-fg">No contacts online</p>
                <p className="text-sm text-sketch-fg/55">When your chat contacts come online, they will appear here.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Online contacts">
                {conversations
                  .filter((c) => {
                    const p = c.participants.find((part) => part.id !== currentUser.id);
                    return p && onlinePeers[p.id];
                  })
                  .map((c) => {
                    const peer = c.participants.find((p) => p.id !== currentUser.id)!;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => onOpenConversation(c)}
                          className="w-full flex items-center justify-between gap-2.5 px-3 py-2 bg-sketch-paper/70 border border-sketch-line rounded-sketch-badge hover:bg-sketch-paper transition text-left active:translate-y-0.5 shadow-sketch-xs"
                          aria-label={`Chat with ${peer.username}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-8 h-8 flex-shrink-0">
                              <div className="w-8 h-8 bg-sketch-muted border border-sketch-line rounded-sketch-badge flex items-center justify-center">
                                <span className="text-sm font-bold sketch-heading text-sketch-fg/70">
                                  {peer.username[0]?.toUpperCase()}
                                </span>
                              </div>
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-white"
                                aria-hidden="true"
                              />
                            </div>
                            <span className="font-heading font-bold text-base text-sketch-fg truncate">
                              {peer.username}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-sketch-secondary underline">Chat</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
          </SketchBox>
        </div>
      </div>

      {/* ── User Details Modal ──────────────────────────────────────────────── */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onStartChat={handleStartChat}
          onClose={() => {
            setSelectedUser(null);
            setStartChatError(null);
          }}
          loading={startChatLoading}
          error={startChatError}
        />
      )}
    </div>
  );
};
