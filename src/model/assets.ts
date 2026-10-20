import type { Assets } from '../render/types';

const images = new Map<string, HTMLImageElement>();
const urls = new Map<string, string>();

export async function addImageAsset(id: string, file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  images.set(id, img);
  urls.set(id, url);
}

export function dropAsset(id: string): void {
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
  images.delete(id);
}

export function getImageUrl(id: string): string | undefined {
  return urls.get(id);
}

export const assets: Assets = {
  getImage: (id) => images.get(id),
};
