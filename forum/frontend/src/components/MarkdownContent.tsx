import React from 'react'
import { Typography } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  content: string
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  return (
    <div
      style={{
        lineHeight: 1.8,
        fontSize: 14,
        color: '#262626',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <Typography.Title level={2}>{children}</Typography.Title>,
          h2: ({ children }) => <Typography.Title level={3}>{children}</Typography.Title>,
          h3: ({ children }) => <Typography.Title level={4}>{children}</Typography.Title>,
          h4: ({ children }) => <Typography.Title level={5}>{children}</Typography.Title>,
          p: ({ children }) => <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }}>{children}</Typography.Paragraph>,
          strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 16 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 16 }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: 6 }}>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: '4px solid #91caff',
                background: '#f6fbff',
                padding: '12px 16px',
                margin: '12px 0',
              }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                border: '1px solid #d9d9d9',
                background: '#fafafa',
                padding: '10px 12px',
                textAlign: 'left',
                fontWeight: 600,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                border: '1px solid #d9d9d9',
                padding: '10px 12px',
                verticalAlign: 'top',
              }}
            >
              {children}
            </td>
          ),
          code: ({ className, children }) =>
            className ? (
              <pre
                style={{
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  padding: 12,
                  overflowX: 'auto',
                  marginBottom: 16,
                }}
              >
                <code style={{ fontFamily: 'Consolas, Monaco, monospace' }}>{children}</code>
              </pre>
            ) : (
              <code
                style={{
                  background: '#f5f5f5',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'Consolas, Monaco, monospace',
                }}
              >
                {children}
              </code>
            ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownContent
