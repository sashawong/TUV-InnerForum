import React from 'react'
import { Layout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  DashboardOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../store/themeStore'

const { Sider } = Layout

interface SidebarProps {
  isMobile?: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const t = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout()
      return
    }
    navigate(key)
  }

  const getSelectedKeys = () => {
    const path = location.pathname
    if (path.startsWith('/user/')) return [path]
    if (path.startsWith('/admin/')) return ['/admin']
    return [path]
  }

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: t('home'),
    },
    {
      key: 'user',
      icon: <UserOutlined />,
      label: t('userCenter'),
      children: [
        {
          key: '/user/settings',
          label: t('accountSettings'),
        },
        {
          key: '/user/favorites',
          label: t('favorites'),
        },
        {
          key: '/user/history',
          label: t('history'),
        },
      ],
    },
    {
      key: 'other',
      icon: <SettingOutlined />,
      label: t('settings'),
      children: [
        {
          key: '/settings',
          label: t('themeMode'),
        },
        {
          key: '/help',
          label: t('help'),
        },
      ],
    },
  ]

  if (user?.role === 'admin') {
    menuItems.push({
      key: '/admin',
      icon: <DashboardOutlined />,
      label: '后台管理',
    })
  }

  if (user) {
    menuItems.push({
      type: 'divider' as const,
    })
    menuItems.push({
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('logout'),
    })
  }

  const sidebarContent = (
    <>
      <div style={{ 
        padding: '24px', 
        fontSize: '18px', 
        fontWeight: 'bold', 
        textAlign: 'center',
        borderBottom: '1px solid var(--border-color)',
        color: 'var(--text-color)',
        marginBottom: '16px'
      }}>
        {t('forumTitle')}
      </div>
      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        style={{ width: '100%', borderRight: 0 }}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  )

  if (isMobile) {
    return <div style={{ width: '100%' }}>{sidebarContent}</div>
  }

  return (
    <Sider width={200} style={{ background: 'var(--card-bg)' }}>
      {sidebarContent}
    </Sider>
  )
}

export default Sidebar