import React, { useEffect, useState } from 'react'
import { Card, List, Statistic, Typography } from 'antd'
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

  return (
    <div>
      <Header />
      <Card>
        <Typography.Title level={2}>
          <TrophyOutlined /> 积分排行榜
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          发帖每篇 10 分，回复每条 3 分，按积分从高到低排序。
        </Typography.Paragraph>

        <List
          loading={loading}
          dataSource={users}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                title={`第 ${index + 1} 名 · ${item.username}`}
                description={`发帖 ${item.topic_count} · 回复 ${item.reply_count}`}
              />
              <Statistic value={item.points} suffix="分" />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}

export default Leaderboard
