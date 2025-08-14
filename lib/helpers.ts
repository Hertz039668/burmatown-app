export const colors = {
  gold: "#D4AF37",
  black: "#0a0a0a",
  white: "#ffffff",
  offwhite: "#f8f8f8",
  smoke: "#eaeaea",
};

export const uid = (): string =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const initials = (name?: string): string =>
  (name || "??")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Small helpers
export const isVideoUrl = (url?: string) => !!url && (/^data:video\//i.test(url) || /\.(mp4|webm|ogg)$/i.test(url));
export const isImageUrl = (url?: string) => !!url && (/^data:image\//i.test(url) || /\.(png|jpg|jpeg|gif|webp|avif)$/i.test(url));
