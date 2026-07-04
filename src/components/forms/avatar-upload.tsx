'use client';

import * as React from 'react';
import { Upload, X, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadAvatar, validateImageFile } from '@/lib/storage';

export interface AvatarUploadProps {
  /** Current avatar URL (any host — Google, uploaded, etc.). */
  value?: string | null;
  /** Called with the new public URL after upload, or '' when removed. */
  onChange: (url: string) => void;
  /** The owner's user id (storage path + RLS scope). */
  userId: string;
  className?: string;
}

/**
 * Profile-picture uploader: a circular preview you can click or drag-and-drop
 * onto. Uploads to Supabase Storage and reports the public URL. Enforces the
 * platform rule (image files only, max 10 MB). Uses a plain <img> since avatars
 * can come from arbitrary hosts (Google OAuth, prior uploads).
 */
export function AvatarUpload({ value, onChange, userId, className }: AvatarUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = React.useCallback(
    async (file: File) => {
      setError(null);
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setUploading(true);
      try {
        const { url } = await uploadAvatar(file, userId);
        onChange(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [userId, onChange]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        aria-label="Upload profile picture"
        className={cn(
          'relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/40'
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Profile picture" className="size-full object-cover" />
        ) : (
          <User className="size-8 text-muted-foreground" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-6 animate-spin text-foreground" />
          </div>
        )}
      </button>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="size-4" />
            {value ? 'Change photo' : 'Upload photo'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null);
                onChange('');
              }}
              disabled={uploading}
            >
              <X className="size-4" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Drag &amp; drop or click · PNG, JPG, WEBP or GIF · max 10 MB
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        className="hidden"
      />
    </div>
  );
}
