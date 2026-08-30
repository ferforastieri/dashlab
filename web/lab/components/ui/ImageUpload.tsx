import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
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
  const [error, setError] = useState('');

  async function select(file?: File) {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Escolha um arquivo de imagem válido.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5 MB.');
      return;
    }
    try {
      const asset = await upload.mutateAsync(file);
      if (!asset?.url) throw new Error('Resposta inválida do servidor');
      onChange(asset.url);
      if (input.current) input.current.value = '';
    } catch {
      setError('Não foi possível enviar a imagem. Tente novamente.');
    }
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
            <img
              src={value}
              alt={`Prévia de ${label.toLowerCase()}`}
              onError={() => {
                setError('A imagem enviada não pôde ser carregada.');
                onChange('');
              }}
            />
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
            <button type="button" className="image-upload-remove" onClick={() => onChange('')}>
              <Trash2 /> Remover
            </button>
          )}
          <small className="image-upload-hint">
            {error || hint || 'PNG, JPG, WebP ou GIF · máximo de 5 MB'}
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
