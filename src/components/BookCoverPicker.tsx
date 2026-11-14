import { useEffect, useState } from 'react';

import { bookCoverTypes, maxBookCoverBytes } from '../shared';

export function BookCoverPicker() {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.onerror = () => setError('Не вдалося прочитати зображення.');
    reader.readAsDataURL(file);
    return () => {
      reader.onload = null;
      reader.onerror = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [file]);

  return (
    <div className="grid gap-2 min-[1000px]:col-span-full">
      <label className="grid gap-1 text-[13px]">
        Обкладинка (необов’язково)
        <input
          type="file"
          name="cover"
          accept={bookCoverTypes.join(',')}
          aria-describedby="book-cover-hint"
          className="min-w-0 text-[13px]"
          onChange={(event) => {
            const input = event.currentTarget;
            const selected = input.files?.[0];
            setPreview('');
            setError('');
            if (!selected) {
              setFile(undefined);
              return;
            }
            if (
              !bookCoverTypes.includes(selected.type) ||
              selected.size > maxBookCoverBytes
            ) {
              input.value = '';
              setFile(undefined);
              setError('Вибери зображення JPG, PNG або WebP розміром до 5 МБ.');
              return;
            }
            setFile(selected);
          }}
        />
      </label>
      <p id="book-cover-hint" className="m-0 text-[12px]">
        JPG, PNG або WebP до 5 МБ.
      </p>
      {error && (
        <p className="error m-0" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <img
          src={preview}
          className="h-[126px] w-[84px] rounded-[8px] bg-canvas object-contain"
          alt="Попередній перегляд обкладинки"
          onError={() => {
            setPreview('');
            setError('Не вдалося відкрити зображення.');
          }}
        />
      )}
    </div>
  );
}
