"use client"

import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownProps {
  content: string
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <SyntaxHighlighter
              language={match[1]}
              PreTag="div"
              style={vscDarkPlus}
              customStyle={{
                margin: '1.25rem 0',
                borderRadius: '0.5rem',
                padding: '1.25rem',
                fontSize: '0.9375rem',
                lineHeight: 1.5
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className="rounded bg-muted px-[0.4rem] py-[0.2rem] font-mono text-[0.9375rem]" {...props}>
              {children}
            </code>
          )
        },
        pre({ children }) {
          return <>{children}</>
        },
        p({ children }) {
          return <p className="mb-5 last:mb-0 leading-relaxed text-[1rem]">{children}</p>
        },
        a({ children, href }) {
          return (
            <a 
              href={href} 
              className="text-primary hover:underline break-words" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ wordBreak: 'break-word' }}
            >
              {children}
            </a>
          )
        },
        ul({ children }) {
          return <ul className="list-disc ml-6 mb-4">{children}</ul>
        },
        ol({ children }) {
          return <ol className="list-decimal ml-6 mb-4">{children}</ol>
        },
        li({ children }) {
          return <li className="mb-2">{children}</li>
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-border">{children}</table>
            </div>
          )
        },
        thead({ children }) {
          return <thead className="bg-muted">{children}</thead>
        },
        tr({ children }) {
          return <tr className="border-b border-border">{children}</tr>
        },
        th({ children }) {
          return <th className="p-2 text-left border border-border">{children}</th>
        },
        td({ children }) {
          return <td className="p-2 border border-border">{children}</td>
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-border pl-4 italic my-4">
              {children}
            </blockquote>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
