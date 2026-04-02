import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Input, message, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Navigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import Header from '../components/Header'

interface AdminUser {
  id: number
  username: string
  email?: string | null
  role: string
  points: number
  created_at: string
}

interface AdminTopic {
  id: number
  title: string
  content: string
  author_name: string
  created_at: string
  is_pinned: number
  post_type: string
  tags: string[]
  like_count: number
  dislike_count: number
  reply_count: number
}

const AdminPanel: React.FC = () => {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [topics, setTopics] = useState<AdminTopic[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [savingUser, setSavingUser] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
      fetchTopics()
    }
  }, [user?.role])

  if (user?.role !== 'admin') {
    return <Navigate to="/" />
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data)
    } catch (error) {
      message.error('加载用户列表失败')
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchTopics = async () => {
    setLoadingTopics(true)
    try {
      const response = await api.get('/topics')
      setTopics(response.data)
    } catch (error) {
      message.error('加载帖子列表失败')
    } finally {
      setLoadingTopics(false)
    }
  }

  const openCreateUser = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({ role: 'user' })
    setUserModalOpen(true)
  }

  const openEditUser = (record: AdminUser) => {
    setEditingUser(record)
    form.setFieldsValue({
      username: record.username,
      email: record.email,
      role: record.role,
      password: '',
    })
    setUserModalOpen(true)
  }

  const handleSaveUser = async (values: { username: string; email?: string; role: string; password?: string }) => {
    setSavingUser(true)
    try {
      const payload = {
        username: values.username,
        email: values.email || null,
        role: values.role,
        password: values.password || undefined,
      }

      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, payload)
        message.success('用户已更新')
      } else {
        if (!values.password) {
          message.warning('新建用户时请输入密码')
          return
        }
        await api.post('/admin/users', payload)
        message.success('用户已创建')
      }

      setUserModalOpen(false)
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存用户失败')
    } finally {
      setSavingUser(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    try {
      await api.delete(`/admin/users/${userId}`)
      message.success('用户已删除')
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除用户失败')
    }
  }

  const handleTogglePin = async (topic: AdminTopic, checked: boolean) => {
    try {
      await api.put(`/topics/${topic.id}/pin`, { is_pinned: checked })
      message.success(checked ? '帖子已置顶' : '已取消置顶')
      fetchTopics()
    } catch (error) {
      message.error('更新置顶状态失败')
    }
  }

  const handleDeleteTopic = async (topicId: number) => {
    try {
      await api.delete(`/topics/${topicId}`)
      message.success('帖子已删除')
      fetchTopics()
    } catch (error) {
      message.error('删除帖子失败')
    }
  }

  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (value: string | null) => value || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (value: string) => <Tag color={value === 'admin' ? 'red' : 'blue'}>{value}</Tag>,
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: AdminUser) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditUser(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除这个用户吗？" onConfirm={() => handleDeleteUser(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const topicColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (value: string, record: AdminTopic) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{record.author_name}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: '类型/标签',
      key: 'meta',
      render: (_: unknown, record: AdminTopic) => (
        <Space wrap>
          <Tag color={record.post_type === 'share' ? 'cyan' : 'magenta'}>
            {record.post_type === 'share' ? '分享' : '求助'}
          </Tag>
          {record.tags?.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '互动',
      key: 'stats',
      render: (_: unknown, record: AdminTopic) => `赞 ${record.like_count} / 踩 ${record.dislike_count} / 回复 ${record.reply_count}`,
    },
    {
      title: '置顶',
      key: 'pin',
      render: (_: unknown, record: AdminTopic) => (
        <Switch checked={record.is_pinned === 1} onChange={(checked) => handleTogglePin(record, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: AdminTopic) => (
        <Popconfirm title="确认删除这个帖子吗？" onConfirm={() => handleDeleteTopic(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Header />
      <Typography.Title level={2} style={{ marginBottom: 24 }}>
        后台管理
      </Typography.Title>

      <Tabs
        items={[
          {
            key: 'users',
            label: '用户管理',
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateUser}>
                    新建用户
                  </Button>
                }
              >
                <Table rowKey="id" loading={loadingUsers} columns={userColumns} dataSource={users} pagination={{ pageSize: 8 }} />
              </Card>
            ),
          },
          {
            key: 'topics',
            label: '帖子管理',
            children: (
              <Card>
                <Table rowKey="id" loading={loadingTopics} columns={topicColumns} dataSource={topics} pagination={{ pageSize: 8 }} />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={userModalOpen}
        onCancel={() => setUserModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input />
          </Form.Item>
          <Form.Item label={editingUser ? '重置密码' : '密码'} name="password">
            <Input.Password placeholder={editingUser ? '不修改可留空' : '请输入密码'} />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              options={[
                { value: 'user', label: 'user' },
                { value: 'admin', label: 'admin' },
              ]}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setUserModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={savingUser}>
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminPanel

