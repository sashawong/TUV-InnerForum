import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Input, message, Space, Tag, Image, List, Modal, Upload } from 'antd'
import { LikeOutlined, DislikeOutlined, StarOutlined, StarFilled, ArrowLeftOutlined, UploadOutlined } from '@ant-design/icons'
import api, { getFileUrl } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import ReplyItem from '../components/ReplyItem'
import Header from '../components/Header'

interface Reply {
  id: number
  content: string
  author_name: string
  created_at: string
  like_count: number
  dislike_count: number
  parent_id: number | null
}

interface TopicDetail {
  id: number
  title: string
  content: string
  author_name: string
  author_id: number
  created_at: string
  is_pinned: number
  post_type: string
  tags: string | string[]
  like_count: number
  dislike_count: number
  replies: Reply[]
  images: { id: number; image_path: string }[]
  attachments: { id: number; original_name: string; filename: string }[]
}

const TopicDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isFavorited, setIsFavorited] = useState(false)
  const [userLikeType, setUserLikeType] = useState<'like' | 'dislike' | null>(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [nestedReplyContent, setNestedReplyContent] = useState('')
  const [replyLikeTypes, setReplyLikeTypes] = useState<{ [key: number]: 'like' | 'dislike' | null }>({})
  const [replyImages, setReplyImages] = useState<any[]>([])
  const [replyFiles, setReplyFiles] = useState<any[]>([])

  const handleReplyImageUpload = ({ file, onSuccess }: any) => {
    console.log('handleReplyImageUpload 被调用:', file)
    setReplyImages(prev => [...prev, file])
    onSuccess(file)
    return false
  }

  const handleReplyFileUpload = ({ file, onSuccess }: any) => {
    console.log('handleReplyFileUpload 被调用:', file)
    setReplyFiles(prev => [...prev, file])
    onSuccess(file)
    return false
  }

  const removeReplyImage = (index: number) => {
    setReplyImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeReplyFile = (index: number) => {
    setReplyFiles(prev => prev.filter((_, i) => i !== index))
  }

  const fetchTopic = async () => {
    if (!id) return
    setLoading(true)
    try {
      const response = await api.get(`/topics/${id}`)
      console.log('接收到的帖子数据:', response.data)
      console.log('tags:', response.data.tags, 'type:', typeof response.data.tags, 'isArray:', Array.isArray(response.data.tags))
      setTopic(response.data)
    } catch (error) {
      message.error('加载帖子详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopic()
  }, [id])

  const handleLike = async (type: 'like' | 'dislike') => {
    if (!user) {
      message.warning('请先登录')
      return
    }
    if (!id) return

    try {
      await api.post(`/topics/${id}/like`, { like_type: type })
      setUserLikeType(userLikeType === type ? null : type)
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
      setIsFavorited(!isFavorited)
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
      formData.append('content', replyContent)
      
      // 添加图片文件
      replyImages.forEach((image) => {
        formData.append('images', image)
      })
      
      // 添加附件文件
      replyFiles.forEach((file) => {
        formData.append('attachments', file)
      })
      
      await api.post(`/topics/${id}/replies`, formData)
      
      message.success('回复成功')
      setReplyContent('')
      setReplyImages([])
      setReplyFiles([])
      fetchTopic()
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
      setReplyLikeTypes(prev => ({
        ...prev,
        [replyId]: prev[replyId] === type ? null : type
      }))
      fetchTopic()
    } catch (error) {
      message.error('操作失败')
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
        content: nestedReplyContent,
        parent_id: parentReplyId
      })
      message.success('回复成功')
      setNestedReplyContent('')
      setReplyingTo(null)
      fetchTopic()
    } catch (error) {
      message.error('回复失败')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await api.delete(`/topics/${id}`)
      message.success('删除成功')
      navigate('/')
    } catch (error) {
      message.error('删除失败')
    }
  }

  const getTagColor = (tag: string) => {
    const colors: { [key: string]: string } = {
      UNECE: 'blue',
      EU: 'green',
      MAS: 'orange',
      TEST: 'purple',
    }
    return colors[tag] || 'default'
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

      <Card>
        <div style={{ marginBottom: 16 }}>
          {topic.is_pinned === 1 && <Tag color="red">置顶</Tag>}
          <Tag color={topic.post_type === 'share' ? 'cyan' : 'magenta'}>
            {topic.post_type === 'share' ? '分享' : '求助'}
          </Tag>
          {topic.tags && (Array.isArray(topic.tags) ? topic.tags : topic.tags.split(',')).map((tag: string, index: number) => (
            <Tag key={index} color={getTagColor(tag.trim())}>
              {tag.trim().toUpperCase()}
            </Tag>
          ))}
        </div>

        <h1 style={{ marginBottom: 16 }}>{topic.title}</h1>

        <div style={{ marginBottom: 16, color: '#666' }}>
          <span>作者: {topic.author_name}</span>
          <span style={{ marginLeft: 16 }}>
            发布时间: {new Date(topic.created_at).toLocaleString('zh-CN')}
          </span>
        </div>

        <div style={{ marginBottom: 24, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          {topic.content}
        </div>

        {topic.images && topic.images.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3>图片</h3>
            <Image.PreviewGroup>
              {topic.images.map((image) => (
                <Image
                  key={image.id}
                  src={getFileUrl(image.image_path)}
                  width={200}
                  style={{ marginRight: 16, marginBottom: 16 }}
                />
              ))}
            </Image.PreviewGroup>
          </div>
        )}

        {topic.attachments && topic.attachments.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3>附件</h3>
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

        <Space style={{ marginBottom: 24 }}>
          <Button
            icon={<LikeOutlined />}
            onClick={() => handleLike('like')}
            className={`like-btn ${userLikeType === 'like' ? 'active' : ''}`}
          >
            {topic.like_count}
          </Button>
          <Button
            icon={<DislikeOutlined />}
            onClick={() => handleLike('dislike')}
            className={`dislike-btn ${userLikeType === 'dislike' ? 'active' : ''}`}
          >
            {topic.dislike_count}
          </Button>
          <Button
            icon={isFavorited ? <StarFilled /> : <StarOutlined />}
            onClick={handleFavorite}
          >
            {isFavorited ? '已收藏' : '收藏'}
          </Button>
          {(isAdmin || isAuthor) && (
            <Button danger onClick={() => setDeleteModalVisible(true)}>
              删除
            </Button>
          )}
        </Space>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
          <h3>回复 ({topic.replies.length})</h3>
          <Input.TextArea
            rows={4}
            placeholder="输入回复内容..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <div style={{ marginBottom: 16 }}>
            <Upload
              multiple
              showUploadList={true}
              customRequest={handleReplyImageUpload}
              onRemove={(file) => {
                const index = replyImages.findIndex(f => f.uid === file.uid)
                if (index > -1) {
                  removeReplyImage(index)
                }
              }}
              style={{ marginRight: 16 }}
            >
              <Button icon={<UploadOutlined />}>上传图片</Button>
            </Upload>
            <Upload
              multiple
              showUploadList={true}
              customRequest={handleReplyFileUpload}
              onRemove={(file) => {
                const index = replyFiles.findIndex(f => f.uid === file.uid)
                if (index > -1) {
                  removeReplyFile(index)
                }
              }}
            >
              <Button icon={<UploadOutlined />}>上传附件</Button>
            </Upload>
          </div>
          <Button type="primary" onClick={handleReply}>
            发表回复
          </Button>

          <List
            dataSource={topic.replies.filter(r => !r.parent_id)}
            renderItem={(reply) => (
              <List.Item style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                <ReplyItem
                  reply={reply}
                  childReplies={topic.replies.filter(r => r.parent_id === reply.id)}
                  replyingTo={replyingTo}
                  nestedReplyContent={nestedReplyContent}
                  setNestedReplyContent={setNestedReplyContent}
                  setReplyingTo={setReplyingTo}
                  onReplyLike={handleReplyLike}
                  onNestedReply={handleNestedReply}
                  replyLikeTypes={replyLikeTypes}
                  depth={0}
                />
              </List.Item>
            )}
          />
        </div>
      </Card>

      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="删除"
        cancelText="取消"
      >
        确定要删除这个帖子吗？此操作不可撤销。
      </Modal>
    </div>
  )
}

export default TopicDetail