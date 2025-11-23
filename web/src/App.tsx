import { useEffect, useMemo, useState ,useRef,useLayoutEffect} from "react";
import { Layout, Typography, message as antdMessage, Badge, Space, Tag } from "antd";
import { v4 as uuid } from "uuid";
import { ChatInput } from "./components/ChatInput";
import { MessageRenderer } from "./components/MessageRenderer";
import { SessionList } from "./components/SessionList";
import type { ConnectionStatus, Message, Session } from "./types/messages";
import { useAgentStream } from "./hooks/useAgentStream";
import "./App.css";

const { Header, Content, Sider } = Layout;

const STORAGE_KEY = "research-assistant-sessions";
const LABEL_NEW_SESSION = "\u65b0\u4f1a\u8bdd";
const LABEL_GENERATING = "\u751f\u6210\u4e2d";
const LABEL_RECONNECTING = "\u91cd\u8fde\u4e2d";
const LABEL_ERROR = "\u8fde\u63a5\u5f02\u5e38";
const LABEL_IDLE = "\u7a7a\u95f2";
const LABEL_PAUSED = "\u5df2\u6682\u505c";
const LABEL_HEADER = "AI深度研究助手";
const FOOTER_HINT =
  "\u652f\u6301 Markdown\uff0c\u65ad\u7ebf\u81ea\u52a8\u91cd\u8fde\uff0c\u5de5\u5177\u8c03\u7528\u53ef\u6298\u53e0\u67e5\u770b\u3002";

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: Session[] = JSON.parse(raw);
      // 读取历史消息时，确保不再使用流式打字效果
      return parsed.map((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.type === "text" ? { ...m, streaming: false } : m
        ),
      }));
    }
  } catch {
    /* ignore */
  }
  return [
    {
      id: uuid(),
      title: LABEL_NEW_SESSION,
      createdAt: Date.now(),
      messages: [],
    },
  ];
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeId, setActiveId] = useState<string>(sessions[0]?.id ?? "");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0],
    [sessions, activeId]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const appendMessage = (msg: Message) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession?.id) return s;
        const existingIdx = s.messages.findIndex((m) => m.id === msg.id);
        let newMessages = s.messages.slice();
        if (existingIdx >= 0 && msg.type === "text" && msg.streaming) {
          const existing = newMessages[existingIdx] as Extract<Message, { type: "text" }>;
          newMessages[existingIdx] = {
            ...existing,
            content: existing.content + msg.content,
            streaming: msg.streaming,
          };
        } else if (existingIdx >= 0) {
          newMessages[existingIdx] = msg;
        } else {
          newMessages = [...newMessages, msg];
        }
        return { ...s, messages: newMessages };
      })
    );
  };

  const updateUserMessage = (text: string) => {
    const userMsg: Message = { id: uuid(), type: "text", role: "user", content: text };
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession?.id ? { ...s, messages: [...s.messages, userMsg] } : s
      )
    );
    stream.start(text);
  };

  const stream = useAgentStream({
    sessionId: activeSession?.id ?? "default",
    onMessage: appendMessage,
    onDone: () => {
      // 将最后的流式消息标记为已完成，避免历史记录再次打字机渲染
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSession?.id) return s;
          if (!s.messages.length) return s;
          const lastIdx = s.messages.length - 1;
          const last = s.messages[lastIdx];
          if (last.type === "text" && last.streaming) {
            const updated = s.messages.slice();
            updated[lastIdx] = { ...last, streaming: false };
            return { ...s, messages: updated };
          }
          return s;
        })
      );
    },
  });

  useLayoutEffect(()=>{
    const el=messagesRef.current;
    if(!el)return;
    const scrollToBottom=()=>{
      el.scrollTop=el.scrollHeight;
    }
    requestAnimationFrame(scrollToBottom)
    setTimeout(scrollToBottom,0)
  },[activeSession?.messages,stream.status])

  const onDecision = async (actionId: string, decision: "approve" | "reject") => {
    const res = await fetch(
      `${(import.meta.env.VITE_API_BASE ?? "http://localhost:3001").replace(/\/$/, "")}/api/hil`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, decision }),
      }
    );
    if (!res.ok) antdMessage.error("\u53d1\u9001\u5ba1\u6279\u5931\u8d25");
  };

  const handleResend = (text: string) => updateUserMessage(text);
  const handleRetry = (message: Message) => {
    if (message.type === "text") updateUserMessage(message.content);
  };

  const createSession = () => {
    const s: Session = {
      id: uuid(),
      title: LABEL_NEW_SESSION,
      createdAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  };

  const setTitleFromPrompt = (prompt: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession?.id ? { ...s, title: prompt.slice(0, 24) } : s))
    );
  };

  const renderStatusTag = () => {
    switch (stream.status) {
      case "streaming":
        return (
          <Tag color="green" style={{ marginLeft: 8 }}>
            {LABEL_GENERATING}
          </Tag>
        );
      case "reconnecting":
        return (
          <Tag color="orange" style={{ marginLeft: 8 }}>
            {LABEL_RECONNECTING}
          </Tag>
        );
      case "error":
        return (
          <Tag color="red" style={{ marginLeft: 8 }}>
            {LABEL_ERROR}
          </Tag>
        );
      case "paused":
        return (
          <Tag color="blue" style={{ marginLeft: 8 }}>
            {LABEL_PAUSED}
          </Tag>
        );
      default:
        return null;
    }
  };

  const badgeTextMap: Record<ConnectionStatus, string> = {
    idle: LABEL_IDLE,
    streaming: LABEL_GENERATING,
    reconnecting: LABEL_RECONNECTING,
    error: LABEL_ERROR,
    paused: LABEL_PAUSED,
  };

  return (
    <Layout className="layout">
      <Sider width={260} theme="light" className="sider">
        <SessionList
          sessions={sessions}
          activeId={activeSession?.id ?? ""}
          onCreate={createSession}
          onSelect={(id) => {
            stream.close("idle");
            setActiveId(id);
          }}
        />
      </Sider>
      <Layout>
        <Header className="header">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }} className="brand-title" >
              {LABEL_HEADER}
              {renderStatusTag()}
            </Typography.Title>
            
          </div>
          <Badge
            status={
              stream.status === "streaming"
                ? "processing"
                : stream.status === "reconnecting"
                ? "warning"
                : stream.status === "error"
                ? "error"
                : "default"
            }
            text={badgeTextMap[stream.status]}
          />
        </Header>
        <Content className="content">
          <div className="content-inner">
            <div className="messages" ref={messagesRef} >
              {activeSession?.messages.map((m) => (
                <MessageRenderer
                  key={m.id}
                  message={m}
                  onResend={(text) => {
                    setTitleFromPrompt(text);
                    handleResend(text);
                  }}
                  onRetry={handleRetry}
                  onDecision={onDecision}
                />
              ))}
            </div>
            <div className="input-bar">
              <Space orientation="vertical" style={{ width: "100%" }}>
                <ChatInput
                  onSend={(text) => {
                    setTitleFromPrompt(text);
                    updateUserMessage(text);
                  }}
                  isStreaming={stream.status === "streaming"}
                  onPause={stream.pause}
                />
                <Typography.Text type="secondary">
                  {FOOTER_HINT}
                </Typography.Text>
              </Space>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
