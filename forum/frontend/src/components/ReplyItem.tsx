import React from 'react'
import { Button, Input, Space, Image, List } from 'antd'
import { LikeOutlined, DislikeOutlined } from '@ant-design/icons'
import { getFileUrl } from '../utils/api'

interface Reply {
  id: number
  content: string
  author_name: string
  created_at: string
  like_count: number
  dislike_count: number
  parent_id: number | null
  images?: { id: number; image_path: string }[]
  attachments?: { id: number; original_name: string; filename: string }[]
}

interface ReplyItemProps {
  reply: Reply
  childReplies: Reply[]
  replyingTo: number | null
  nestedReplyContent: string
  setNestedReplyContent: (value: string) => void
  setReplyingTo: (value: number | null) => void
  onReplyLike: (replyId: number, type: 'like' | 'dislike') => void
  onNestedReply: (parentReplyId: number) => void
  replyLikeTypes: { [key: number]: 'like' | 'dislike' | null }
  depth: number
}

const ReplyItem: React.FC<ReplyItemProps> = ({
  reply,
  childReplies,
  replyingTo,
  nestedReplyContent,
  setNestedReplyContent,
  setReplyingTo,
  onReplyLike,
  onNestedReply,
  replyLikeTypes,
  depth
}) => {
  const isReplying = replyingTo === reply.id

  return (
    <div style={{ 
      marginLeft: depth > 0 ? 40 : 0, 
      marginTop: depth > 0 ? 12 : 0, 
      padding: depth > 0 ? '12px' : 0, 
      backgroundColor: depth > 0 ? '#f5f5f5' : 'transparent', 
      borderRadius: 4 
    }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 'bold' }}>{reply.author_name}</span>
        <span style={{ marginLeft: 16, color: '#999', fontSize: depth > 0 ? 12 : 14 }}>
          {new Date(reply.created_at).toLocaleString('zh-CN')}
        </span>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{reply.content}</div>
      
      {reply.images && reply.images.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Image.PreviewGroup>
            {reply.images.map((image) => (
              <Image
                key={image.id}
                src={getFileUrl(image.image_path)}
                width={150}
                style={{ marginRight: 8, marginBottom: 8 }}
              />
            ))}
          </Image.PreviewGroup>
        </div>
      )}
      
      {reply.attachments && reply.attachments.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <List
            dataSource={reply.attachments}
            renderItem={(attachment) => (
              <List.Item>
                <a href={getFileUrl(attachment.filename)} download={attachment.original_name}>
                  {attachment.original_name}
                </a>
              </List.Item>
            )}
          />
        </div>
      )}
      <Space>
        <Button
          size="small"
          icon={<LikeOutlined />}
          onClick={() => onReplyLike(reply.id, 'like')}
          className={`like-btn ${replyLikeTypes[reply.id] === 'like' ? 'active' : ''}`}
        >
          {reply.like_count}
        </Button>
        <Button
          size="small"
          icon={<DislikeOutlined />}
          onClick={() => onReplyLike(reply.id, 'dislike')}
          className={`dislike-btn ${replyLikeTypes[reply.id] === 'dislike' ? 'active' : ''}`}
        >
          {reply.dislike_count}
        </Button>
        <Button
          size="small"
          onClick={() => setReplyingTo(reply.id)}
        >
          回复
        </Button>
      </Space>
      {isReplying && (
        <div style={{ marginTop: 12 }}>
          <Input.TextArea
            rows={3}
            placeholder="输入回复内容..."
            value={nestedReplyContent}
            onChange={(e) => setNestedReplyContent(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <Space>
            <Button type="primary" size="small" onClick={() => onNestedReply(reply.id)}>
              发表回复
            </Button>
            <Button size="small" onClick={() => setReplyingTo(null)}>
              取消
            </Button>
          </Space>
        </div>
      )}
      {childReplies.map(childReply => (
        <ReplyItem
          key={childReply.id}
          reply={childReply}
          childReplies={childReplies.filter(r => r.parent_id === childReply.id)}
          replyingTo={replyingTo}
          nestedReplyContent={nestedReplyContent}
          setNestedReplyContent={setNestedReplyContent}
          setReplyingTo={setReplyingTo}
          onReplyLike={onReplyLike}
          onNestedReply={onNestedReply}
          replyLikeTypes={replyLikeTypes}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export default ReplyItem