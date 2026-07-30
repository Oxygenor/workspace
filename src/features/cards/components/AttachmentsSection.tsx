import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { Download, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import { getAttachmentDownloadUrl } from '../api'
import { useAttachments, useDeleteAttachment, useUploadAttachment } from '../hooks'

interface AttachmentsSectionProps {
  cardId: string
  boardId: string
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function AttachmentsSection({ cardId, boardId }: AttachmentsSectionProps) {
  const { data: attachments, isLoading } = useAttachments(cardId)
  const uploadAttachment = useUploadAttachment(cardId, boardId)
  const deleteAttachment = useDeleteAttachment(cardId, boardId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) uploadAttachment.mutate(file)
    event.target.value = ''
  }

  async function handleDownload(storagePath: string) {
    try {
      const url = await getAttachmentDownloadUrl(storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.unknownError)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t.card.attachments}</h3>

      {isLoading && <Skeleton className="h-12 w-full" />}
      {!isLoading && (attachments?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">{t.card.noAttachments}</p>
      )}

      <div className="space-y-2">
        {attachments?.map((attachment) => (
          <div key={attachment.id} className="flex items-center gap-2 rounded-md border border-border p-2">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(attachment.storage_path)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => deleteAttachment.mutate({ attachmentId: attachment.id, storagePath: attachment.storage_path })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadAttachment.isPending}
      >
        {uploadAttachment.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
        {t.card.uploadFile}
      </Button>
    </div>
  )
}
