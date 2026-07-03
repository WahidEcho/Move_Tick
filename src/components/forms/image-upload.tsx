'use client';

import * as React from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadEventImage, validateImageFile } from '@/lib/storage';
import { isOptimizableImage } from '@/lib/helpers';

export interface ImageUploadProps {
  /** Current image URL (stored value). */
  value?: string | null;
  /** Called with the new public URL after a successful upload, or '' when cleared. */
  onChange: (url: string) => void;
  /** Organization the asset belongs to (used for the storage path + RLS). */
  orgId: string;
  className?: string;
}

/**
 * Uploads an image to Supabase Storage (event-assets bucket) and reports back
 * the public URL. Enforces the platform rule: image files only, max 10 MB.
 */
export function ImageUpload({ value, onChange, orgId, className }: ImageUploadProps) {
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
        const { url } = await uploadEventImage(file, orgId);
        onChange(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [orgId, onChange]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setError(null);
    onChange('');
  };

  const canPreview = value ? isOptimizableImage(value) : false;

  return (
    <div className={cn('space-y-3', className)}>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <div className="relative aspect-[16/9] w-full bg-muted">
            {canPreview ? (
              <Image src={value} alt="Cover preview" fill className="object-cover" sizes="(max-width: 768px) 100vw, 640px" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="Cover preview" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="absolute right-2 top-2 flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Replace
            </Button>
            <Button type="button" variant="destructive" size="icon-sm" onClick={clear} disabled={uploading}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
          )}
        >
          {uploading ? (
            <Loader2 className="size-10 animate-spin text-muted-foreground" />
          ) : (
            <ImageIcon className="size-10 text-muted-foreground" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium">
              {uploading ? 'Uploading…' : 'Drag and drop an image, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, WEBP, GIF or SVG · max 10 MB
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        className="hidden"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
