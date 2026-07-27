import React from 'react'
import { Card, Switch, Select, Space, Form, Input, Button, Typography, message } from 'antd'
import { useThemeStore, useTranslation } from '../store/themeStore'
import Header from '../components/Header'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'

const Settings: React.FC = () => {
  const { theme, setTheme, language, setLanguage } = useThemeStore()
  const { user } = useAuthStore()
  const t = useTranslation()
  const [form] = Form.useForm()
  const [saving, setSaving] = React.useState(false)

  const handleSaveAi = async (values: any) => {
    setSaving(true)
    try {
      await api.put('/settings/ai', values)
      message.success('AI 设置已保存')
    } catch (error: any) {
      message.error(error.response?.data?.error || 'AI 设置保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header />
      <h2 style={{ marginBottom: 24 }}>{t('settings')}</h2>
      <Card>
        <h3 style={{ marginBottom: 16 }}>{t('themeMode')}</h3>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <span>{t('lightMode')}</span>
            <Switch checked={theme === 'light'} onChange={(checked) => setTheme(checked ? 'light' : 'dark')} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <span>{t('darkMode')}</span>
            <Switch checked={theme === 'dark'} onChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
          </div>
        </Space>

        <h3 style={{ marginTop: 32, marginBottom: 16 }}>{t('language')}</h3>
        <div style={{ padding: '12px 0' }}>
          <Select style={{ width: '100%' }} value={language} onChange={(value) => setLanguage(value)}>
            <Select.Option value="zh">{t('chinese')}</Select.Option>
            <Select.Option value="en">{t('english')}</Select.Option>
          </Select>
        </div>
      </Card>

      {user?.role === 'admin' && (
        <Card style={{ marginTop: 24 }}>
          <Typography.Title level={4}>AI 助手快捷设置</Typography.Title>
          <Typography.Paragraph type="secondary">
            如果你希望直接在设置页里维护 AI 接口，可以在这里更新。更完整的功能入口在左侧“AI助手”。
          </Typography.Paragraph>
          <Form form={form} layout="vertical" onFinish={handleSaveAi} initialValues={{ provider: 'openrouter', base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openrouter/free', enabled: false }}>
            <Form.Item label="启用 AI" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Provider" name="provider">
              <Input />
            </Form.Item>
            <Form.Item label="接口地址" name="base_url">
              <Input />
            </Form.Item>
            <Form.Item label="模型" name="model">
              <Input />
            </Form.Item>
            <Form.Item label="API Key" name="api_key">
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>保存 AI 配置</Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  )
}

export default Settings
