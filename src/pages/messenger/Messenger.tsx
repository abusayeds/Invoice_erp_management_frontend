/**
 * File: src/pages/messenger/Messenger.tsx
 * Messenger — exact match for all 4 screenshots:
 *
 * Layout: full-height, no scroll on outer wrapper
 *   Left sidebar (290px):
 *     - "Conversations" header with green chat bubble icon
 *     - All Users | Favorites tab toggle (green active)
 *     - Search users... input
 *     - Conversation list: avatar (circle photo) | name + time | last-message preview + unread badge
 *     - Empty Favorites: user icon + "No users found" + "Try adjusting your search"
 *
 *   Right panel:
 *     - Empty state: centered chat bubble + "Select a conversation" + subtitle
 *     - Active conversation:
 *         Header: avatar + name + "Offline" status (below name)
 *         Messages area: received (left, white border card) | sent (right, green bubble)
 *         Each message has text + time + tick(s) for sent
 *         Input bar: "Type a message..." | emoji icon | paperclip | green send arrow
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Globe,
  MessageCircle,
  Search,
  Smile,
  Paperclip,
  Send,
  User,
  Check,
  CheckCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  text: string;
  time: string;
  sent: boolean; // true = me (right/green), false = them (left/white)
  read?: boolean;
}

interface Conversation {
  id: number;
  name: string;
  avatar: string; // emoji placeholder color
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  isFavorite: boolean;
  messages: Message[];
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#2dd4bf",
  "#818cf8",
  "#4ade80",
];

const conversations: Conversation[] = [
  {
    id: 1,
    name: "Jennifer Martinez",
    avatar: AVATAR_COLORS[0],
    initials: "JM",
    lastMessage: "Definitely! Drinks a...",
    time: "01:18 PM",
    unread: 0,
    online: true,
    isFavorite: true,
    messages: [
      {
        id: 1,
        text: "Hey Jennifer! Are you coming to the team lunch today?",
        time: "01:10 PM",
        sent: true,
        read: true,
      },
      {
        id: 2,
        text: "Of course! What time does it start?",
        time: "01:12 PM",
        sent: false,
      },
      {
        id: 3,
        text: "It starts at 1 PM at the usual place.",
        time: "01:14 PM",
        sent: true,
        read: true,
      },
      {
        id: 4,
        text: "Definitely! Drinks are on me this time 🎉",
        time: "01:18 PM",
        sent: false,
      },
    ],
  },
  {
    id: 2,
    name: "Lisa Anderson",
    avatar: AVATAR_COLORS[1],
    initials: "LA",
    lastMessage: "Perfect, sending it ...",
    time: "01:54 PM",
    unread: 0,
    online: false,
    isFavorite: false,
    messages: [
      {
        id: 1,
        text: "Hi Lisa, did you get a chance to review the proposal?",
        time: "01:45 PM",
        sent: true,
        read: true,
      },
      {
        id: 2,
        text: "Yes, it looks great! Just a few minor edits.",
        time: "01:49 PM",
        sent: false,
      },
      {
        id: 3,
        text: "Can you send them over?",
        time: "01:51 PM",
        sent: true,
        read: true,
      },
      {
        id: 4,
        text: "Perfect, sending it over now!",
        time: "01:54 PM",
        sent: false,
      },
    ],
  },
  {
    id: 3,
    name: "Maria Rodriguez",
    avatar: AVATAR_COLORS[2],
    initials: "MR",
    lastMessage: "Perfect, I'll call y...",
    time: "01:30 PM",
    unread: 0,
    online: false,
    isFavorite: true,
    messages: [
      {
        id: 1,
        text: "Hey, are you free for a quick call?",
        time: "12:30 PM",
        sent: true,
        read: true,
      },
      { id: 2, text: "Sure! What's it about?", time: "12:36 PM", sent: false },
      {
        id: 3,
        text: "Need to discuss the timeline for the new feature.",
        time: "12:38 PM",
        sent: true,
        read: true,
      },
      {
        id: 4,
        text: "Ah yes, I was thinking about that too.",
        time: "12:42 PM",
        sent: false,
      },
      {
        id: 5,
        text: "Haha exactly! Give me 5 minutes?",
        time: "01:10 PM",
        sent: false,
      },
      {
        id: 6,
        text: "Great minds think alike! 😄",
        time: "01:22 PM",
        sent: true,
        read: true,
      },
      {
        id: 7,
        text: "Perfect, I'll call you then.",
        time: "01:30 PM",
        sent: true,
        read: false,
      },
    ],
  },
  {
    id: 4,
    name: "Emily Davis",
    avatar: AVATAR_COLORS[3],
    initials: "ED",
    lastMessage: "Perfect, appreciate ...",
    time: "01:30 PM",
    unread: 1,
    online: true,
    isFavorite: false,
    messages: [
      {
        id: 1,
        text: "Emily, the client loved the presentation!",
        time: "01:20 PM",
        sent: true,
        read: true,
      },
      { id: 2, text: "That's amazing news! 🙌", time: "01:25 PM", sent: false },
      {
        id: 3,
        text: "They want to schedule a follow-up next week.",
        time: "01:28 PM",
        sent: true,
        read: true,
      },
      {
        id: 4,
        text: "Perfect, appreciate the update!",
        time: "01:30 PM",
        sent: false,
      },
    ],
  },
  {
    id: 5,
    name: "John Smith",
    avatar: AVATAR_COLORS[4],
    initials: "JS",
    lastMessage: "Actually, yes. Could...",
    time: "01:26 PM",
    unread: 1,
    online: false,
    isFavorite: false,
    messages: [
      {
        id: 1,
        text: "John, are you free for the 3 PM meeting?",
        time: "01:15 PM",
        sent: true,
        read: true,
      },
      {
        id: 2,
        text: "I might be a few minutes late.",
        time: "01:20 PM",
        sent: false,
      },
      {
        id: 3,
        text: "No problem. Can you dial in from your phone?",
        time: "01:22 PM",
        sent: true,
        read: true,
      },
      {
        id: 4,
        text: "Actually, yes. Could you send me the link?",
        time: "01:26 PM",
        sent: false,
      },
    ],
  },
  {
    id: 6,
    name: "James Garcia",
    avatar: AVATAR_COLORS[5],
    initials: "JG",
    lastMessage: "Thanks, no rush but ...",
    time: "01:10 PM",
    unread: 1,
    online: true,
    isFavorite: false,
    messages: [
      {
        id: 1,
        text: "Hey James, did you finish the report?",
        time: "01:00 PM",
        sent: true,
        read: true,
      },
      {
        id: 2,
        text: "Almost done, just need to add the charts.",
        time: "01:05 PM",
        sent: false,
      },
      {
        id: 3,
        text: "Take your time, no rush!",
        time: "01:08 PM",
        sent: true,
        read: true,
      },
      {
        id: 4,
        text: "Thanks, no rush but will have it by EOD!",
        time: "01:10 PM",
        sent: false,
      },
    ],
  },
  {
    id: 7,
    name: "David Wilson",
    avatar: AVATAR_COLORS[6],
    initials: "DW",
    lastMessage: "Great minds think al...",
    time: "01:18 PM",
    unread: 0,
    online: true,
    isFavorite: true,
    messages: [
      {
        id: 1,
        text: "David, I was just thinking about the new project!",
        time: "01:10 PM",
        sent: true,
        read: true,
      },
      {
        id: 2,
        text: "Same here, we should sync up today.",
        time: "01:14 PM",
        sent: false,
      },
      {
        id: 3,
        text: "Great minds think alike! 😄",
        time: "01:18 PM",
        sent: true,
        read: true,
      },
    ],
  },
  {
    id: 8,
    name: "Sarah Johnson",
    avatar: AVATAR_COLORS[7],
    initials: "SJ",
    lastMessage: "Perfect. I'll send t...",
    time: "01:14 PM",
    unread: 0,
    online: false,
    isFavorite: false,
    messages: [
      {
        id: 1,
        text: "Sarah, the client needs the contract by Friday.",
        time: "01:05 PM",
        sent: true,
        read: true,
      },
      {
        id: 2,
        text: "Got it, I'll prepare it right away.",
        time: "01:09 PM",
        sent: false,
      },
      {
        id: 3,
        text: "Thanks! Please CC me when you send it.",
        time: "01:12 PM",
        sent: true,
        read: true,
      },
      {
        id: 4,
        text: "Perfect. I'll send the draft first for your review.",
        time: "01:14 PM",
        sent: false,
      },
    ],
  },
  {
    id: 9,
    name: "Robert Taylor",
    avatar: AVATAR_COLORS[8],
    initials: "RT",
    lastMessage: "Perfect. I'll send t...",
    time: "01:06 PM",
    unread: 1,
    online: false,
    isFavorite: false,
    messages: [
      {
        id: 1,
        text: "Robert, did you check the server logs?",
        time: "12:55 PM",
        sent: true,
        read: true,
      },
      {
        id: 2,
        text: "Yes, found the issue. It's a memory leak.",
        time: "01:00 PM",
        sent: false,
      },
      {
        id: 3,
        text: "Can you prepare a fix for today?",
        time: "01:03 PM",
        sent: true,
        read: true,
      },
      {
        id: 4,
        text: "Perfect. I'll send the patch by 3 PM.",
        time: "01:06 PM",
        sent: false,
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncate = (s: string, n = 22) =>
  s.length > n ? s.slice(0, n) + "..." : s;

// Avatar circle with colored background + initials
const AvatarCircle: React.FC<{
  conv: Conversation;
  size?: number;
  showOnline?: boolean;
}> = ({ conv, size = 42, showOnline = false }) => (
  <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
    <div
      className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold select-none"
      style={{ backgroundColor: conv.avatar, fontSize: size * 0.35 }}
    >
      {conv.initials}
    </div>
    {showOnline && conv.online && (
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const Messenger: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [search, setSearch] = useState("");
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [convMessages, setConvMessages] = useState<Record<number, Message[]>>(
    () => Object.fromEntries(conversations.map((c) => [c.id, c.messages])),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv =
    activeConvId !== null
      ? (conversations.find((c) => c.id === activeConvId) ?? null)
      : null;
  const messages =
    activeConvId !== null ? (convMessages[activeConvId] ?? []) : [];

  // Filter conversations
  const filtered = conversations.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "all" || c.isFavorite;
    return matchSearch && matchTab;
  });

  // Scroll to bottom when conversation changes or new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConvId, convMessages]);

  const sendMessage = () => {
    if (!inputText.trim() || activeConvId === null) return;
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const newMsg: Message = {
      id: Date.now(),
      text: inputText.trim(),
      time,
      sent: true,
      read: false,
    };
    setConvMessages((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), newMsg],
    }));
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FAFBFC]">
      {/* Breadcrumb header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer">Dashboard</span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">Messenger</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
          <Globe className="w-4 h-4" />
          <span>en English</span>
        </div>
      </div>

      {/* Page title */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Messenger</h1>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex p-4 gap-4">
        {/* ── Left Sidebar ── */}
        <div className="w-72 flex-shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 flex items-center gap-2 border-b border-gray-100">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold text-gray-900">
              Conversations
            </span>
          </div>

          {/* Tabs */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setActiveTab("favorites")}
                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "favorites"
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Favorites
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
              <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">
                  No users found
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try adjusting your search
                </p>
              </div>
            ) : (
              filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-l-4 ${
                    activeConvId === conv.id
                      ? "bg-gray-50 border-l-emerald-500"
                      : "border-l-transparent hover:bg-gray-50"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <AvatarCircle conv={conv} size={40} />
                    {conv.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {conv.name}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        <span className="text-[11px] text-gray-400">
                          {conv.time}
                        </span>
                        {conv.unread > 0 && (
                          <span className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
          {activeConv === null ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-9 h-9 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Select a conversation
              </h3>
              <p className="text-sm text-gray-400">
                Choose a user from the list to start messaging
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 flex-shrink-0">
                <div className="relative">
                  <AvatarCircle conv={activeConv} size={42} />
                  {activeConv.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {activeConv.name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeConv.online ? "Online" : "Offline"}
                  </p>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-sm xl:max-w-md rounded-2xl px-4 py-2.5 ${
                        msg.sent
                          ? "bg-emerald-500 text-white rounded-br-md"
                          : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 ${msg.sent ? "text-emerald-100" : "text-gray-400"}`}
                      >
                        <span className="text-[11px]">{msg.time}</span>
                        {msg.sent &&
                          (msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim()}
                    className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messenger;
