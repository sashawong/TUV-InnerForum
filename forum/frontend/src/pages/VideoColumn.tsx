import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, Form, Input, List, message, Modal, Space, Tag, Typography } from 'antd'
import { LinkOutlined, PlayCircleOutlined, ReloadOutlined, VideoCameraOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import api from '../utils/api'

interface TopicItem {
  id: number
  title: string
  content: string
  author_name: string
  created_at: string
  tags: string[]
  video_url?: string
  video_path?: string
  video_external?: boolean
}

const isVideoTopic = (topic: TopicItem): boolean => {
  const tags = Array.isArray(topic.tags) ? topic.tags : []
  return tags.includes('AI视频') || tags.includes('热点视频') || tags.includes('NotebookLM') || topic.title.includes('视频')
}

const isDirectVideoUrl = (url: string): boolean => /\.(mp4|webm|ogg)(\?|#|$)/i.test(url)

const isNotebookLmUrl = (url: string): boolean => {
  try {
    return new URL(url).hostname.endsWith('notebooklm.google.com')
  } catch {
    return false
  }
}

const VideoColumn: React.FC = () => {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [externalModalOpen, setExternalModalOpen] = useState(false)
  const [externalSubmitting, setExternalSubmitting] = useState(false)
  const [externalForm] = Form.useForm()

  const fetchVideoTopics = async () => {
    setLoading(true)
    try {
      const response = await api.get('/topics')
      setTopics(response.data || [])
    } catch (error) {
      message.error('加载视频专栏失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideoTopics()
  }, [])

  const videoTopics = useMemo(() => {
    return topics
      .filter(isVideoTopic)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [topics])

  const handleGenerateHotspotVideo = async () => {
    setGenerating(true)
    try {
      const response = await api.post('/ai/videos/hotspot', {})
      message.success(response.data?.message || '已生成热点视频')
      await fetchVideoTopics()
      if (response.data?.topic_id) {
        navigate(`/topic/${response.data.topic_id}`)
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成热点视频失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleAddExternalVideo = async (values: { title: string; video_url: string; content?: string }) => {
    setExternalSubmitting(true)
    try {
      const response = await api.post('/videos/external', {
        ...values,
        tags: ['视频', 'NotebookLM'],
      })
      message.success(response.data?.message || '外部视频已加入专栏')
      setExternalModalOpen(false)
      externalForm.resetFields()
      await fetchVideoTopics()
    } catch (error: any) {
      message.error(error.response?.data?.error || '添加外部视频失败')
    } finally {
      setExternalSubmitting(false)
    }
  }

  return (
    <div>
      <Header />
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
            <Space>
              <Typography.Title level={2} style={{ margin: 0 }}>
                视频专栏
              </Typography.Title>
              <Tag color="blue">Video Column</Tag>
            </Space>
            <Space>
              <Button icon={<LinkOutlined />} onClick={() => setExternalModalOpen(true)}>
                添加 NotebookLM 链接
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchVideoTopics} loading={loading}>
                刷新列表
              </Button>
              <Button type="primary" icon={<VideoCameraOutlined />} loading={generating} onClick={handleGenerateHotspotVideo}>
                生成当日热点视频
              </Button>
            </Space>
          </Space>

          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            可播放服务器生成的视频，也可以绑定 NotebookLM 外部视频链接，不占用服务器存储空间。
          </Typography.Paragraph>
        </Space>
      </Card>

      <Card title={`视频内容 (${videoTopics.length})`}>
        <List
          loading={loading}
          locale={{ emptyText: <Empty description="暂无视频内容" /> }}
          dataSource={videoTopics}
          renderItem={(item) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <List.Item.Meta
                  title={
                    <Space>
                      <a onClick={() => navigate(`/topic/${item.id}`)}>{item.title}</a>
                      {item.video_url ? <Tag color="green">可播放</Tag> : <Tag>脚本</Tag>}
                      {item.video_external && <Tag color="blue">外链</Tag>}
                    </Space>
                  }
                  description={
                    <Space wrap>
                      <Typography.Text type="secondary">{item.author_name}</Typography.Text>
                      <Typography.Text type="secondary">{new Date(item.created_at).toLocaleString('zh-CN')}</Typography.Text>
                      {(item.tags || []).map((tag) => (
                        <Tag key={`${item.id}-${tag}`}>{tag}</Tag>
                      ))}
                    </Space>
                  }
                />
                {item.video_url && (
                  <>
                    {isNotebookLmUrl(item.video_url) ? (
                      <Card
                        style={{ marginTop: 10, borderRadius: 8, background: '#f8fafc' }}
                        bodyStyle={{ padding: 20 }}
                      >
                        <Space direction="vertical" size={10}>
                          <Tag color="gold">NotebookLM 外部视频</Tag>
                          <Typography.Text>
                            NotebookLM 需要 Google 登录授权，不能直接嵌入本站播放。请点击下方按钮在新窗口打开播放。
                          </Typography.Text>
                          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => window.open(item.video_url, '_blank', 'noopener,noreferrer')}>
                            打开 NotebookLM 视频
                          </Button>
                        </Space>
                      </Card>
                    ) : item.video_external && !isDirectVideoUrl(item.video_url) ? (
                      <iframe
                        title={item.title}
                        src={item.video_url}
                        allow="fullscreen; picture-in-picture"
                        style={{
                          width: '100%',
                          height: 420,
                          marginTop: 10,
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                        }}
                      />
                    ) : (
                      <video
                        controls
                        preload="metadata"
                        style={{ width: '100%', marginTop: 10, borderRadius: 8, background: '#000' }}
                        src={item.video_url}
                      />
                    )}
                    <Button icon={<PlayCircleOutlined />} style={{ marginTop: 8 }} onClick={() => window.open(item.video_url, '_blank')}>
                      打开视频链接
                    </Button>
                  </>
                )}
              </div>
            </List.Item>
          )}
        />
      </Card>

      <Modal title="添加 NotebookLM 视频链接" open={externalModalOpen} onCancel={() => setExternalModalOpen(false)} footer={null} destroyOnClose>
        <Form form={externalForm} layout="vertical" onFinish={handleAddExternalVideo}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="例如：【NotebookLM视频】2026-05-12 法规热点解读" />
          </Form.Item>
          <Form.Item label="NotebookLM 视频链接" name="video_url" rules={[{ required: true, message: '请输入视频链接' }]}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item label="说明" name="content">
            <Input.TextArea rows={4} placeholder="可填写视频摘要或备注" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setExternalModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={externalSubmitting}>
                保存到视频专栏
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default VideoColumn
