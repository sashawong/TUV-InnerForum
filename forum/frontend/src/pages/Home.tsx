import React, { useState, useEffect } from 'react'
import { Input, Button, Card, Space, Tag, Modal, Form, Select, message, Dropdown, Avatar, Upload, Typography } from 'antd'
import { SearchOutlined, PlusOutlined, UserOutlined, LogoutOutlined, LoginOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import Header from '../components/Header'

interface Topic {
  id: number
  title: string
  content: string
  author_name: string
  created_at: string
  is_pinned: number
  post_type: string
  tags: string | string[]
  like_count: number
  dislike_count: number
  reply_count: number
}

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [uploadedImages, setUploadedImages] = useState<any[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    const handleCreateTopic = () => {
      setIsModalOpen(true)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    window.addEventListener('createTopic', handleCreateTopic)
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('createTopic', handleCreateTopic)
    }
  }, [])

  useEffect(() => {
    fetchTopics()
  }, [searchQuery])

  const fetchTopics = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/topics?search=${encodeURIComponent(searchQuery)}`)
      setTopics(response.data)
    } catch (error) {
      message.error('获取帖子失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchTopics()
  }

  const handleCreateTopic = async (values: any) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('content', values.content)
      formData.append('post_type', values.post_type)
      formData.append('tags', JSON.stringify(values.tags))

      uploadedImages.forEach((image, index) => {
        formData.append('images', image)
      })

      uploadedFiles.forEach((file, index) => {
        formData.append('attachments', file)
      })

      await api.post('/topics', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      message.success('帖子创建成功')
      setIsModalOpen(false)
      form.resetFields()
      setUploadedImages([])
      setUploadedFiles([])
      fetchTopics()
    } catch (error) {
      message.error('创建帖子失败')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = ({ file, onSuccess }: any) => {
    setUploadedImages(prev => [...prev, file])
    onSuccess(file)
    return false
  }

  const handleFileUpload = ({ file, onSuccess }: any) => {
    setUploadedFiles(prev => [...prev, file])
    onSuccess(file)
    return false
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const userMenuItems = [
    {
      key: 'profile',
      label: <span onClick={() => navigate('/user/settings')}>个人设置</span>,
    },
    {
      key: 'logout',
      label: <span onClick={logout}>退出登录</span>,
    },
  ]

  const getTagColor = (tag: string) => {
    const colors: { [key: string]: string } = {
      'EU': 'blue',
      'UNECE': 'green',
      'GB': 'orange',
      'USA': 'red',
      'CN': 'purple',
    }
    return colors[tag] || 'default'
  }

  const getPostTypeColor = (type: string) => {
    return type === 'share' ? 'cyan' : 'magenta'
  }

  return (
    <div style={{ width: '100%' }}>
      <Header 
        showSearch={true} 
        showCreateButton={true} 
        onSearch={handleSearch} 
      />

      <div style={{ display: 'grid', gap: 16 }}>
        {topics.map((topic) => (
          <Card
            key={topic.id}
            className="topic-card"
            hoverable
            onClick={() => navigate(`/topic/${topic.id}`)}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 12
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 8 }}>
                  {topic.is_pinned === 1 && <span className="pinned-badge">置顶</span>}
                  <span className="topic-title" style={{ fontSize: isMobile ? '1rem' : '1.1rem' }}>{topic.title}</span>
                  <Tag color={getPostTypeColor(topic.post_type)}>
                    {topic.post_type === 'share' ? '分享' : '求助'}
                  </Tag>
                </div>
                <div className="topic-preview">
                  {topic.content.substring(0, isMobile ? 15 : 20)}
                  {topic.content.length > (isMobile ? 15 : 20) && '...'}
                </div>
                <div className="topic-meta" style={{ fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                  <span>{topic.author_name}</span>
                  <span style={{ marginLeft: 16 }}>
                    {new Date(topic.created_at).toLocaleString('zh-CN')}
                  </span>
                  <span style={{ marginLeft: 16 }}>
                    👍 {topic.like_count} 👎 {topic.dislike_count} 💬 {topic.reply_count}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {topic.tags && (Array.isArray(topic.tags) ? topic.tags : topic.tags.split(',')).map((tag: string, index: number) => (
                  <Tag key={index} color={getTagColor(tag.trim())} className="tag-badge" style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', padding: '2px 8px' }}>
                    {tag.trim().toUpperCase()}
                  </Tag>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        title="新建帖子"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={isMobile ? '90vw' : 600}
      >
        <Form form={form} onFinish={handleCreateTopic} layout="vertical">
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入帖子标题" />
          </Form.Item>

          <Form.Item
            label="内容"
            name="content"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入帖子内容" />
          </Form.Item>

          <Form.Item
            label="类型"
            name="post_type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select>
              <Select.Option value="share">分享</Select.Option>
              <Select.Option value="help">求助</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
            rules={[{ required: true, message: '请选择标签' }]}
          >
            <Select mode="multiple" placeholder="请选择标签">
              <Select.Option value="EU">EU</Select.Option>
              <Select.Option value="UNECE">UNECE</Select.Option>
              <Select.Option value="GB">GB</Select.Option>
              <Select.Option value="USA">USA</Select.Option>
              <Select.Option value="CN">CN</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="上传图片">
            <Upload
              multiple
              showUploadList={false}
              customRequest={handleImageUpload}
              maxCount={5}
            >
              <Button icon={<UploadOutlined />}>选择图片</Button>
            </Upload>
            {uploadedImages.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {uploadedImages.map((image, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <Avatar
                      size={64}
                      src={image instanceof File ? URL.createObjectURL(image) : undefined}
                    />
                    <Button
                      type="text"
                      danger
                      onClick={() => removeImage(index)}
                      style={{ position: 'absolute', top: -8, right: -8 }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Form.Item>

          <Form.Item label="上传附件">
            <Upload
              multiple
              showUploadList={false}
              customRequest={handleFileUpload}
              maxCount={3}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {uploadedFiles.map((file, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ flex: 1, fontSize: '0.9rem' }}>{file.name}</span>
                    <Button type="text" danger onClick={() => removeFile(index)}>删除</Button>
                  </div>
                ))}
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                发布
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Home