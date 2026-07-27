import React from 'react'
import { ArrowRightOutlined, BulbOutlined, CarOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Button, Card, Space, Tag, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import productTriptych from '../assets/regulation-product-triptych.png'

const entryCards = [
  {
    key: 'tyre',
    title: '轮胎法规',
    subtitle: 'Tyre Regulation',
    description: '聚焦 UNECE、EU、GB、MAS 等轮胎法规、认证路径、测试要求与项目经验。',
    path: '/forum',
    icon: <SafetyCertificateOutlined />,
    accent: '#0071b9',
    visual: 'tyre',
  },
  {
    key: 'lighting',
    title: '灯具法规',
    subtitle: 'Lighting Regulation',
    description: '聚焦灯具法规、配光、安装、型式认证和测试案例，支持团队发帖交流。',
    path: '/lighting',
    icon: <BulbOutlined />,
    accent: '#f2c300',
    visual: 'lighting',
  },
  {
    key: 'vehicle',
    title: '整车法规',
    subtitle: 'Whole Vehicle',
    description: '聚焦整车型式认证、合规矩阵、测试计划和法规动态，支持团队发帖交流。',
    path: '/vehicle',
    icon: <CarOutlined />,
    accent: '#65b32e',
    visual: 'vehicle',
  },
]

const ProductVisual: React.FC<{ type: string }> = ({ type }) => (
  <div className={`product-visual product-visual--${type}`}>
    <img className="product-visual__image" src={productTriptych} alt="" />
  </div>
)

const LandingPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__content">
          <Space wrap className="landing-kicker">
            <Tag color="blue">GLOBAL VEHICLE REGULATION</Tag>
            <span>法规分享 · 测试认证 · 项目协同</span>
          </Space>

          <Typography.Title className="landing-title">
            全球车辆法规分享论坛
          </Typography.Title>

          <Typography.Paragraph className="landing-subtitle">
            面向车辆法规、测试与认证工程师的知识协作平台。这里沉淀法规动态、认证经验、项目问题和 AI 日报，
            帮助团队更快识别合规变化，更稳地推进认证工作。
          </Typography.Paragraph>

          <Space wrap size={12} className="landing-actions">
            <Button type="primary" size="large" onClick={() => navigate('/forum')}>
              进入轮胎法规论坛 <ArrowRightOutlined />
            </Button>
            <Button size="large" onClick={() => navigate('/ai-assistant')}>
              查看 AI 法规助手
            </Button>
          </Space>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="reg-card reg-card-a">
            <span>UNECE</span>
            <strong>Type Approval</strong>
          </div>
          <div className="reg-card reg-card-b">
            <span>EU</span>
            <strong>Market Access</strong>
          </div>
          <div className="reg-card reg-card-c">
            <span>GB / MAS</span>
            <strong>Compliance Matrix</strong>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <Typography.Title level={2}>选择法规模块</Typography.Title>
          <Typography.Paragraph>
            新首页作为全局入口，三个法规模块均可发布、检索和讨论专业内容，轮胎模块同步展示每日 AI 法规热点。
          </Typography.Paragraph>
        </div>

        <div className="entry-grid">
          {entryCards.map((entry, index) => (
            <Card
              key={entry.key}
              className="entry-card"
              style={{ ['--entry-accent' as string]: entry.accent, animationDelay: `${index * 120}ms` }}
              hoverable
              onClick={() => navigate(entry.path)}
            >
              <ProductVisual type={entry.visual} />
              <div className="entry-card__icon">{entry.icon}</div>
              <Typography.Text className="entry-card__subtitle">{entry.subtitle}</Typography.Text>
              <Typography.Title level={3}>{entry.title}</Typography.Title>
              <Typography.Paragraph>{entry.description}</Typography.Paragraph>
              <Button type="link" className="entry-card__link">
                进入模块 <ArrowRightOutlined />
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="landing-section insight-strip">
        <div>
          <Typography.Title level={3}>法规知识流</Typography.Title>
          <Typography.Paragraph>
            通过 AI 日报、用户帖子、附件水印预览和站内提醒，把分散法规信息转化为可追踪、可讨论、可复用的团队知识。
          </Typography.Paragraph>
        </div>
        <div className="insight-metrics">
          <div><strong>5</strong><span>重点法规源</span></div>
          <div><strong>3</strong><span>业务模块</span></div>
          <div><strong>24/7</strong><span>在线沉淀</span></div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
