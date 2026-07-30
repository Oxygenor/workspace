import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import type { Components, ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { t } from '@/i18n'
import { resolveIcon } from '@/lib/modules/icon-map'
import type { ModuleComponentProps } from '@/lib/modules/registry'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { useBacklinks, useDocument, useUpdateDocument } from '../hooks'
import { parseMentionHref, preprocessMentions, resolveMentionItem } from '../mentions'

/** Allows the `mention://Name` placeholder protocol through react-markdown's default URL sanitizer. */
function urlTransform(url: string): string {
  return url.startsWith('mention://') ? url : defaultUrlTransform(url)
}

/**
 * Renders `[[Name]]` mentions (preprocessed into `mention://Name` links) as a
 * pill linking to the resolved workspace item, or as muted plain text when
 * the name doesn't resolve to anything. Falls back to a normal `<a>` for
 * regular markdown links.
 */
function MentionOrLink({ node: _node, className, href, children, ...props }: JSX.IntrinsicElements['a'] & ExtraProps) {
  const navigate = useNavigate()
  const { data: items } = useWorkspaceItems()
  const mentionName = parseMentionHref(href)

  if (mentionName === null) {
    return (
      <a
        className={`text-primary underline underline-offset-2 hover:text-primary/80 ${className ?? ''}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  }

  const match = resolveMentionItem(mentionName, items ?? [])

  if (!match) {
    return (
      <span className="rounded px-0.5 text-muted-foreground underline decoration-dashed decoration-muted-foreground/60 underline-offset-4">
        {children}
      </span>
    )
  }

  const Icon = resolveIcon(match.icon, match.type)

  return (
    <button
      type="button"
      onClick={() => navigate(`/app/item/${match.id}`)}
      className="mx-0.5 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 align-middle text-sm font-medium text-primary transition-colors hover:bg-primary/20"
    >
      <Icon className="h-3.5 w-3.5" />
      {match.name}
    </button>
  )
}

const markdownComponents: Components = {
  h1: ({ node: _node, className, ...props }) => (
    <h1 className={`mb-4 mt-6 text-2xl font-bold first:mt-0 ${className ?? ''}`} {...props} />
  ),
  h2: ({ node: _node, className, ...props }) => (
    <h2 className={`mb-3 mt-5 text-xl font-semibold first:mt-0 ${className ?? ''}`} {...props} />
  ),
  h3: ({ node: _node, className, ...props }) => (
    <h3 className={`mb-2 mt-4 text-lg font-semibold first:mt-0 ${className ?? ''}`} {...props} />
  ),
  h4: ({ node: _node, className, ...props }) => (
    <h4 className={`mb-2 mt-3 text-base font-semibold first:mt-0 ${className ?? ''}`} {...props} />
  ),
  p: ({ node: _node, className, ...props }) => <p className={`mb-3 leading-relaxed last:mb-0 ${className ?? ''}`} {...props} />,
  ul: ({ node: _node, className, ...props }) => (
    <ul className={`mb-3 ml-6 list-disc space-y-1 [&_ul]:mt-1 [&_ol]:mt-1 ${className ?? ''}`} {...props} />
  ),
  ol: ({ node: _node, className, ...props }) => (
    <ol className={`mb-3 ml-6 list-decimal space-y-1 [&_ul]:mt-1 [&_ol]:mt-1 ${className ?? ''}`} {...props} />
  ),
  li: ({ node: _node, className, ...props }) => <li className={`leading-relaxed ${className ?? ''}`} {...props} />,
  a: MentionOrLink,
  blockquote: ({ node: _node, className, ...props }) => (
    <blockquote className={`mb-3 border-l-2 border-border pl-4 italic text-muted-foreground ${className ?? ''}`} {...props} />
  ),
  hr: ({ node: _node, className, ...props }) => <hr className={`my-6 border-border ${className ?? ''}`} {...props} />,
  table: ({ node: _node, className, ...props }) => (
    <div className="mb-3 overflow-x-auto">
      <table className={`w-full border-collapse text-sm ${className ?? ''}`} {...props} />
    </div>
  ),
  thead: ({ node: _node, className, ...props }) => <thead className={`bg-muted ${className ?? ''}`} {...props} />,
  th: ({ node: _node, className, ...props }) => (
    <th className={`border border-border px-2 py-1 text-left font-semibold ${className ?? ''}`} {...props} />
  ),
  td: ({ node: _node, className, ...props }) => <td className={`border border-border px-2 py-1 ${className ?? ''}`} {...props} />,
  pre: ({ node: _node, className, ...props }) => (
    <pre className={`mb-3 overflow-x-auto rounded-md bg-muted p-3 text-sm ${className ?? ''}`} {...props} />
  ),
  code: ({ node: _node, className, ...props }) => (
    <code className={className ? `font-mono text-sm ${className}` : `rounded bg-muted px-1 py-0.5 font-mono text-sm ${className ?? ''}`} {...props} />
  ),
  input: ({ node: _node, className, ...props }) => <input className={`mr-2 align-middle ${className ?? ''}`} {...props} />,
}

function formatLastEdited(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })
}

export function NotesPage({ item }: ModuleComponentProps): JSX.Element {
  const navigate = useNavigate()
  const { data: doc, isLoading } = useDocument(item.id)
  const updateDocument = useUpdateDocument(item.id)
  const { data: backlinks, isLoading: backlinksLoading } = useBacklinks(item.id)

  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'saved' | 'saving'>('saved')
  const loadedItemIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (doc && loadedItemIdRef.current !== item.id) {
      setContent(doc.content)
      loadedItemIdRef.current = item.id
      setStatus('saved')
    }
  }, [doc, item.id])

  const debouncedSave = useDebouncedCallback((value: string) => {
    updateDocument.mutate(value, {
      onSettled: () => setStatus('saved'),
    })
  }, 600)

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value
    setContent(value)
    setStatus('saving')
    debouncedSave(value)
  }

  if (isLoading || !doc) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {t.notes.lastEdited}: {formatLastEdited(doc.updated_at)}
        </span>
        <span className={status === 'saving' ? 'text-primary' : ''}>
          {status === 'saving' ? t.common.saving : t.common.saved}
        </span>
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">{t.notes.edit}</TabsTrigger>
          <TabsTrigger value="preview">{t.notes.preview}</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <Textarea
            value={content}
            onChange={handleChange}
            placeholder={t.notes.placeholder}
            className="min-h-[60vh] resize-y font-mono text-sm"
          />
        </TabsContent>

        <TabsContent value="preview">
          <div className="min-h-[60vh] rounded-md border border-input bg-background px-4 py-3">
            {content.trim().length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.notes.emptyPreview}</p>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} urlTransform={urlTransform}>
                {preprocessMentions(content)}
              </ReactMarkdown>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <section className="space-y-2 border-t border-border pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.notes.backlinksTitle}</h2>

        {backlinksLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : backlinks && backlinks.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {backlinks.map((backlink) => {
              const Icon = resolveIcon(backlink.icon, backlink.type)
              return (
                <Card
                  key={backlink.id}
                  className="flex cursor-pointer flex-row items-center gap-3 p-3 transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/app/item/${backlink.id}`)}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${backlink.color}22` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: backlink.color }} />
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">{backlink.name}</span>
                </Card>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.notes.backlinksEmpty}</p>
        )}
      </section>
    </div>
  )
}
