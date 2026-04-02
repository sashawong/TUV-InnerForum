import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const response = await api.post('/auth/login', values)
      setAuth(response.data.user, response.data.token)
      message.success('登录成功')
      navigate('/')
    } catch (error: any) {
      message.error(error.response?.data?.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 48px)' }}>
      <Card style={{ width: 420 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          TUV 法规论坛
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          登录后可发帖、回复、积累积分并查看排行榜。
        </Typography.Paragraph>

        <Form onFinish={handleLogin} layout="vertical">
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Login
