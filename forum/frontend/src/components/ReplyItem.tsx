import React from 'react'
import { Button, Input, Space, Image, List, Popconfirm, Typography } from 'antd'
import { LikeOutlined, DislikeOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { getFileUrl } from '../utils/api'
import { useAuthStore } from '../store/authStore'

interface ReplyAttachment {
  id: number
  original_name: string
  filename: string
}

interface ReplyImage {
  id: number
  image_path: string
}

export interface Reply {
  id: number
  content: string
  author_id: number
  author_name: string
  author_points?: number
  created_at: string
  updated_at?: string
  like_count: number
  dislike_count: number
  parent_id: number | null
  images?: ReplyImage[]
  attachments?: ReplyAttachment[]
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
  editingReplyId: number | null
  editingContent: string
  setEditingContent: (value: string) => void
  onStartEdit: (reply: Reply) => void
  onCancelEdit: () => void
  onSaveEdit: (replyId: number) => void
  onDeleteReply: (replyId: number) => void
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
  depth,
  editingReplyId,
  editingContent,
  setEditingContent,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteReply,
}) => {
  const { user } = useAuthStore()
  const isReplying = replyingTo === reply.id
  const isEditing = editingReplyId === reply.id
  const canManage = user?.id === reply.author_id || user?.role === 'admin'

  return (
    <div
      style={{
        marginLeft: depth > 0 ? 32 : 0,
        marginTop: depth > 0 ? 12 : 0,
        padding: depth > 0 ? '12px 16px' : 0,
        backgroundColor: depth > 0 ? '#fafafa' : 'transparent',
        borderRadius: 8,
      }}
    >
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Typography.Text strong>{reply.author_name}</Typography.Text>
          <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
            {reply.author_points ?? 0} 积分
          </Typography.Text>
        </div>
        <Typography.Text type="secondary">
          {new Date(reply.created_at).toLocaleString('zh-CN')}
          {reply.updated_at && reply.updated_at !== reply.created_at ? ' · 已编辑' : ''}
        </Typography.Text>
      </div>

      {isEditing ? (
        <>
          <Input.TextArea rows={4} value={editingContent} onChange={(e) => setEditingContent(e.target.value)} />
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" size="small" onClick={() => onSaveEdit(reply.id)}>
              保存
            </Button>
            <Button size="small" onClick={onCancelEdit}>
              取消
            </Button>
          </Space>
        </>
      ) : (
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{reply.content}</div>
      )}

      {reply.images && reply.images.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Image.PreviewGroup>
            {reply.images.map((image) => (
              <Image
                key={image.id}
                src={getFileUrl(image.image_path)}
                width={140}
                style={{ marginRight: 8, marginBottom: 8 }}
              />
            ))}
          </Image.PreviewGroup>
        </div>
      )}

      {reply.attachments && reply.attachments.length > 0 && (
        <List
          size="small"
          dataSource={reply.attachments}
          renderItem={(attachment) => (
            <List.Item>
              <a href={getFileUrl(attachment.filename)} download={attachment.original_name}>
                {attachment.original_name}
              </a>
            </List.Item>
          )}
        />
      )}

      <Space wrap>
        <Button
          size="small"
          icon={<LikeOutlined />}
          onClick={() => onReplyLike(reply.id, 'like')}
          type={replyLikeTypes[reply.id] === 'like' ? 'primary' : 'default'}
        >
          {reply.like_count}
        </Button>
        <Button
          size="small"
          icon={<DislikeOutlined />}
          onClick={() => onReplyLike(reply.id, 'dislike')}
          type={replyLikeTypes[reply.id] === 'dislike' ? 'primary' : 'default'}
        >
          {reply.dislike_count}
        </Button>
        <Button size="small" onClick={() => setReplyingTo(reply.id)}>
          回复
        </Button>
        {canManage && !isEditing && (
          <Button size="small" icon={<EditOutlined />} onClick={() => onStartEdit(reply)}>
            编辑
          </Button>
        )}
        {canManage && (
          <Popconfirm title="确认删除这条回复吗？" onConfirm={() => onDeleteReply(reply.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        )}
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

      {childReplies.map((childReply) => (
        <ReplyItem
          key={childReply.id}
          reply={childReply}
          childReplies={childReplies.filter((item) => item.parent_id === childReply.id)}
          replyingTo={replyingTo}
          nestedReplyContent={nestedReplyContent}
          setNestedReplyContent={setNestedReplyContent}
          setReplyingTo={setReplyingTo}
          onReplyLike={onReplyLike}
          onNestedReply={onNestedReply}
          replyLikeTypes={replyLikeTypes}
          depth={depth + 1}
          editingReplyId={editingReplyId}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          onDeleteReply={onDeleteReply}
        />
      ))}
    </div>
  )
}

export default ReplyItem
