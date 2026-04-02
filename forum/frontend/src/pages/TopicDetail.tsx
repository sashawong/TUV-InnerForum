import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftOutlined, DislikeOutlined, LikeOutlined, StarFilled, StarOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Card, Image, Input, List, message, Modal, Space, Tag, Typography, Upload } from 'antd'
import api, { getFileUrl } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import ReplyItem, { Reply } from '../components/ReplyItem'
import Header from '../components/Header'

interface TopicAttachment {
  id: number
  original_name: string
  filename: string
}

interface TopicImage {
  id: number
  image_path: string
}

interface TopicDetailData {
  id: number
  title: string
  content: string
  author_id: number
  author_name: string
  author_points?: number
  created_at: string
  updated_at?: string
  is_pinned: number
  post_type: string
  tags: string[]
  like_count: number
  dislike_count: number
  replies: Reply[]
  images: TopicImage[]
  attachments: TopicAttachment[]
}

const TopicDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [topic, setTopic] = useState<TopicDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [nestedReplyContent, setNestedReplyContent] = useState('')
  const [replyLikeTypes, setReplyLikeTypes] = useState<{ [key: number]: 'like' | 'dislike' | null }>({})
  const [replyImages, setReplyImages] = useState<any[]>([])
  const [replyFiles, setReplyFiles] = useState<any[]>([])
  const [userLikeType, setUserLikeType] = useState<'like' | 'dislike' | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const fetchProfile = async () => {
    if (!user) return
    try {
      const response = await api.get('/user/profile')
      setUser(response.data)
    } catch (error) {
      // ignore profile refresh failures on detail page
    }
  }

  const fetchTopic = async () => {
    if (!id) return
    setLoading(true)
    try {
      const response = await api.get(`/topics/${id}`)
      setTopic(response.data)
    } catch (error) {
      message.error('加载帖子详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopic()
    fetchProfile()
  }, [id])

  const rootReplies = useMemo(() => topic?.replies.filter((reply) => !reply.parent_id) ?? [], [topic])

  const handleLike = async (type: 'like' | 'dislike') => {
    if (!user) {
      message.warning('请先登录')
      return
    }
    if (!id) return

    try {
      await api.post(`/topics/${id}/like`, { like_type: type })
      setUserLikeType((current) => (current === type ? null : type))
      fetchTopic()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleFavorite = async () => {
    if (!user) {
      message.warning('请先登录')
      return
    }
    if (!id) return

    try {
      await api.post(`/topics/${id}/favorite`)
      setIsFavorited((current) => !current)
      message.success(isFavorited ? '已取消收藏' : '已收藏')
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleReply = async () => {
    if (!user) {
      message.warning('请先登录')
      return
    }
    if (!replyContent.trim()) {
      message.warning('请输入回复内容')
      return
    }
    if (!id) return

    try {
      const formData = new FormData()
      formData.append('content', replyContent.trim())
      replyImages.forEach((file) => formData.append('images', file))
      replyFiles.forEach((file) => formData.append('attachments', file))

      await api.post(`/topics/${id}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      message.success('回复成功')
      setReplyContent('')
      setReplyImages([])
      setReplyFiles([])
      fetchTopic()
      fetchProfile()
    } catch (error) {
      message.error('回复失败')
    }
  }

  const handleNestedReply = async (parentReplyId: number) => {
    if (!user) {
      message.warning('请先登录')
      return
    }
    if (!nestedReplyContent.trim()) {
      message.warning('请输入回复内容')
      return
    }
    if (!id) return

    try {
      await api.post(`/topics/${id}/replies`, {
        content: nestedReplyContent.trim(),
        parent_id: parentReplyId,
      })
      message.success('回复成功')
      setNestedReplyContent('')
      setReplyingTo(null)
      fetchTopic()
      fetchProfile()
    } catch (error) {
      message.error('回复失败')
    }
  }

  const handleReplyLike = async (replyId: number, type: 'like' | 'dislike') => {
    if (!user) {
      message.warning('请先登录')
      return
    }

    try {
      await api.post(`/replies/${replyId}/like`, { like_type: type })
      setReplyLikeTypes((prev) => ({
        ...prev,
        [replyId]: prev[replyId] === type ? null : type,
      }))
      fetchTopic()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleDeleteTopic = async () => {
    if (!id) return
    try {
      await api.delete(`/topics/${id}`)
      message.success('帖子已删除')
      navigate('/')
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleStartEdit = (reply: Reply) => {
    setEditingReplyId(reply.id)
    setEditingContent(reply.content)
  }

  const handleSaveEdit = async (replyId: number) => {
    if (!editingContent.trim()) {
      message.warning('请输入回复内容')
      return
    }

    try {
      await api.put(`/replies/${replyId}`, { content: editingContent.trim() })
      message.success('回复已更新')
      setEditingReplyId(null)
      setEditingContent('')
      fetchTopic()
    } catch (error) {
      message.error('更新失败')
    }
  }

  const handleDeleteReply = async (replyId: number) => {
    try {
      await api.delete(`/replies/${replyId}`)
      message.success('回复已删除')
      fetchTopic()
      fetchProfile()
    } catch (error) {
      message.error('删除回复失败')
    }
  }

  if (loading || !topic) {
    return <div>加载中...</div>
  }

  const isAdmin = user?.role === 'admin'
  const isAuthor = user?.id === topic.author_id

  return (
    <div>
      <Header />
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
        返回首页
      </Button>

      <Card loading={loading}>
        <Space wrap style={{ marginBottom: 16 }}>
          {topic.is_pinned === 1 && <Tag color="red">置顶</Tag>}
          <Tag color={topic.post_type === 'share' ? 'cyan' : 'magenta'}>
            {topic.post_type === 'share' ? '分享' : '求助'}
          </Tag>
          {topic.tags?.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>

        <Typography.Title level={2}>{topic.title}</Typography.Title>
        <Typography.Text type="secondary">
          {topic.author_name} · {topic.author_points ?? 0} 积分 · {new Date(topic.created_at).toLocaleString('zh-CN')}
        </Typography.Text>

        <div style={{ marginTop: 24, marginBottom: 24, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{topic.content}</div>

        {topic.images?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={5}>图片</Typography.Title>
            <Image.PreviewGroup>
              {topic.images.map((image) => (
                <Image key={image.id} src={getFileUrl(image.image_path)} width={200} style={{ marginRight: 16, marginBottom: 16 }} />
              ))}
            </Image.PreviewGroup>
          </div>
        )}

        {topic.attachments?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={5}>附件</Typography.Title>
            <List
              dataSource={topic.attachments}
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

        <Space wrap style={{ marginBottom: 24 }}>
          <Button icon={<LikeOutlined />} onClick={() => handleLike('like')} type={userLikeType === 'like' ? 'primary' : 'default'}>
            {topic.like_count}
          </Button>
          <Button icon={<DislikeOutlined />} onClick={() => handleLike('dislike')} type={userLikeType === 'dislike' ? 'primary' : 'default'}>
            {topic.dislike_count}
          </Button>
          <Button icon={isFavorited ? <StarFilled /> : <StarOutlined />} onClick={handleFavorite}>
            {isFavorited ? '已收藏' : '收藏'}
          </Button>
          {(isAdmin || isAuthor) && (
            <Button danger onClick={() => setDeleteModalVisible(true)}>
              删除帖子
            </Button>
          )}
        </Space>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
          <Typography.Title level={4}>回复 ({topic.replies.length})</Typography.Title>
          <Input.TextArea
            rows={4}
            placeholder="输入回复内容..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          <Space wrap style={{ marginBottom: 16 }}>
            <Upload
              multiple
              beforeUpload={(file) => {
                setReplyImages((prev) => [...prev, file])
                return false
              }}
              onRemove={(file) => {
                setReplyImages((prev) => prev.filter((item) => item.uid !== file.uid))
              }}
              fileList={replyImages as any}
            >
              <Button icon={<UploadOutlined />}>上传图片</Button>
            </Upload>
            <Upload
              multiple
              beforeUpload={(file) => {
                setReplyFiles((prev) => [...prev, file])
                return false
              }}
              onRemove={(file) => {
                setReplyFiles((prev) => prev.filter((item) => item.uid !== file.uid))
              }}
              fileList={replyFiles as any}
            >
              <Button icon={<UploadOutlined />}>上传附件</Button>
            </Upload>
            <Button type="primary" onClick={handleReply}>
              发表回复
            </Button>
          </Space>

          <List
            locale={{ emptyText: '还没有回复' }}
            dataSource={rootReplies}
            renderItem={(reply) => (
              <List.Item style={{ display: 'block', padding: '16px 0' }}>
                <ReplyItem
                  reply={reply}
                  childReplies={topic.replies.filter((item) => item.parent_id === reply.id)}
                  replyingTo={replyingTo}
                  nestedReplyContent={nestedReplyContent}
                  setNestedReplyContent={setNestedReplyContent}
                  setReplyingTo={setReplyingTo}
                  onReplyLike={handleReplyLike}
                  onNestedReply={handleNestedReply}
                  replyLikeTypes={replyLikeTypes}
                  depth={0}
                  editingReplyId={editingReplyId}
                  editingContent={editingContent}
                  setEditingContent={setEditingContent}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={() => {
                    setEditingReplyId(null)
                    setEditingContent('')
                  }}
                  onSaveEdit={handleSaveEdit}
                  onDeleteReply={handleDeleteReply}
                />
              </List.Item>
            )}
          />
        </div>
      </Card>

      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDeleteTopic}
        onCancel={() => setDeleteModalVisible(false)}
        okText="删除"
        cancelText="取消"
      >
        确认删除这篇帖子吗？此操作不可撤销。
      </Modal>
    </div>
  )
}

export default TopicDetail


