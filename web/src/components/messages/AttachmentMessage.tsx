import React from "react";
import { Card, Button, Space, Typography } from "antd";
import { DownloadOutlined, FileTextOutlined, LinkOutlined } from "@ant-design/icons";
import type { Message } from "../../types/messages";

type Props = {
  message: Extract<Message, { type: "attachment" }>;
};

export const AttachmentMessage: React.FC<Props> = ({ message }) => {
  const downloadUrl = message.meta.url;

  return (
    <Card size="small" className="message attachment-message" title="报告附件">
      <div className="attachment-row">
        <div className="attachment-info">
          <div className="attachment-name">
            <FileTextOutlined style={{ marginRight: 6 }} />
            {message.meta.name}
          </div>
          <div className="attachment-desc">{message.content || "报告已生成，可下载查看。"}</div>
          <Typography.Link
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="attachment-link"
          >
            可下载链接
          </Typography.Link>
        </div>
        <Space>
          <Button icon={<LinkOutlined />} href={downloadUrl} target="_blank" rel="noreferrer">
            在线查看
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} href={downloadUrl} download={message.meta.name}>
            下载
          </Button>
        </Space>
      </div>
    </Card>
  );
};
