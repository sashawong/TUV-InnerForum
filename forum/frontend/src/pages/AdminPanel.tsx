import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import Header from '../components/Header'

const AdminPanel: React.FC = () => {
  const { user } = useAuthStore()

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" />
  }

  return (
    <div>
      <Header />
      <h1 style={{ marginBottom: 24 }}>后台管理</h1>
      <Card>
        <Tabs
          defaultActiveKey="users"
          items={[
            {
              key: 'users',
              label: '用户管理',
              children: <UserManagement />,
            },
            {
              key: 'topics',
              label: '帖子管理',
              children: <TopicManagement />,
            },
          ]}
        />
      </Card>
    </div>
  )
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [form] = Form.useForm()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data)
    } catch (error) {
      message.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = async (values: any) => {
    try {
      await api.post('/admin/users', values)
      message.success('创建用户成功')
      setModalVisible(false)
      form.resetFields()
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建用户失败')
    }
  }

  const handleUpdate = async (values: any) => {
    try {
      await api.put(`/admin/users/${editingUser.id}`, values)
      message.success('更新用户成功')
      setModalVisible(false)
      setEditingUser(null)
      form.resetFields()
      fetchUsers()
    } catch (error) {
      message.error('更新用户失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/admin/users/${id}`)
      message.success('删除用户成功')
      fetchUsers()
    } catch (error) {
      message.error('删除用户失败')
    }
  }

  const openModal = (user?: any) => {
    if (user) {
      setEditingUser(user)
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        role: user.role,
      })
    } else {
      setEditingUser(null)
      form.resetFields()
    }
    setModalVisible(true)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <span>{role === 'admin' ? '管理员' : '用户'}</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => openModal()}
        style={{ marginBottom: 16 }}
      >
        新建用户
      </Button>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
      />
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingUser(null)
          form.resetFields()
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingUser ? handleUpdate : handleCreate}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={editingUser ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder={editingUser ? '留空则不修改' : '请输入密码'} />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Select.Option value="user">用户</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingUser ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

const TopicManagement: React.FC = () => {
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTopics = async () => {
    setLoading(true)
    try {
      const response = await api.get('/topics')
      setTopics(response.data)
    } catch (error) {
      message.error('加载帖子列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopics()
  }, [])

  const handlePin = async (id: number, isPinned: boolean) => {
    try {
      await api.put(`/topics/${id}/pin`, { is_pinned: !isPinned })
      message.success(isPinned ? '已取消置顶' : '已置顶')
      fetchTopics()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/topics/${id}`)
      message.success('删除成功')
      fetchTopics()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '作者', dataIndex: 'author_name', key: 'author_name' },
    {
      title: '类型',
      dataIndex: 'post_type',
      key: 'post_type',
      render: (type: string) => (type === 'share' ? '分享' : '求助'),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string) => tags || '-',
    },
    {
      title: '置顶',
      dataIndex: 'is_pinned',
      key: 'is_pinned',
      render: (isPinned: number) => (isPinned ? '是' : '否'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            onClick={() => handlePin(record.id, record.is_pinned)}
          >
            {record.is_pinned ? '取消置顶' : '置顶'}
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个帖子吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={topics}
      rowKey="id"
      loading={loading}
    />
  )
}

export default AdminPanel