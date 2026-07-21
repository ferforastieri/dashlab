import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useId, useRef } from 'react';
import { useUploadAssetMutation } from '../../api/assets/useUploadAssetMutation';

type ImageUploadProps = {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  hint?: string;
};

export function ImageUpload({ label, value, onChange, hint }: ImageUploadProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadAssetMutation();

  async function select(file?: File) {
    if (!file) return;
    const asset = await upload.mutateAsync(file);
    onChange(asset.url);
    if (input.current) input.current.value = '';
  }

  return (
    <div className="image-upload">
      <span className="image-upload-label">{label}</span>
      <div className="image-upload-field">
        <button
          type="button"
          className="image-upload-preview"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
          aria-label={`Selecionar ${label.toLowerCase()}`}
        >
          {upload.isPending ? (
            <LoaderCircle className="image-upload-spinner" />
          ) : value ? (
            <img src={value} alt={`Prévia de ${label.toLowerCase()}`} />
          ) : (
            <ImagePlus />
          )}
        </button>
        <div className="image-upload-actions">
          <button
            type="button"
            className="image-upload-select"
            onClick={() => input.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? 'Enviando…' : value ? 'Trocar imagem' : 'Escolher imagem'}
          </button>
          {value && (
            <button
              type="button"
              className="image-upload-remove"
              onClick={() => onChange('')}
            >
              <Trash2 /> Remover
            </button>
          )}
          <small className="image-upload-hint">
            {hint || 'PNG, JPG, WebP ou GIF · máximo de 5 MB'}
          </small>
        </div>
      </div>
      <input
        ref={input}
        id={id}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon"
        onChange={(event) => select(event.target.files?.[0])}
      />
    </div>
  );
}
