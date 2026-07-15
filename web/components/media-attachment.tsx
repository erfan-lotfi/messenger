'use client';

import { useEffect, useState } from 'react';
import { fetchMediaBlobUrl } from '@/lib/api';

type MediaAttachmentProps = {
  mimeType: string;
  path: string;
  onOpen: (url: string) => void;
};

export function MediaAttachment({
  mimeType,
  path,
  onOpen,
}: MediaAttachmentProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    void (async () => {
      try {
        objectUrl = await fetchMediaBlobUrl(path);

        if (active) {
          setUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch {
        if (active) {
          setUrl('');
        }
      }
    })();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path]);

  if (!url) {
    return <div style={{ color: '#cbd5e1', fontSize: 12 }}>Loading media…</div>;
  }

  if (mimeType.startsWith('image/')) {
    return (
      <img
        src={url}
        alt=""
        onClick={() => onOpen(url)}
        style={{
          maxWidth: '100%',
          borderRadius: 10,
          display: 'block',
          cursor: 'pointer',
        }}
      />
    );
  }

  return (
    <video
      src={url}
      controls
      onClick={() => onOpen(url)}
      style={{
        maxWidth: '100%',
        borderRadius: 10,
        display: 'block',
        cursor: 'pointer',
      }}
    />
  );
}
