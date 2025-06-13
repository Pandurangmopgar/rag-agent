import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className,
  isUser = false 
}) => {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className={cn(
              "text-xl font-bold mb-4 mt-6 first:mt-0",
              isUser ? "text-white" : "text-gray-900 dark:text-gray-100"
            )}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={cn(
              "text-lg font-semibold mb-3 mt-5 first:mt-0",
              isUser ? "text-white" : "text-gray-900 dark:text-gray-100"
            )}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={cn(
              "text-base font-semibold mb-2 mt-4 first:mt-0",
              isUser ? "text-white" : "text-gray-900 dark:text-gray-100"
            )}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className={cn(
              "text-sm font-semibold mb-2 mt-3 first:mt-0",
              isUser ? "text-white" : "text-gray-800 dark:text-gray-200"
            )}>
              {children}
            </h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className={cn(
              "mb-4 last:mb-0 leading-relaxed",
              isUser ? "text-white" : "text-gray-700 dark:text-gray-300"
            )}>
              {children}
            </p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className={cn(
              "mb-4 pl-6 space-y-1",
              isUser ? "text-white" : "text-gray-700 dark:text-gray-300"
            )}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={cn(
              "mb-4 pl-6 space-y-1 list-decimal",
              isUser ? "text-white" : "text-gray-700 dark:text-gray-300"
            )}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="list-disc">
              {children}
            </li>
          ),
          // Code blocks
          code: (props) => {
            const { inline, className, children, ...rest } = props as {
              inline?: boolean;
              className?: string;
              children?: React.ReactNode;
              [key: string]: unknown;
            };
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (inline) {
              return (
                <code 
                  className={cn(
                    "px-1.5 py-0.5 rounded text-sm font-mono",
                    isUser 
                      ? "bg-white/20 text-white" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  )}
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <div className="mb-4">
                {language && (
                  <div className={cn(
                    "px-3 py-1 text-xs font-medium border-b",
                    isUser
                      ? "bg-white/10 text-white border-white/20"
                      : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                  )}>
                    {language}
                  </div>
                )}
                <pre className={cn(
                  "p-4 rounded-lg overflow-x-auto text-sm",
                  language ? "rounded-t-none" : "",
                  isUser
                    ? "bg-white/10 text-white"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                )}>
                  <code className="font-mono" {...rest}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className={cn(
              "border-l-4 pl-4 mb-4 italic",
              isUser
                ? "border-white/30 text-white/90"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
            )}>
              {children}
            </blockquote>
          ),
          // Tables
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto">
              <table className={cn(
                "min-w-full border-collapse",
                isUser
                  ? "border border-white/20"
                  : "border border-gray-200 dark:border-gray-700"
              )}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className={cn(
              "border px-4 py-2 text-left font-semibold",
              isUser
                ? "border-white/20 bg-white/10 text-white"
                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            )}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={cn(
              "border px-4 py-2",
              isUser
                ? "border-white/20 text-white"
                : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            )}>
              {children}
            </td>
          ),
          // Links
          a: ({ children, href }) => (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "underline hover:no-underline transition-colors",
                isUser
                  ? "text-white hover:text-white/80"
                  : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              )}
            >
              {children}
            </a>
          ),
          // Strong and emphasis
          strong: ({ children }) => (
            <strong className={cn(
              "font-semibold",
              isUser ? "text-white" : "text-gray-900 dark:text-gray-100"
            )}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className={cn(
              "italic",
              isUser ? "text-white" : "text-gray-700 dark:text-gray-300"
            )}>
              {children}
            </em>
          ),
          // Horizontal rule
          hr: () => (
            <hr className={cn(
              "my-6 border-0 h-px",
              isUser
                ? "bg-white/20"
                : "bg-gray-200 dark:bg-gray-700"
            )} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}; 