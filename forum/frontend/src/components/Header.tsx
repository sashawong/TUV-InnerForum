import React, { useState, useEffect } from 'react'
import { Space, Button, Dropdown, Input, message } from 'antd'
import { SearchOutlined, PlusOutlined, UserOutlined, LoginOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface HeaderProps {
  showSearch?: boolean
  showCreateButton?: boolean
  onSearch?: (query: string) => void
}

const Header: React.FC<HeaderProps> = ({
  showSearch = false,
  showCreateButton = false,
  onSearch
}) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const userMenuItems = [
    {
      key: 'profile',
      label: <span onClick={() => navigate('/user/settings')}>个人设置</span>,
    },
    {
      key: 'logout',
      label: <span onClick={logout}>退出登录</span>,
    },
  ]

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchQuery)
    }
  }

  return (
    <div style={{
      marginBottom: 24,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 12 : 0
    }}>
      <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem' }}>轮胎法规分享论坛</h1>
      <Space size={isMobile ? 'small' : 'middle'} style={{ width: isMobile ? '100%' : 'auto' }}>
        {showSearch && (
          <Space.Compact style={{ width: isMobile ? '100%' : 'auto' }}>
            <Input
              placeholder="搜索帖子..."
              prefix={<SearchOutlined />}
              style={{ width: isMobile ? '100%' : 250 }}
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
          <Space size={isMobile ? 'small' : 'middle'} style={{ width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
            {showCreateButton && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => {
                  // 触发自定义事件，让父组件处理新建帖子逻辑
                  const event = new CustomEvent('createTopic')
                  window.dispatchEvent(event)
                }}
                style={{ width: isMobile ? '48%' : 'auto' }}
              >
                新建帖子
              </Button>
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button icon={<UserOutlined />} style={{ width: isMobile ? '48%' : 'auto' }}>
                {user.username}
              </Button>
            </Dropdown>
          </Space>
        ) : (
          <Button 
            type="primary" 
            icon={<LoginOutlined />} 
            onClick={() => navigate('/login')}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            登录
          </Button>
        )}
      </Space>
    </div>
  )
}

export default Header