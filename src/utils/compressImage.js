const MAX_SIZE_BYTES = 100 * 1024;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.2;
const QUALITY_STEP = 0.15;
const SCALE_STEP = 0.1;
const MIN_SCALE = 0.3;

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let quality = INITIAL_QUALITY;
        let scale = 1;

        const attempt = () => {
          const canvas = document.createElement("canvas");
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Error al comprimir la imagen"));
                return;
              }
              if (blob.size <= MAX_SIZE_BYTES) {
                const fr = new FileReader();
                fr.onloadend = () => resolve(fr.result);
                fr.readAsDataURL(blob);
              } else if (quality > MIN_QUALITY) {
                quality = Math.max(quality - QUALITY_STEP, MIN_QUALITY);
                attempt();
              } else if (scale > MIN_SCALE) {
                scale = Math.max(scale - SCALE_STEP, MIN_SCALE);
                quality = INITIAL_QUALITY;
                attempt();
              } else {
                const fr = new FileReader();
                fr.onloadend = () => resolve(fr.result);
                fr.readAsDataURL(blob);
              }
            },
            "image/jpeg",
            quality
          );
        };

        attempt();
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}