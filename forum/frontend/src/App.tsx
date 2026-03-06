import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { App as AntApp, Layout, Button, Drawer, Breakpoint } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import TopicDetail from './pages/TopicDetail'
import UserCenter from './pages/UserCenter'
import Settings from './pages/Settings'
import Login from './pages/Login'
import AdminPanel from './pages/AdminPanel'
import { useAuthStore } from './store/authStore'
import ThemeProvider from './components/ThemeProvider'

const { Content } = Layout

function App() {
  const { user } = useAuthStore()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!user) {
    return (
      <ThemeProvider>
        <AntApp>
          <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            <Content style={{ padding: '24px', background: 'var(--bg-color)' }}>
              <Login />
            </Content>
          </Layout>
        </AntApp>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <AntApp>
        <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
          {!isMobile ? (
            <Sidebar isMobile={false} />
          ) : (
            <>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setSidebarVisible(true)}
                style={{
                  position: 'fixed',
                  top: 16,
                  left: 16,
                  zIndex: 1000,
                  background: 'var(--card-bg)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              />
              <Drawer
                title="菜单"
                placement="left"
                onClose={() => setSidebarVisible(false)}
                open={sidebarVisible}
                width={256}
              >
                <Sidebar isMobile={true} />
              </Drawer>
            </>
          )}
          <Layout>
            <Content style={{ 
              padding: '24px', 
              background: 'var(--bg-color)',
              minHeight: '100vh'
            }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/topic/:id" element={<TopicDetail />} />
                <Route path="/user/*" element={<UserCenter />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route 
                  path="/admin/*" 
                  element={user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" replace />} 
                />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </AntApp>
    </ThemeProvider>
  )
}

export default App