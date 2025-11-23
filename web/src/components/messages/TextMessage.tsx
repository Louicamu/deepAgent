import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Message } from "../../types/messages";
import { Tag } from "antd";

type Props = {
  message: Extract<Message, { type: "text" }>;
  actions?: React.ReactNode;
};

export const TextMessage: React.FC<Props> = ({ message, actions }) => {
  const [displayedContent, setDisplayedContent] = useState(
    message.streaming ? "" : message.content
  );

  const roleColor =
    message.role === "user" ? "blue" : message.role === "system" ? "purple" : "green";

  // Reset when a new message id arrives
  useEffect(() => {
    setDisplayedContent(message.streaming ? "" : message.content);
  }, [message.id, message.streaming, message.content]);

  // Typewriter effect while streaming chunks arrive
  useEffect(() => {
    if (!message.streaming) {
      setDisplayedContent(message.content);
      return;
    }
    const target = message.content;
    let i = displayedContent.length;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      i = Math.min(i + 2, target.length);
      setDisplayedContent(target.slice(0, i));
      if (i < target.length) {
        setTimeout(tick, 14);
      }
    };

    if (i < target.length) tick();

    return () => {
      cancelled = true;
    };
  }, [message.content, message.streaming]);

  return (
    <div className="message text-message">
      <div className="message-header">
        <Tag color={roleColor}>{message.role.toUpperCase()}</Tag>
        {actions && <div className="message-inline-actions">{actions}</div>}
        {message.streaming && <span className="streaming-dot">···</span>}
      </div>
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {displayedContent}
        </ReactMarkdown>
        {message.streaming && <span className="type-caret" />}
      </div>
    </div>
  );
};
