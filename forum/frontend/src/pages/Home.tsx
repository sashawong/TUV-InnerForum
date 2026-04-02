import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, Form, Input, message, Modal, Select, Space, Tag, Typography, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import Header from '../components/Header'

interface Topic {
  id: number
  title: string
  content: string
  author_name: string
  author_points?: number
  created_at: string
  is_pinned: number
  post_type: string
  tags: string[]
  like_count: number
  dislike_count: number
  reply_count: number
}

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<any[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchTopics('')

    const handleCreateTopic = () => setIsModalOpen(true)
    window.addEventListener('createTopic', handleCreateTopic)
    return () => window.removeEventListener('createTopic', handleCreateTopic)
  }, [])

  const fetchTopics = async (query: string) => {
    setLoading(true)
    try {
      const response = await api.get('/topics', {
        params: query ? { search: query } : undefined,
      })
      setTopics(response.data)
      setSearchQuery(query)
    } catch (error) {
      message.error('获取帖子失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTopic = async (values: { title: string; content: string; post_type: string; tags: string[] }) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('content', values.content)
      formData.append('post_type', values.post_type)
      formData.append('tags', JSON.stringify(values.tags))

      uploadedImages.forEach((file) => formData.append('images', file))
      uploadedFiles.forEach((file) => formData.append('attachments', file))

      await api.post('/topics', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      message.success('帖子发布成功')
      setIsModalOpen(false)
      form.resetFields()
      setUploadedImages([])
      setUploadedFiles([])
      fetchTopics(searchQuery)
    } catch (error) {
      message.error('发布帖子失败')
    } finally {
      setLoading(false)
    }
  }

  const visibleTopics = useMemo(() => topics, [topics])

  return (
    <div style={{ width: '100%' }}>
      <Header showSearch showCreateButton={!!user} onSearch={fetchTopics} searchValue={searchQuery} />

      {visibleTopics.length === 0 ? (
        <Card>
          <Empty description={searchQuery ? '没有找到匹配的帖子' : '还没有帖子，发一条试试'} />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {visibleTopics.map((topic) => (
            <Card key={topic.id} hoverable onClick={() => navigate(`/topic/${topic.id}`)}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <Space wrap>
                    {topic.is_pinned === 1 && <Tag color="red">置顶</Tag>}
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      {topic.title}
                    </Typography.Title>
                    <Tag color={topic.post_type === 'share' ? 'cyan' : 'magenta'}>
                      {topic.post_type === 'share' ? '分享' : '求助'}
                    </Tag>
                  </Space>
                  <Space wrap>
                    {topic.tags?.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                </div>

                <Typography.Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                  {topic.content}
                </Typography.Paragraph>

                <Typography.Text type="secondary">
                  {topic.author_name} · {topic.author_points ?? 0} 积分 · {new Date(topic.created_at).toLocaleString('zh-CN')}
                </Typography.Text>
                <Typography.Text type="secondary">
                  赞同 {topic.like_count} · 反对 {topic.dislike_count} · 回复 {topic.reply_count}
                </Typography.Text>
              </Space>
            </Card>
          ))}
        </div>
      )}

      <Modal title="新建帖子" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleCreateTopic} initialValues={{ post_type: 'share', tags: [] }}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入帖子标题" />
          </Form.Item>

          <Form.Item label="内容" name="content" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={5} placeholder="请输入帖子内容" />
          </Form.Item>

          <Form.Item label="类型" name="post_type" rules={[{ required: true, message: '请选择类型' }]}>
            <Select
              options={[
                { value: 'share', label: '分享' },
                { value: 'help', label: '求助' },
              ]}
            />
          </Form.Item>

          <Form.Item label="标签" name="tags" rules={[{ required: true, message: '请选择标签' }]}>
            <Select
              mode="multiple"
              options={['EU', 'UNECE', 'GB', 'USA', 'CN'].map((tag) => ({ value: tag, label: tag }))}
            />
          </Form.Item>

          <Form.Item label="上传图片">
            <Upload
              multiple
              beforeUpload={(file) => {
                setUploadedImages((prev) => [...prev, file])
                return false
              }}
              onRemove={(file) => {
                setUploadedImages((prev) => prev.filter((item) => item.uid !== file.uid))
              }}
              fileList={uploadedImages as any}
            >
              <Button icon={<UploadOutlined />}>选择图片</Button>
            </Upload>
          </Form.Item>

          <Form.Item label="上传附件">
            <Upload
              multiple
              beforeUpload={(file) => {
                setUploadedFiles((prev) => [...prev, file])
                return false
              }}
              onRemove={(file) => {
                setUploadedFiles((prev) => prev.filter((item) => item.uid !== file.uid))
              }}
              fileList={uploadedFiles as any}
            >
              <Button icon={<UploadOutlined />}>选择附件</Button>
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
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


