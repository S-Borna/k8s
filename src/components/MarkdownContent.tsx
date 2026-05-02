import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import bash from "highlight.js/lib/languages/bash";
import yaml from "highlight.js/lib/languages/yaml";
import json from "highlight.js/lib/languages/json";
import javascript from "highlight.js/lib/languages/javascript";
import { CodeBlock } from "@/components/CodeBlock";

const languages = { bash, sh: bash, shell: bash, yaml, yml: yaml, json, javascript, js: javascript };

type Props = {
  source: string;
  className?: string;
};

export function MarkdownContent({ source, className }: Props) {
  return (
    <div className={`markdown-content ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, languages }]]}
        components={{
          pre: ({ children }) => extractCode(children),
          code: ({ className: cls, children, ...rest }) => {
            const isInline = !cls;
            if (isInline) {
              return (
                <code
                  {...rest}
                  className="rounded-md border border-border/40 bg-surface-2/60 px-1.5 py-0.5 font-mono text-[0.92em] text-amber-soft"
                >
                  {children}
                </code>
              );
            }
            return (
              <code {...rest} className={cls}>
                {children}
              </code>
            );
          },
          h2: ({ children }) => (
            <h2 className="font-display text-2xl text-text mt-10 mb-3 leading-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-lg text-text mt-7 mb-2 leading-tight">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-relaxed text-text-muted">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-4 ml-5 list-disc space-y-1.5 text-text-muted marker:text-text-faint">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 list-decimal space-y-2 text-text-muted marker:text-amber/70 marker:font-display">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-xl border-l-2 border-amber/60 bg-amber/[0.04] px-4 py-3 text-text">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-amber underline decoration-amber/30 underline-offset-2 hover:decoration-amber"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text">{children}</strong>
          ),
          em: ({ children }) => <em className="text-amber-soft">{children}</em>,
          hr: () => <hr className="my-8 border-border/50" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border/60 bg-surface/40 px-3 py-2 text-left font-medium text-text">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/30 px-3 py-2 text-text-muted">
              {children}
            </td>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

function extractCode(children: ReactNode): ReactNode {
  let language: string | undefined;
  let code = "";

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { className?: string; children?: ReactNode };
    const cls = props.className ?? "";
    const m = cls.match(/language-([a-z0-9]+)/i);
    if (m) language = m[1];
    code = flattenText(props.children);
  });

  return <CodeBlock code={code} language={language} />;
}

function flattenText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return flattenText(props.children);
  }
  return "";
}
