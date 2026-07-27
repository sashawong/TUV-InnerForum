import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, List, message, Space, Switch, Tag, Typography } from 'antd'
import Header from '../components/Header'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'

interface TopicOption {
  id: number
  title: string
  author_name: string
  tags: string[]
  reply_count: number
  created_at: string
}

interface AiSettings {
  provider: string
  base_url: string
  model: string
  api_key: string
  enabled: boolean
}

const AIAssistant: React.FC = () => {
  const { user } = useAuthStore()
  const [topics, setTopics] = useState<TopicOption[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [summaryForm] = Form.useForm()
  const [settingsForm] = Form.useForm()

  useEffect(() => {
    fetchTopics()
    fetchAiSettings()
  }, [])

  const fetchTopics = async () => {
    setLoading(true)
    try {
      const response = await api.get('/topics')
      setTopics(response.data)
    } catch (error) {
      message.error('加载帖子失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchAiSettings = async () => {
    try {
      const response = await api.get('/settings/ai')
      setSettings(response.data)
      settingsForm.setFieldsValue(response.data)
    } catch (error) {
      // ignore for non-admin failures
    }
  }

  const handleGenerateSummary = async (values: { count: number }) => {
    setGenerating(true)
    try {
      const response = await api.post('/ai/reports/summary', { count: values.count })
      message.success(`AI 已汇总最近 ${response.data.source_count || values.count} 帖，并生成新帖`)
      fetchTopics()
      if (response.data.topic_id) {
        window.open(`/topic/${response.data.topic_id}`, '_self')
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'AI 生成汇总失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveSettings = async (values: AiSettings) => {
    setSettingsLoading(true)
    try {
      const response = await api.put('/settings/ai', values)
      setSettings(response.data.settings)
      settingsForm.setFieldsValue(response.data.settings)
      message.success('AI 设置已保存')
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存 AI 设置失败')
    } finally {
      setSettingsLoading(false)
    }
  }

  const recentTopics = topics.slice(0, 10)

  return (
    <div>
      <Header />
      <Typography.Title level={2}>AI 助手</Typography.Title>
      <Typography.Paragraph type="secondary">
        AI 法规助手现在会按最近若干篇帖子和回复生成一篇新的汇总贴。帖子详情页保留“邀请AI回答”，汇总入口统一放在这里。
      </Typography.Paragraph>

      {user?.role === 'admin' && (
        <Card title="AI 接入设置" style={{ marginBottom: 24 }}>
          <Typography.Paragraph type="secondary">
            可以在这里配置 OpenRouter、豆包等 OpenAI 兼容接口。启用后，AI 法规助手会使用这里的模型生成回复和汇总贴。
          </Typography.Paragraph>
          <Form form={settingsForm} layout="vertical" onFinish={handleSaveSettings} initialValues={settings || undefined}>
            <Form.Item label="启用 AI 助手" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Provider" name="provider">
              <Input />
            </Form.Item>
            <Form.Item label="接口地址" name="base_url" rules={[{ required: true, message: '请输入接口地址' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="模型" name="model" rules={[{ required: true, message: '请输入模型名' }]}>
              <Input placeholder="例如 openrouter/free 或 doubao 模型名" />
            </Form.Item>
            <Form.Item label="API Key" name="api_key">
              <Input.Password placeholder="填写后保存到服务端" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={settingsLoading}>
                保存 AI 设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Card title="生成论坛汇总贴" style={{ marginBottom: 24 }}>
        <Typography.Paragraph type="secondary">
          选择要汇总的最近帖子数量，AI 会自动读取这些帖子的正文和回复，生成一篇新的总结帖。
        </Typography.Paragraph>
        <Form form={summaryForm} layout="inline" initialValues={{ count: 10 }} onFinish={handleGenerateSummary}>
          <Form.Item label="汇总最近" name="count" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} max={50} precision={0} />
          </Form.Item>
          <Typography.Text>篇帖子</Typography.Text>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={generating}>
              {generating ? '正在生成汇总贴...' : '生成新帖'}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="最近帖子预览">
        <List
          loading={loading}
          locale={{ emptyText: '暂无可汇总的帖子' }}
          dataSource={recentTopics}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                title={`#${index + 1} ${item.title}`}
                description={
                  <Space wrap>
                    <Typography.Text type="secondary">{item.author_name}</Typography.Text>
                    <Typography.Text type="secondary">回复 {item.reply_count}</Typography.Text>
                    <Typography.Text type="secondary">{new Date(item.created_at).toLocaleString('zh-CN')}</Typography.Text>
                    {item.tags?.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}

export default AIAssistant
