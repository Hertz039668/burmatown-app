import React from "react";
import { isImageUrl, isVideoUrl, colors } from "../lib/helpers";

export function MediaRenderer({ url }: { url?: string }) {
  if (!url) return null;
  if (isVideoUrl(url)) {
    return (
      <video controls className="w-full rounded-2xl" style={{ background: colors.black }}>
        <source src={url} />
      </video>
    );
  }
  if (isImageUrl(url)) {
    return <img src={url} alt="media" className="w-full rounded-2xl object-cover" />;
  }
  return (
    <a href={url} className="underline" target="_blank" rel="noreferrer">
      View media
    </a>
  );
}
