import React, { useEffect } from 'react'
import { ConfigProvider, theme } from 'antd'
import { useThemeStore } from '../store/themeStore'

interface ThemeProviderProps {
  children: React.ReactNode
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme: currentTheme } = useThemeStore()

  const antdTheme = {
    algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#0071b9',
      colorInfo: '#0071b9',
      colorSuccess: '#65b32e',
      colorWarning: '#f2c300',
      colorBgContainer: currentTheme === 'dark' ? '#13202b' : '#ffffff',
      colorBgElevated: currentTheme === 'dark' ? '#172838' : '#ffffff',
      colorBgLayout: currentTheme === 'dark' ? '#0b1720' : '#eef5fa',
      colorText: currentTheme === 'dark' ? '#f8fafc' : '#102030',
      colorTextSecondary: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
      colorBorder: currentTheme === 'dark' ? '#284052' : '#c9dce8',
      colorBorderSecondary: currentTheme === 'dark' ? '#203342' : '#dceaf2',
      borderRadius: 4,
    },
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
  }, [currentTheme])

  return (
    <ConfigProvider theme={antdTheme}>
      {children}
    </ConfigProvider>
  )
}

export default ThemeProvider
