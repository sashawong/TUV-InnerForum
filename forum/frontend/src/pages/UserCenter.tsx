import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, List, message, Space, Statistic, Tabs, Tag, Typography } from 'antd'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import Header from '../components/Header'

interface ProfileData {
  id: number
  username: string
  email?: string | null
  role: string
  points: number
  topic_count: number
  reply_count: number
}

const UserCenter: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm()
  const [profile, setProfile] = useState<ProfileData | null>(null)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user?.id])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/user/profile')
      setProfile(response.data)
      setUser(response.data)
      form.setFieldsValue({
        username: response.data.username,
        email: response.data.email,
      })
    } catch (error) {
      message.error('加载个人资料失败')
    }
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  const getActiveKey = () => {
    const path = location.pathname
    if (path === '/user/favorites') return 'favorites'
    if (path === '/user/history') return 'history'
    if (path === '/user/messages') return 'messages'
    return 'account'
  }

  const handleTabChange = (key: string) => {
    switch (key) {
      case 'favorites':
        navigate('/user/favorites')
        break
      case 'history':
        navigate('/user/history')
        break
      case 'messages':
        navigate('/user/messages')
        break
      default:
        navigate('/user/settings')
    }
  }

  return (
    <div>
      <Header />
      <Typography.Title level={2} style={{ marginBottom: 24 }}>
        个人中心
      </Typography.Title>

      <Card style={{ marginBottom: 24 }}>
        <Space size="large" wrap>
          <Statistic title="当前积分" value={profile?.points ?? user.points ?? 0} />
          <Statistic title="发帖数" value={profile?.topic_count ?? 0} />
          <Statistic title="回复数" value={profile?.reply_count ?? 0} />
          <Button onClick={() => navigate('/leaderboard')}>查看积分排行榜</Button>
        </Space>
      </Card>

      <Card>
        <Tabs
          activeKey={getActiveKey()}
          onChange={handleTabChange}
          items={[
            {
              key: 'account',
              label: '账号设置',
              children: <AccountSettings form={form} profile={profile} onUpdated={fetchProfile} />,
            },
            {
              key: 'favorites',
              label: '我的收藏',
              children: <Favorites navigate={navigate} />,
            },
            {
              key: 'history',
              label: '我的帖子',
              children: <History navigate={navigate} />,
            },
            {
              key: 'messages',
              label: '我的回复',
              children: <Messages navigate={navigate} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}

const AccountSettings: React.FC<{ form: any; profile: ProfileData | null; onUpdated: () => void }> = ({ form, profile, onUpdated }) => {
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()

  const handleUpdate = async (values: { username: string; password?: string; email?: string }) => {
    setLoading(true)
    try {
      const payload = {
        username: values.username,
        password: values.password || undefined,
        email: values.email || null,
      }
      const response = await api.put('/user/profile', payload)
      setUser(response.data.user)
      message.success('个人资料已更新')
      onUpdated()
      form.setFieldsValue({ password: '' })
    } catch (error: any) {
      message.error(error.response?.data?.error || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form form={form} layout="vertical" onFinish={handleUpdate} initialValues={{ username: profile?.username, email: profile?.email }}>
      <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
        <Input />
      </Form.Item>
      <Form.Item label="邮箱" name="email">
        <Input />
      </Form.Item>
      <Form.Item label="新密码" name="password">
        <Input.Password placeholder="不修改可留空" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          保存设置
        </Button>
      </Form.Item>
    </Form>
  )
}

const Favorites: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true)
      try {
        const response = await api.get('/user/favorites')
        setFavorites(response.data)
      } catch (error) {
        message.error('加载收藏失败')
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [])

  return <TopicList data={favorites} loading={loading} navigate={navigate} emptyText="还没有收藏的帖子" />
}

const History: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const response = await api.get('/user/history')
        setHistory(response.data)
      } catch (error) {
        message.error('加载历史失败')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  return <TopicList data={history} loading={loading} navigate={navigate} emptyText="还没有发布过帖子" />
}

const Messages: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      try {
        const response = await api.get('/user/messages')
        setMessages(response.data)
      } catch (error) {
        message.error('加载回复失败')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [])

  return (
    <List
      loading={loading}
      locale={{ emptyText: '还没有回复记录' }}
      dataSource={messages}
      renderItem={(item) => (
        <List.Item onClick={() => navigate(`/topic/${item.topic_id}`)} style={{ cursor: 'pointer' }}>
          <List.Item.Meta
            title={item.topic_title}
            description={
              <div>
                <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                  {item.content}
                </Typography.Paragraph>
                <Typography.Text type="secondary">
                  回复时间：{new Date(item.created_at).toLocaleString('zh-CN')}
                </Typography.Text>
              </div>
            }
          />
        </List.Item>
      )}
    />
  )
}

const TopicList: React.FC<{ data: any[]; loading: boolean; navigate: (path: string) => void; emptyText: string }> = ({
  data,
  loading,
  navigate,
  emptyText,
}) => (
  <List
    loading={loading}
    locale={{ emptyText }}
    dataSource={data}
    renderItem={(item) => (
      <List.Item onClick={() => navigate(`/topic/${item.id}`)} style={{ cursor: 'pointer' }}>
        <List.Item.Meta
          title={item.title}
          description={
            <div>
              <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                {item.content}
              </Typography.Paragraph>
              <Space wrap>
                <Typography.Text type="secondary">
                  {new Date(item.created_at).toLocaleString('zh-CN')}
                </Typography.Text>
                {item.tags?.map((tag: string) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            </div>
          }
        />
      </List.Item>
    )}
  />
)

export default UserCenter

