import React from 'react'
import { Card, Switch, Select, Space } from 'antd'
import { useThemeStore, useTranslation } from '../store/themeStore'
import Header from '../components/Header'

const Settings: React.FC = () => {
  const { theme, setTheme, language, setLanguage } = useThemeStore()
  const t = useTranslation()

  return (
    <div>
      <Header />
      <h2 style={{ marginBottom: 24 }}>{t('settings')}</h2>
      <Card>
        <h3 style={{ marginBottom: 16 }}>{t('themeMode')}</h3>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <span>{t('lightMode')}</span>
            <Switch
              checked={theme === 'light'}
              onChange={(checked) => setTheme(checked ? 'light' : 'dark')}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <span>{t('darkMode')}</span>
            <Switch
              checked={theme === 'dark'}
              onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </Space>

        <h3 style={{ marginTop: 32, marginBottom: 16 }}>{t('language')}</h3>
        <div style={{ padding: '12px 0' }}>
          <Select
            style={{ width: '100%' }}
            value={language}
            onChange={(value) => setLanguage(value)}
          >
            <Select.Option value="zh">{t('chinese')}</Select.Option>
            <Select.Option value="en">{t('english')}</Select.Option>
          </Select>
        </div>
      </Card>
    </div>
  )
}

export default Settings