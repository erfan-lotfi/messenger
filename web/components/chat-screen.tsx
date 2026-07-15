'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  getConversations,
  getMe,
  getMessages,
  logout,
  openConversationByUsername,
  sendTextMessage,
  uploadMedia,
} from '@/lib/api';
import { MediaAttachment } from '@/components/media-attachment';
import { getStoredAuth, setStoredAuth } from '@/lib/storage';
import { Conversation, Message } from '@/lib/types';
import { useRouter } from 'next/navigation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function ChatScreen() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loadingOpenChat, setLoadingOpenChat] = useState(false);
  const [sending, setSending] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    type: 'image' | 'video';
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const selectedConversationIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const selectConversation = useCallback(
    async (conversationId: number) => {
      if (isMobile) setMobileView('chat');
      selectedConversationIdRef.current = conversationId;
      setSelectedConversationId(conversationId);
      setError('');

      const nextMessages = await getMessages(conversationId);
      setMessages(nextMessages);

      socketRef.current?.emit('chat:join', { conversationId });
    },
    [isMobile],
  );

  const bootstrap = useCallback(async () => {
    try {
      const [me, conversationList] = await Promise.all([
        getMe(),
        getConversations(),
      ]);

      setUsername(me.username);
      setConversations(conversationList);

      if (conversationList.length > 0)
        await selectConversation(conversationList[0].id);
    } catch {
      setStoredAuth(null);
      router.replace('/login');
    } finally {
      setReady(true);
    }
  }, [router, selectConversation]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      router.replace('/login');
      return;
    }

    const socket = io(API_BASE_URL, {
      auth: { token: auth.accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('message:new', (message: Message) => {
      setMessages((current) => {
        if (selectedConversationIdRef.current === null) return current;
        const alreadyExists = current.some((m) => m.id === message.id);
        if (alreadyExists) return current;
        return [...current, message];
      });
    });

    void bootstrap();
    return () => socket.disconnect();
  }, [bootstrap, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleOpenChat() {
    if (!searchUsername.trim()) return;
    setLoadingOpenChat(true);
    setError('');
    try {
      const conversation = await openConversationByUsername(
        searchUsername.trim(),
      );
      setConversations((current) => {
        const exists = current.find((c) => c.id === conversation.id);
        return exists ? current : [conversation, ...current];
      });
      await selectConversation(conversation.id);
      setSearchUsername('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open chat.');
    } finally {
      setLoadingOpenChat(false);
    }
  }

  async function handleSendMessage() {
    if (!selectedConversationId) return;
    if (!messageText.trim() && !pendingFile) return;

    setSending(true);
    setError('');

    try {
      if (pendingFile) {
        await uploadMedia(selectedConversationId, messageText, pendingFile);
        setPendingFile(null);
      } else {
        await sendTextMessage(selectedConversationId, messageText.trim());
      }
      setMessageText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send.');
    } finally {
      setSending(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setStoredAuth(null);
      router.replace('/login');
    }
  }

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  if (!ready) return <CenteredLabel label="Loading chat..." />;

  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
        overflow: 'hidden',
        background: '#000',
        fontFamily: 'sans-serif',
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          display: isMobile && mobileView === 'chat' ? 'none' : 'grid',
          gridTemplateRows: 'auto auto 1fr auto',
          borderRight: '1px solid #242f3d',
          background: '#17212b',
          padding: '12px 0',
          gap: 12,
          overflow: 'hidden',
        }}
      >
        {/* Account info */}
        <div style={{ padding: '0 16px' }}>
          <div
            style={{
              fontSize: 11,
              color: '#6c7883',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            My Account
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>
            @{username}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px', display: 'grid', gap: 8 }}>
          <input
            placeholder="Search"
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            style={{
              ...inputStyle,
              background: '#242f3d',
              border: 'none',
              padding: '8px 12px',
              fontSize: 14,
            }}
          />
          {searchUsername && (
            <button
              onClick={handleOpenChat}
              style={{ ...buttonStyle, padding: '8px', fontSize: 13 }}
              disabled={loadingOpenChat}
            >
              {loadingOpenChat ? '...' : 'Open chat'}
            </button>
          )}
        </div>

        {/* Conversation list */}
        <div
          style={{
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {conversations.map((conversation) => {
            const otherMember = conversation.members.find(
              (m) => m.user.username !== username,
            );
            const isSelected = conversation.id === selectedConversationId;
            const displayName = otherMember?.user.username ?? 'unknown';

            return (
              <button
                key={conversation.id}
                onClick={() => void selectConversation(conversation.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                  padding: '10px 16px',
                  border: 'none',
                  background: isSelected ? '#2b5278' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#202b36';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: isSelected ? '#5288c1' : '#3d6a97',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 600,
                    flexShrink: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  {displayName.charAt(0)}
                </div>

                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {displayName}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: isSelected ? '#8db1d5' : '#6c7883',
                      }}
                    >
                      12:00
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: isSelected ? '#c2d9ee' : '#7f91a4',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Click to view messages...
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div style={{ padding: '0 16px' }}>
          <button
            onClick={() => void handleLogout()}
            style={{
              ...buttonStyle,
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef4444',
              width: '100%',
              padding: '8px',
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ── Chat area ── */}
      <section
        style={{
          display: isMobile && mobileView === 'list' ? 'none' : 'grid',
          gridTemplateRows: 'auto 1fr auto',
          background: '#000',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <header
          style={{
            borderBottom: '1px solid #374151',
            padding: 16,
            background: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {isMobile && (
            <button
              onClick={() => setMobileView('list')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 18,
              }}
            >
              ←
            </button>
          )}
          <strong style={{ color: '#fff' }}>
            {selectedConversation
              ? `@${
                  selectedConversation.members.find(
                    (m) => m.user.username !== username,
                  )?.user.username ?? 'chat'
                }`
              : 'Open a chat'}
          </strong>
        </header>

        {/* Messages */}
        <div
          style={{
            padding: 16,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            background: '#0f172a',
          }}
        >
          {messages.map((message, index) => {
            const own = message.sender.username === username;
            const isLast = index === messages.length - 1;
            return (
              <div
                key={message.id}
                style={{
                  alignSelf: own ? 'flex-end' : 'flex-start',
                  maxWidth: isMobile ? '90%' : '75%',
                  background: own ? '#2563eb' : '#1f2937',
                  borderRadius: 14,
                  padding: 11,
                  color: '#fff',
                  wordBreak: 'break-word',
                  height: 'fit-content',
                  marginBottom: isLast ? 0 : 12,
                }}
              >
                {message.text && (
                  <div style={{ marginBottom: message.attachment ? 8 : 0 }}>
                    {message.text}
                  </div>
                )}
                {message.attachment && (
                  <MediaAttachment
                    mimeType={message.attachment.mimeType}
                    path={message.attachment.publicUrl}
                    onOpen={(url) =>
                      setLightboxMedia({
                        url,
                        type: message.attachment!.mimeType.startsWith('image/')
                          ? 'image'
                          : 'video',
                      })
                    }
                  />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid #374151',
            padding: 10,
            background: '#111827',
            display: 'grid',
            gap: 15,
          }}
        >
          {error && <div style={{ color: '#fca5a5' }}>{error}</div>}
          {pendingFile && (
            <div style={{ color: '#9ca3af' }}>
              Selected file: {pendingFile.name}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 12,
            }}
          >
            <div
              style={{
                position: 'relative',
              }}
            >
              <textarea
                placeholder="Type a message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                style={{
                  ...inputStyle,
                  minHeight: isMobile ? 52 : 54,
                  maxHeight: isMobile ? 52 : 54,
                  resize: 'none',
                  paddingRight: isMobile ? 98 : 118,
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <label
                  style={{
                    ...buttonStyle,
                    display: 'grid',
                    placeItems: 'center',
                    minHeight: isMobile ? 28 : 34,
                    maxHeight: isMobile ? 28 : 34,
                    minWidth: isMobile ? 28 : 34,
                    width: isMobile ? 28 : 34,
                    borderRadius: 999,
                    padding: 0,
                    fontSize: isMobile ? 14 : 16,
                    background: '#1f2937',
                    color: '#d1d5db',
                    flexShrink: 0,
                  }}
                >
                  ＋
                  <input
                    type="file"
                    hidden
                    accept="image/*,video/*"
                    onChange={(e) =>
                      setPendingFile(e.target.files?.[0] ?? null)
                    }
                  />
                </label>

                <button
                  onClick={() => void handleSendMessage()}
                  disabled={sending}
                  style={{
                    ...buttonStyle,
                    minHeight: isMobile ? 28 : 34,
                    maxHeight: isMobile ? 28 : 34,
                    minWidth: isMobile ? 28 : 34,
                    width: isMobile ? 28 : 34,
                    borderRadius: 999,
                    padding: 0,
                    fontSize: isMobile ? 13 : 16,
                    background: '#2563eb',
                    flexShrink: 0,
                  }}
                >
                  {sending ? '…' : '➤'}
                </button>
              </div>
            </div>
          </div>
        </footer>
      </section>

      {/* ── Lightbox ── */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
          }}
        >
          {lightboxMedia.type === 'image' ? (
            <img
              src={lightboxMedia.url}
              alt=""
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
          ) : (
            <video
              src={lightboxMedia.url}
              controls
              autoPlay
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                borderRadius: 8,
              }}
            />
          )}
        </div>
      )}
    </main>
  );
}

function CenteredLabel({ label }: { label: string }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div>{label}</div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #374151',
  background: '#0f172a',
  color: '#f9fafb',
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};
