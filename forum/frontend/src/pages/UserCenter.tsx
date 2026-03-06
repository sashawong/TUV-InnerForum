import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Card, Tabs, Form, Input, Button, message, List, Tag, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { useThemeStore, useTranslation } from '../store/themeStore'
import Settings from './Settings'
import Header from '../components/Header'

const UserCenter: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm()
  const t = useTranslation()

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
      <h1 style={{ marginBottom: 24 }}>{t('userCenter')}</h1>
      <Card>
        <Tabs
          activeKey={getActiveKey()}
          onChange={handleTabChange}
          items={[
            {
              key: 'account',
              label: t('accountSettings'),
              children: <AccountSettings form={form} user={user} />,
            },
            {
              key: 'favorites',
              label: t('favorites'),
              children: <Favorites navigate={navigate} />,
            },
            {
              key: 'history',
              label: t('history'),
              children: <History navigate={navigate} />,
            },
            {
              key: 'messages',
              label: t('messages'),
              children: <Messages navigate={navigate} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}

const AccountSettings: React.FC<{ form: any; user: any }> = ({ form, user }) => {
  const [loading, setLoading] = useState(false)
  const t = useTranslation()

  const handleUpdate = async (values: any) => {
    setLoading(true)
    try {
      await api.put(`/admin/users/${user.id}`, values)
      message.success(t('saveSettings'))
    } catch (error) {
      message.error(t('operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ username: user.username }}
      onFinish={handleUpdate}
    >
      <Form.Item
        label={t('username')}
        name="username"
        rules={[{ required: true, message: t('username') }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label={t('newPassword')} name="password">
        <Input.Password />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          {t('saveSettings')}
        </Button>
      </Form.Item>
    </Form>
  )
}

const Favorites: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    fetchFavorites()
  }, [])

  const getTagColor = (tag: string) => {
    const colors: { [key: string]: string } = {
      UNECE: 'blue',
      EU: 'green',
      MAS: 'orange',
      TEST: 'purple',
    }
    return colors[tag] || 'default'
  }

  return (
    <List
      loading={loading}
      dataSource={favorites}
      renderItem={(item) => (
        <List.Item
          onClick={() => navigate(`/topic/${item.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <List.Item.Meta
            title={item.title}
            description={
              <div>
                <div>{item.content.substring(0, 50)}...</div>
                <div style={{ marginTop: 8 }}>
                  {item.tags && (Array.isArray(item.tags) ? item.tags : item.tags.split(',')).map((tag: string, index: number) => (
                    <Tag key={index} color={getTagColor(tag.trim())}>
                      {tag.trim().toUpperCase()}
                    </Tag>
                  ))}
                </div>
              </div>
            }
          />
        </List.Item>
      )}
    />
  )
}

const History: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await api.get('/user/history')
      setHistory(response.data)
    } catch (error) {
      message.error('加载历史记录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const getTagColor = (tag: string) => {
    const colors: { [key: string]: string } = {
      UNECE: 'blue',
      EU: 'green',
      MAS: 'orange',
      TEST: 'purple',
    }
    return colors[tag] || 'default'
  }

  return (
    <List
      loading={loading}
      dataSource={history}
      renderItem={(item) => (
        <List.Item
          onClick={() => navigate(`/topic/${item.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <List.Item.Meta
            title={item.title}
            description={
              <div>
                <div>{item.content.substring(0, 50)}...</div>
                <div style={{ marginTop: 8 }}>
                  <span>发布时间: {new Date(item.created_at).toLocaleString('zh-CN')}</span>
                  {item.tags && (Array.isArray(item.tags) ? item.tags : item.tags.split(',')).map((tag: string, index: number) => (
                    <Tag key={index} color={getTagColor(tag.trim())} style={{ marginLeft: 8 }}>
                      {tag.trim().toUpperCase()}
                    </Tag>
                  ))}
                </div>
              </div>
            }
          />
        </List.Item>
      )}
    />
  )
}

const Messages: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const t = useTranslation()

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const response = await api.get('/user/messages')
      setMessages(response.data)
    } catch (error) {
      message.error(t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  return (
    <List
      loading={loading}
      dataSource={messages}
      renderItem={(item) => (
        <List.Item
          onClick={() => navigate(`/topic/${item.topic_id}`)}
          style={{ cursor: 'pointer' }}
        >
          <List.Item.Meta
            title={item.topic_title}
            description={
              <div>
                <div>{item.content.substring(0, 50)}...</div>
                <div style={{ marginTop: 8 }}>
                  <span>{t('publishTime')}: {new Date(item.created_at).toLocaleString('zh-CN')}</span>
                </div>
              </div>
            }
          />
        </List.Item>
      )}
    />
  )
}

export default UserCenter