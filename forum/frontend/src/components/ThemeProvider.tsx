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
      colorBgContainer: currentTheme === 'dark' ? '#1f1f1f' : '#ffffff',
      colorBgElevated: currentTheme === 'dark' ? '#2d2d2d' : '#ffffff',
      colorBgLayout: currentTheme === 'dark' ? '#141414' : '#f0f2f5',
      colorText: currentTheme === 'dark' ? '#ffffff' : '#000000',
      colorTextSecondary: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
      colorBorder: currentTheme === 'dark' ? '#434343' : '#d9d9d9',
      colorBorderSecondary: currentTheme === 'dark' ? '#303030' : '#f0f0f0',
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