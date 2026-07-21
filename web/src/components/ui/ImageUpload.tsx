import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useId, useRef } from 'react';
import { useUploadAsset } from '../../api/assets/useUploadAsset';

type ImageUploadProps = {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  hint?: string;
};

export function ImageUpload({ label, value, onChange, hint }: ImageUploadProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadAsset();

  async function select(file?: File) {
    if (!file) return;
    const asset = await upload.mutateAsync(file);
    onChange(asset.url);
    if (input.current) input.current.value = '';
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="grid grid-cols-[82px_1fr] items-center gap-3.5 rounded-2xl border border-dashed border-white/20 bg-[#07111d]/50 p-3">
        <button
          type="button"
          className="grid h-[70px] w-[82px] place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-slate-400 [&>img]:h-full [&>img]:w-full [&>img]:object-contain"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
          aria-label={`Selecionar ${label.toLowerCase()}`}
        >
          {upload.isPending ? (
            <LoaderCircle className="spin" />
          ) : value ? (
            <img src={value} alt={`Prévia de ${label.toLowerCase()}`} />
          ) : (
            <ImagePlus />
          )}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-slate-200"
            onClick={() => input.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? 'Enviando…' : value ? 'Trocar imagem' : 'Escolher imagem'}
          </button>
          {value && (
            <button
              type="button"
              className="inline-flex items-center gap-1 border-0 bg-transparent text-sm text-red-300"
              onClick={() => onChange('')}
            >
              <Trash2 /> Remover
            </button>
          )}
          <small className="basis-full text-xs text-slate-500">
            {hint || 'PNG, JPG, WebP ou GIF · máximo de 5 MB'}
          </small>
        </div>
      </div>
      <input
        ref={input}
        id={id}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => select(event.target.files?.[0])}
      />
    </div>
  );
}
