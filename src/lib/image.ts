export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Bad image"));
    img.src = src;
  });
}

export async function cropImage(
  src: string,
  opts: {
    aspect: number;
    zoom: number;
    offsetX: number;
    offsetY: number;
    outputWidth?: number;
  },
): Promise<string> {
  const img = await loadImage(src);
  const outputWidth = opts.outputWidth ?? 900;
  const outputHeight = Math.round(outputWidth / opts.aspect);
  const cover = Math.max(outputWidth / img.width, outputHeight / img.height);
  const scale = cover * Math.max(1, opts.zoom);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const maxX = Math.max(0, (drawW - outputWidth) / 2);
  const maxY = Math.max(0, (drawH - outputHeight) / 2);
  const x = outputWidth / 2 - drawW / 2 + opts.offsetX * maxX;
  const y = outputHeight / 2 - drawH / 2 + opts.offsetY * maxY;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.fillStyle = "#f4ebe0";
  ctx.fillRect(0, 0, outputWidth, outputHeight);
  ctx.drawImage(img, x, y, drawW, drawH);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function compressImage(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.74));
      };
      img.onerror = () => reject(new Error("Bad image"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
