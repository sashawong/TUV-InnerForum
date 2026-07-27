import React from 'react'
import { Layout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  DashboardOutlined,
  LogoutOutlined,
  TrophyOutlined,
  RobotOutlined,
  VideoCameraOutlined,
  BulbOutlined,
  CarOutlined,
  SafetyCertificateOutlined,
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

  const menuItems: any[] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: t('home'),
    },
    {
      key: '/forum',
      icon: <SafetyCertificateOutlined />,
      label: '轮胎法规',
    },
    {
      key: '/leaderboard',
      icon: <TrophyOutlined />,
      label: '积分排行榜',
    },
    {
      key: '/video-column',
      icon: <VideoCameraOutlined />,
      label: '视频专栏',
    },
    {
      key: '/lighting',
      icon: <BulbOutlined />,
      label: '灯具',
    },
    {
      key: '/vehicle',
      icon: <CarOutlined />,
      label: '整车',
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
        {
          key: '/user/messages',
          label: t('messages'),
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
          key: '/ai-assistant',
          icon: <RobotOutlined />,
          label: 'AI助手',
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
    menuItems.push({ type: 'divider' as const })
    menuItems.push({
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('logout'),
    })
  }

  const sidebarContent = (
    <>
      <div
        style={{
          padding: '20px 18px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, var(--brand-blue) 0%, var(--brand-blue-dark) 100%)',
            color: '#fff',
            padding: '16px',
            borderRadius: 6,
            boxShadow: '0 10px 24px rgba(0, 79, 133, 0.22)',
          }}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <span style={{ width: 30, height: 4, background: 'var(--brand-yellow)', display: 'block' }} />
            <span style={{ width: 30, height: 4, background: 'var(--brand-green)', display: 'block' }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>TUV Forum</div>
          <div style={{ fontSize: 12, opacity: 0.88, marginTop: 6 }}>{t('forumTitle')}</div>
        </div>
      </div>
      <Menu mode="inline" selectedKeys={getSelectedKeys()} style={{ width: '100%', borderRight: 0 }} items={menuItems} onClick={handleMenuClick} />
    </>
  )

  if (isMobile) {
    return <div style={{ width: '100%' }}>{sidebarContent}</div>
  }

  return <Sider width={220} style={{ background: 'var(--card-bg)' }}>{sidebarContent}</Sider>
}

export default Sidebar
