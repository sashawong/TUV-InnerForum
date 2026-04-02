import React, { useEffect, useState } from 'react'
import { Space, Button, Dropdown, Input, Typography } from 'antd'
import { SearchOutlined, PlusOutlined, UserOutlined, LoginOutlined, TrophyOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface HeaderProps {
  showSearch?: boolean
  showCreateButton?: boolean
  onSearch?: (query: string) => void
  searchValue?: string
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

  useEffect(() => {
    setSearchQuery(searchValue)
  }, [searchValue])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const userMenuItems = [
    {
      key: 'profile',
      label: <span onClick={() => navigate('/user/settings')}>个人中心</span>,
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
          TUV 法规论坛
        </Typography.Title>
        <Typography.Text type="secondary">
          交流法规、测试和认证经验
        </Typography.Text>
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
            <Button icon={<TrophyOutlined />} onClick={() => navigate('/leaderboard')}>
              {user.points ?? 0} 积分
            </Button>
            {showCreateButton && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => window.dispatchEvent(new CustomEvent('createTopic'))}
              >
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
