import React, { useEffect, useState } from 'react'
import { BellOutlined, LoginOutlined, PlusOutlined, SearchOutlined, TrophyOutlined, UserOutlined } from '@ant-design/icons'
import { Badge, Button, Dropdown, Input, List, Space, Typography } from 'antd'
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

  const userMenuItems = [
    {
      key: 'profile',
      label: <span onClick={() => navigate('/user/settings')}>个人中心</span>,
    },
    {
      key: 'ai',
      label: <span onClick={() => navigate('/ai-assistant')}>AI助手</span>,
    },
    {
      key: 'leaderboard',
      label: <span onClick={() => navigate('/leaderboard')}>积分排行榜</span>,
    },
    {
      key: 'logout',
      label: <span onClick={logout}>退出登录</span>,
    },
  ]

  const handleSearch = () => {
    onSearch?.(searchQuery.trim())
  }

  const handleReadNotifications = async (targetTopicId?: number | null, notificationId?: number) => {
    try {
      if (notificationId) {
        await api.post('/notifications/read', { id: notificationId })
      }
    } catch (error) {
      // ignore
    }

    if (notificationId) {
      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    if (targetTopicId) {
      navigate(`/topic/${targetTopicId}`)
    }
  }

  const notificationMenuItems = [
    {
      key: 'header',
      label: (
        <div style={{ minWidth: 320, maxWidth: 360 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Typography.Text strong>新帖与回复提醒</Typography.Text>
            <Button
              type="link"
              size="small"
              onClick={async () => {
                await api.post('/notifications/read', { all: true })
                setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
                setUnreadCount(0)
              }}
            >
              全部已读
            </Button>
          </div>
          <List
            size="small"
            locale={{ emptyText: '暂无提醒' }}
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                style={{ cursor: item.topic_id ? 'pointer' : 'default', paddingInline: 0 }}
                onClick={() => handleReadNotifications(item.topic_id, item.id)}
              >
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Typography.Text strong={!item.read}>{item.title}</Typography.Text>
                  <Typography.Text type="secondary">{item.content}</Typography.Text>
                  <Typography.Text type="secondary">
                    {new Date(item.created_at).toLocaleString('zh-CN')}
                  </Typography.Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      ),
      disabled: true,
    },
  ]

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
            <Dropdown menu={{ items: notificationMenuItems }} placement="bottomRight" trigger={['click']}>
              <Badge count={unreadCount} size="small">
                <Button icon={<BellOutlined />} />
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
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
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
