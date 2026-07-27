import React, { useEffect, useMemo, useState } from 'react'
import { Card, Col, Row, Space, Statistic, Typography } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import Header from '../components/Header'
import api from '../utils/api'

interface LeaderboardUser {
  id: number
  username: string
  points: number
  topic_count: number
  reply_count: number
}

const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        const response = await api.get('/leaderboard')
        setUsers(response.data)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  const stats = useMemo(() => {
    const totalPoints = users.reduce((sum, user) => sum + user.points, 0)
    const highestPoints = users[0]?.points || 0
    const averagePoints = users.length ? Math.round(totalPoints / users.length) : 0
    return { totalPoints, highestPoints, averagePoints }
  }, [users])

  const topUsers = users.slice(0, 3)

  return (
    <div>
      <Header />
      <div className="leaderboard-page">
        <Card className="leaderboard-hero" loading={loading}>
          <Space direction="vertical" size={8}>
            <Typography.Title level={2} style={{ margin: 0 }}>
              <TrophyOutlined /> 工程师积分看板
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
              仅按积分展示成员贡献，不再设置工程师等级。发帖每篇 10 分，回复每条 3 分。
            </Typography.Paragraph>
          </Space>
        </Card>

        <Row gutter={[16, 16]} className="leaderboard-stats">
          <Col xs={12} md={6}><Card><Statistic title="成员数" value={users.length} suffix="人" /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="总积分" value={stats.totalPoints} suffix="分" /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="最高积分" value={stats.highestPoints} suffix="分" /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="平均积分" value={stats.averagePoints} suffix="分" /></Card></Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={15}>
            <Card title="成员积分卡片" className="leaderboard-panel" loading={loading}>
              <div className="member-grid">
                {users.map((user, index) => (
                  <div className="member-card" key={user.id}>
                    <div className="member-rank">#{index + 1}</div>
                    <Typography.Text strong ellipsis>{user.username}</Typography.Text>
                    <div className="member-score">{user.points}<span>分</span></div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={9}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card title="Top 3 贡献者" className="leaderboard-panel" loading={loading}>
                {topUsers.map((user, index) => (
                  <div className="top-user" key={user.id}>
                    <span className="top-user__badge">{index + 1}</span>
                    <Typography.Text strong>{user.username}</Typography.Text>
                    <strong>{user.points} 分</strong>
                  </div>
                ))}
              </Card>

              <Card title="积分规则" className="leaderboard-panel">
                <Typography.Paragraph style={{ marginBottom: 8 }}>发布帖子：+10 分</Typography.Paragraph>
                <Typography.Paragraph style={{ marginBottom: 0 }}>发表回复：+3 分</Typography.Paragraph>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Leaderboard
