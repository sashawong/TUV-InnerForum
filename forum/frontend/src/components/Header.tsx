import React, { useEffect, useState } from 'react'
import {
  BellOutlined,
  LoginOutlined,
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Badge, Button, Dropdown, Empty, Input, List, Space, theme, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'

interface HeaderProps {
  showSearch?: boolean
  showCreateButton?: boolean
  onSearch?: (query: string) => void
  searchValue?: string
}

interface NotificationItem {
  id: number
  type: string
  title: string
  content: string
  topic_id?: number | null
  read: boolean
  created_at: string
}

const Header: React.FC<HeaderProps> = ({
  showSearch = false,
  showCreateButton = false,
  onSearch,
  searchValue = '',
}) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { token } = theme.useToken()
  const [searchQuery, setSearchQuery] = useState(searchValue)
  const [isMobile, setIsMobile] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    setSearchQuery(searchValue)
  }, [searchValue])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    let mounted = true

    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications')
        if (!mounted) return
        setNotifications(response.data.notifications.slice(0, 8))
        setUnreadCount(response.data.unread_count)
      } catch (error) {
        // ignore polling failures in header
      }
    }

    fetchNotifications()
    const timer = window.setInterval(fetchNotifications, 30000)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [user?.id])

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人中心',
    },
    {
      key: 'messages',
      icon: <MessageOutlined />,
      label: '消息回复',
    },
    {
      key: 'ai',
      label: 'AI助手',
    },
    {
      key: 'leaderboard',
      label: '积分排行榜',
    },
    {
      key: 'logout',
      danger: true,
      label: '退出登录',
    },
  ]

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    const routes: Record<string, string> = {
      profile: '/user/settings',
      messages: '/user/messages',
      ai: '/ai-assistant',
      leaderboard: '/leaderboard',
    }

    if (key === 'logout') {
      logout()
      navigate('/login')
      return
    }

    if (routes[key]) {
      navigate(routes[key])
    }
  }

  const handleSearch = () => {
    onSearch?.(searchQuery.trim())
  }

  const handleReadNotifications = async (targetTopicId?: number | null, notificationId?: number) => {
    const notification = notifications.find((item) => item.id === notificationId)

    try {
      if (notificationId) {
        await api.post('/notifications/read', { id: notificationId })
      }
    } catch (error) {
      // ignore
    }

    if (notificationId) {
      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)))
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }

    if (targetTopicId) {
      navigate(`/topic/${targetTopicId}`)
    }
  }

  const handleReadAllNotifications = async () => {
    try {
      await api.post('/notifications/read', { all: true })
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
      setUnreadCount(0)
    } catch (error) {
      // Keep the current state when the request fails.
    }
  }

  const notificationPanel = (
    <div
      style={{
        width: 'min(380px, calc(100vw - 32px))',
        overflow: 'hidden',
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgElevated,
        boxShadow: token.boxShadowSecondary,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px 10px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div>
          <Typography.Text strong style={{ display: 'block' }}>
            消息提醒
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            新帖、回复与互动动态
          </Typography.Text>
        </div>
        <Button type="link" size="small" disabled={unreadCount === 0} onClick={handleReadAllNotifications}>
          全部已读
        </Button>
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto', padding: '0 16px' }}>
        <List
          size="small"
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无消息提醒" /> }}
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                cursor: item.topic_id ? 'pointer' : 'default',
                padding: '12px 0',
                opacity: item.read ? 0.72 : 1,
              }}
              onClick={() => handleReadNotifications(item.topic_id, item.id)}
            >
              <Space align="start" size={10} style={{ width: '100%' }}>
                <Badge status={item.read ? 'default' : 'processing'} style={{ marginTop: 7 }} />
                <Space direction="vertical" size={2} style={{ minWidth: 0, width: '100%' }}>
                  <Typography.Text strong={!item.read}>{item.title}</Typography.Text>
                  <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                    {item.content}
                  </Typography.Paragraph>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(item.created_at).toLocaleString('zh-CN')}
                  </Typography.Text>
                </Space>
              </Space>
            </List.Item>
          )}
        />
      </div>

      <div style={{ padding: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <Button type="primary" ghost block icon={<MessageOutlined />} onClick={() => navigate('/user/messages')}>
          进入消息回复
        </Button>
      </div>
    </div>
  )

  return (
    <div
      style={{
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 12,
      }}
    >
      <div>
        <Typography.Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
          全球车辆法规分享论坛
        </Typography.Title>
        <Typography.Text type="secondary">交流车辆法规、测试和认证经验</Typography.Text>
      </div>

      <Space size="middle" wrap style={{ width: isMobile ? '100%' : 'auto', justifyContent: 'flex-end' }}>
        {showSearch && (
          <Space.Compact style={{ width: isMobile ? '100%' : 320 }}>
            <Input
              placeholder="搜索标题、正文、标签、作者或回复内容"
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
          </Space.Compact>
        )}

        {user ? (
          <>
            <Dropdown
              menu={{ items: [] }}
              dropdownRender={() => notificationPanel}
              placement="bottomRight"
              trigger={['click']}
              arrow
            >
              <Badge count={unreadCount} size="small">
                <Button icon={<BellOutlined />}>消息</Button>
              </Badge>
            </Dropdown>
            <Button icon={<TrophyOutlined />} onClick={() => navigate('/leaderboard')}>
              {user.points ?? 0} 积分
            </Button>
            {showCreateButton && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => window.dispatchEvent(new CustomEvent('createTopic'))}>
                新建帖子
              </Button>
            )}
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <Button icon={<UserOutlined />}>{user.username}</Button>
            </Dropdown>
          </>
        ) : (
          <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
            登录
          </Button>
        )}
      </Space>
    </div>
  )
}

export default Header
