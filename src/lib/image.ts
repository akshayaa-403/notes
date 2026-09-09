/* Images are held inline as data URIs while storage is localStorage, so they
   are downscaled on the way in. This is a stopgap: the plan moves images to
   object storage, at which point the original file can be kept. */

export const CARD_IMAGE_MAX = 1600;
export const DAY_IMAGE_MAX = 320;

/** Reads an image file and resolves a downscaled data URI. Non-images and
 *  undecodable files resolve to null rather than throwing. */
export function readImageFile(file: File | null | undefined, maxPx: number): Promise<string | null> {
  if (!file || !file.type.startsWith('image/')) return Promise.resolve(null);

  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onerror = () => resolve(null);
    fr.onload = () => {
      const source = typeof fr.result === 'string' ? fr.result : null;
      if (!source) return resolve(null);

      const img = new Image();
      // A file the browser cannot decode is kept as-is rather than dropped.
      img.onerror = () => resolve(source);
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 400_000) return resolve(source);

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(source);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // PNG screenshots of text stay legible; photographs do not need it.
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(type, 0.82));
      };
      img.src = source;
    };
    fr.readAsDataURL(file);
  });
}

/** Pulls the first image out of a paste or drop, if there is one. */
export const imageFromTransfer = (data: DataTransfer | null): File | null => {
  if (!data) return null;
  const item = [...data.items].find((i) => i.type.startsWith('image/'));
  return item?.getAsFile() ?? data.files[0] ?? null;
};
