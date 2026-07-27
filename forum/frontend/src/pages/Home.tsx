import React, { useEffect, useState } from 'react'
import { Badge, Button, Card, Empty, Form, Input, List, message, Modal, Select, Space, Tag, Typography, Upload } from 'antd'
import { SearchOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import Header from '../components/Header'
import { isUploadSizeAllowed, MAX_UPLOAD_SIZE_MB } from '../utils/upload'

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

type TopicModule = 'tire' | 'lighting' | 'vehicle'

interface HomeProps {
  moduleKey?: TopicModule
}

const moduleConfigs: Record<TopicModule, { title: string; description: string; tags: string[] }> = {
  tire: {
    title: '轮胎法规',
    description: '轮胎法规、认证路径、测试要求与项目经验交流',
    tags: ['UNECE', 'EU', 'GB', 'MAS', '求助', '分享'],
  },
  lighting: {
    title: '灯具法规',
    description: '灯具法规、配光、安装、型式认证与测试案例交流',
    tags: ['UNECE', 'EU', 'GB', '配光', '安装', '认证'],
  },
  vehicle: {
    title: '整车法规',
    description: '整车型式认证、合规矩阵、测试计划与法规动态交流',
    tags: ['UNECE', 'EU', 'GB', '型式认证', '测试', '合规'],
  },
}

interface SearchTopicResult {
  topic_id: number
  title: string
  author_name: string
  author_points?: number
  created_at: string
  tags: string[]
  post_type?: string
  snippet: string
}

interface SearchReplyResult {
  reply_id: number
  topic_id: number
  topic_title: string
  author_name: string
  author_points?: number
  created_at: string
  snippet: string
}

interface SearchResults {
  query: string
  total: number
  titles: SearchTopicResult[]
  contents: SearchTopicResult[]
  replies: SearchReplyResult[]
}

const columnCardStyle: React.CSSProperties = {
  height: '100%',
}

const listBodyStyle: React.CSSProperties = {
  maxHeight: 460,
  overflow: 'auto',
}

const isAiAuthor = (authorName: string): boolean => {
  const normalized = (authorName || '').toLowerCase()
  return normalized.includes('ai') || normalized.includes('助手') || normalized.includes('robot')
}

const Home: React.FC<HomeProps> = ({ moduleKey = 'tire' }) => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const moduleConfig = moduleConfigs[moduleKey]
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResults>({
    query: '',
    total: 0,
    titles: [],
    contents: [],
    replies: [],
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<any[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchTopics()

    const handleCreateTopic = () => setIsModalOpen(true)
    window.addEventListener('createTopic', handleCreateTopic)
    return () => window.removeEventListener('createTopic', handleCreateTopic)
  }, [moduleKey])

  const fetchTopics = async () => {
    setLoading(true)
    try {
      const response = await api.get('/topics', { params: { module: moduleKey } })
      setTopics(response.data)
    } catch (error) {
      message.error('获取帖子失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    const trimmed = query.trim()
    setSearchQuery(trimmed)

    if (!trimmed) {
      setSearchModalOpen(false)
      setSearchResults({
        query: '',
        total: 0,
        titles: [],
        contents: [],
        replies: [],
      })
      return
    }

    setSearchLoading(true)
    setSearchModalOpen(true)
    try {
      const response = await api.get('/search', {
        params: { q: trimmed },
      })
      setSearchResults(response.data)
    } catch (error) {
      message.error('搜索失败')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleCreateTopic = async (values: { title: string; content: string; post_type: string; tags: string[] }) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('content', values.content)
      formData.append('post_type', values.post_type)
      formData.append('module', moduleKey)
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
      fetchTopics()
    } catch (error: any) {
      message.error(error.response?.data?.error || '发布帖子失败')
    } finally {
      setLoading(false)
    }
  }

  const openTopic = (topicId: number) => {
    setSearchModalOpen(false)
    navigate(`/topic/${topicId}`)
  }

  const renderTopicCard = (topic: Topic) => (
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
  )

  const aiDailyTopics = topics.filter((topic) => isAiAuthor(topic.author_name))
  const userTopics = topics.filter((topic) => !isAiAuthor(topic.author_name))

  const renderTopicResult = (item: SearchTopicResult) => (
    <List.Item style={{ cursor: 'pointer', paddingInline: 0 }} onClick={() => openTopic(item.topic_id)}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Typography.Text strong>{item.title}</Typography.Text>
        <Typography.Text type="secondary">
          {item.author_name} · {item.author_points ?? 0} 积分 · {new Date(item.created_at).toLocaleString('zh-CN')}
        </Typography.Text>
        {item.tags?.length > 0 && (
          <Space wrap>
            {item.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        )}
        <Typography.Paragraph style={{ marginBottom: 0 }}>{item.snippet}</Typography.Paragraph>
      </Space>
    </List.Item>
  )

  const renderReplyResult = (item: SearchReplyResult) => (
    <List.Item style={{ cursor: 'pointer', paddingInline: 0 }} onClick={() => openTopic(item.topic_id)}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Typography.Text strong>{item.topic_title}</Typography.Text>
        <Typography.Text type="secondary">
          回复人：{item.author_name} · {item.author_points ?? 0} 积分 · {new Date(item.created_at).toLocaleString('zh-CN')}
        </Typography.Text>
        <Typography.Paragraph style={{ marginBottom: 0 }}>{item.snippet}</Typography.Paragraph>
      </Space>
    </List.Item>
  )

  return (
    <div style={{ width: '100%' }}>
      <Header showSearch showCreateButton={!!user} onSearch={handleSearch} searchValue={searchQuery} />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {moduleConfig.title}
        </Typography.Title>
        <Typography.Text type="secondary">{moduleConfig.description}</Typography.Text>
      </Card>

      {topics.length === 0 ? (
        <Card loading={loading}>
          <Empty description={`暂无${moduleConfig.title}帖子，点击右上角发布第一篇`} />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <Card
            title="AI 日报"
            extra={<Badge count={aiDailyTopics.length} />}
            bodyStyle={{ display: 'grid', gap: 12 }}
          >
            {aiDailyTopics.length === 0 ? <Empty description="暂无 AI 日报" /> : aiDailyTopics.map(renderTopicCard)}
          </Card>

          <Card
            title="用户帖子"
            extra={<Badge count={userTopics.length} />}
            bodyStyle={{ display: 'grid', gap: 12 }}
          >
            {userTopics.length === 0 ? <Empty description="暂无用户帖子" /> : userTopics.map(renderTopicCard)}
          </Card>
        </div>
      )}

      <Modal
        title={
          <Space>
            <SearchOutlined />
            <span>搜索结果</span>
            {searchResults.query && <Typography.Text type="secondary">“{searchResults.query}”</Typography.Text>}
            <Badge count={searchResults.total} />
          </Space>
        }
        open={searchModalOpen}
        onCancel={() => setSearchModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setSearchModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width="92vw"
        styles={{ body: { paddingTop: 8 } }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          <Card
            title={`标题命中 (${searchResults.titles.length})`}
            style={columnCardStyle}
            loading={searchLoading}
            extra={<Tag color="blue">标题</Tag>}
          >
            <div style={listBodyStyle}>
              <List
                locale={{ emptyText: '没有标题命中' }}
                dataSource={searchResults.titles}
                renderItem={renderTopicResult}
              />
            </div>
          </Card>

          <Card
            title={`正文命中 (${searchResults.contents.length})`}
            style={columnCardStyle}
            loading={searchLoading}
            extra={<Tag color="green">内容</Tag>}
          >
            <div style={listBodyStyle}>
              <List
                locale={{ emptyText: '没有正文命中' }}
                dataSource={searchResults.contents}
                renderItem={renderTopicResult}
              />
            </div>
          </Card>

          <Card
            title={`回复命中 (${searchResults.replies.length})`}
            style={columnCardStyle}
            loading={searchLoading}
            extra={<Tag color="purple">回复</Tag>}
          >
            <div style={listBodyStyle}>
              <List
                locale={{ emptyText: '没有回复命中' }}
                dataSource={searchResults.replies}
                renderItem={renderReplyResult}
              />
            </div>
          </Card>
        </div>
      </Modal>

      <Modal title={`发布${moduleConfig.title}帖子`} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} destroyOnClose>
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
              options={moduleConfig.tags.map((tag) => ({ value: tag, label: tag }))}
            />
          </Form.Item>

          <Form.Item label="上传图片" extra={`单个文件最大 ${MAX_UPLOAD_SIZE_MB}MB`}>
            <Upload
              multiple
              beforeUpload={(file) => {
                if (!isUploadSizeAllowed(file)) {
                  message.error(`${file.name} 超过 ${MAX_UPLOAD_SIZE_MB}MB，无法上传`)
                  return Upload.LIST_IGNORE
                }
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

          <Form.Item label="上传附件" extra={`单个文件最大 ${MAX_UPLOAD_SIZE_MB}MB`}>
            <Upload
              multiple
              beforeUpload={(file) => {
                if (!isUploadSizeAllowed(file)) {
                  message.error(`${file.name} 超过 ${MAX_UPLOAD_SIZE_MB}MB，无法上传`)
                  return Upload.LIST_IGNORE
                }
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
