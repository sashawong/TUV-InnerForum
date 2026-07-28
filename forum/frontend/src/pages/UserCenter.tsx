import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRightOutlined, MessageOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, List, message, Space, Statistic, Tabs, Tag, theme, Typography } from 'antd'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import Header from '../components/Header'

interface ProfileData {
  id: number
  username: string
  email?: string | null
  role: string
  points: number
  login_streak?: number
  topic_count: number
  reply_count: number
}

interface ReplyMessage {
  id: number
  topic_id: number
  topic_title: string
  content: string
  created_at: string
}

const UserCenter: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
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
          <Statistic title="连续登录" value={profile?.login_streak ?? user.login_streak ?? 0} suffix="天" />
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
              children: <AccountSettings form={form} passwordForm={passwordForm} profile={profile} onUpdated={fetchProfile} />,
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
              label: '消息回复',
              children: <Messages navigate={navigate} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}

const AccountSettings: React.FC<{ form: any; passwordForm: any; profile: ProfileData | null; onUpdated: () => void }> = ({ form, passwordForm, profile, onUpdated }) => {
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const { setUser } = useAuthStore()

  const handleUpdate = async (values: { email?: string }) => {
    setLoading(true)
    try {
      const payload = {
        email: values.email || null,
      }
      const response = await api.put('/user/profile', payload)
      setUser(response.data.user)
      message.success('个人资料已更新')
      onUpdated()
    } catch (error: any) {
      message.error(error.response?.data?.error || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (values: { current_password: string; new_password: string; confirm_password: string }) => {
    setPasswordLoading(true)
    try {
      await api.put('/user/password', {
        current_password: values.current_password,
        new_password: values.new_password,
      })
      message.success('密码已更新')
      passwordForm.resetFields()
    } catch (error: any) {
      message.error(error.response?.data?.error || '密码更新失败')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Form form={form} layout="vertical" onFinish={handleUpdate} initialValues={{ username: profile?.username, email: profile?.email }}>
        <Form.Item label="用户名" name="username">
          <Input disabled />
        </Form.Item>
        <Typography.Paragraph type="secondary" style={{ marginTop: -12 }}>
          用户名作为论坛身份标识，不支持自行修改。
        </Typography.Paragraph>
        <Form.Item label="邮箱" name="email">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存资料
          </Button>
        </Form.Item>
      </Form>

      <Form form={passwordForm} layout="vertical" onFinish={handlePasswordUpdate}>
        <Typography.Title level={4}>修改登录密码</Typography.Title>
        <Form.Item label="当前密码" name="current_password" rules={[{ required: true, message: '请输入当前密码' }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item label="新密码" name="new_password" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '新密码至少 6 位' }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item
          label="确认新密码"
          name="confirm_password"
          dependencies={['new_password']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的新密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={passwordLoading}>
            更新密码
          </Button>
        </Form.Item>
      </Form>
    </Space>
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
  const { token } = theme.useToken()
  const [messages, setMessages] = useState<ReplyMessage[]>([])
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
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          我参与过的回复
        </Typography.Title>
        <Typography.Text type="secondary">
          共 {messages.length} 条，每一条对应你在不同帖子中发表的回复。
        </Typography.Text>
      </div>

      <List
        loading={loading}
        locale={{ emptyText: '还没有参与过帖子回复' }}
        dataSource={messages}
        pagination={
          messages.length > 8
            ? {
                pageSize: 8,
                showSizeChanger: false,
                hideOnSinglePage: true,
                position: 'bottom',
                align: 'center',
              }
            : false
        }
        renderItem={(item) => (
          <List.Item
            style={{
              marginBottom: 12,
              padding: 16,
              cursor: 'pointer',
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorFillAlter,
              transition: 'border-color 160ms ease, transform 160ms ease',
            }}
            onClick={() => navigate(`/topic/${item.topic_id}`)}
          >
            <Space align="start" size={14} style={{ width: '100%' }}>
              <div
                style={{
                  display: 'grid',
                  flex: '0 0 auto',
                  width: 36,
                  height: 36,
                  placeItems: 'center',
                  borderRadius: 10,
                  color: token.colorPrimary,
                  background: token.colorPrimaryBg,
                }}
              >
                <MessageOutlined />
              </div>
              <Space direction="vertical" size={7} style={{ minWidth: 0, width: '100%' }}>
                <Space wrap size={8}>
                  <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                    我的回复
                  </Tag>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(item.created_at).toLocaleString('zh-CN')}
                  </Typography.Text>
                </Space>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  {item.topic_title}
                </Typography.Text>
                <Typography.Paragraph ellipsis={{ rows: 3 }} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {item.content}
                </Typography.Paragraph>
                <Button type="link" size="small" icon={<ArrowRightOutlined />} style={{ width: 'fit-content', paddingInline: 0 }}>
                  查看原帖
                </Button>
              </Space>
            </Space>
          </List.Item>
        )}
      />
    </Space>
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

