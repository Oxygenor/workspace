import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ExternalLink, Loader2, Mic, Paperclip, Square, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import type { AttachmentRow } from '@/types/database'
import { getAttachmentDownloadUrl } from '../api'
import { useAttachments, useDeleteAttachment, useUploadAttachment, useUploadVoiceNote } from '../hooks'

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

const PREVIEW_URL_EXPIRY_SECONDS = 60 * 30

interface AttachmentItemProps {
  attachment: AttachmentRow
  onDelete: () => void
  isDeleting: boolean
}

function AttachmentItem({ attachment, onDelete, isDeleting }: AttachmentItemProps) {
  const isImage = attachment.mime_type?.startsWith('image/') ?? false
  const isPdf = attachment.mime_type === 'application/pdf'
  const isAudio = attachment.mime_type?.startsWith('audio/') ?? false
  const needsPreviewUrl = isImage || isPdf || isAudio

  const { data: previewUrl } = useQuery({
    queryKey: ['attachment-preview-url', attachment.id],
    queryFn: () => getAttachmentDownloadUrl(attachment.storage_path, PREVIEW_URL_EXPIRY_SECONDS),
    enabled: needsPreviewUrl,
    staleTime: 25 * 60 * 1000,
  })

  async function handleDownload() {
    try {
      const url = await getAttachmentDownloadUrl(attachment.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.unknownError)
    }
  }

  if (isAudio) {
    return (
      <div className="space-y-1.5 rounded-md border border-border p-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{attachment.file_name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} disabled={isDeleting}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {previewUrl ? <audio controls src={previewUrl} className="w-full" /> : <Skeleton className="h-10 w-full" />}
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <div className="flex items-center gap-2">
        {isImage && previewUrl ? (
          <button
            type="button"
            onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
            className="shrink-0"
          >
            <img src={previewUrl} alt={attachment.file_name} className="h-16 w-16 rounded object-cover" />
          </button>
        ) : (
          <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">{attachment.file_name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} disabled={isDeleting}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isPdf && previewUrl && (
        <div className="space-y-1">
          <iframe src={previewUrl} className="h-64 w-full rounded border" title={attachment.file_name} />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AttachmentsSection({ cardId, boardId }: AttachmentsSectionProps) {
  const { data: attachments, isLoading } = useAttachments(cardId)
  const uploadAttachment = useUploadAttachment(cardId, boardId)
  const deleteAttachment = useDeleteAttachment(cardId, boardId)
  const uploadVoiceNote = useUploadVoiceNote(cardId, boardId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) uploadAttachment.mutate(file)
    event.target.value = ''
  }

  async function handleStartRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        uploadVoiceNote.mutate(blob)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      toast.error(t.voiceNote.micDenied)
    }
  }

  function handleStopRecording() {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setIsRecording(false)
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
          <AttachmentItem
            key={attachment.id}
            attachment={attachment}
            isDeleting={deleteAttachment.isPending}
            onDelete={() =>
              deleteAttachment.mutate({ attachmentId: attachment.id, storagePath: attachment.storage_path })
            }
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

        {!isRecording && (
          <Button variant="outline" size="sm" onClick={handleStartRecording} disabled={uploadVoiceNote.isPending}>
            {uploadVoiceNote.isPending ? <Loader2 className="animate-spin" /> : <Mic />}
            {uploadVoiceNote.isPending ? t.voiceNote.uploading : t.voiceNote.record}
          </Button>
        )}

        {isRecording && (
          <>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              {t.voiceNote.recording}
            </span>
            <Button variant="destructive" size="sm" onClick={handleStopRecording}>
              <Square className="h-3.5 w-3.5" />
              {t.voiceNote.stop}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
