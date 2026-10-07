import { useState } from "react";
import "./Tip.css";

export default function Tip({
  text,
  image,
  images,
  imageAlt = "",
  imageSize = "default",
  bubbleSize = "default",
  inline = false,
}) {
  const [open, setOpen] = useState(false);

  const allImages = [
    ...(image ? [{ src: image, alt: imageAlt || "Пояснение" }] : []),
    ...(images || []),
  ];

  return (
    <span className={inline ? "tip tip--inline" : "tip"}>
      <button
        type="button"
        className="tip__icon"
        aria-label="Подсказка"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        ?
      </button>
      {open && (
        <span className={`tip__bubble tip__bubble--${bubbleSize}`}>
          {text ? <span className="tip__text">{text}</span> : null}
          {allImages.map((img, idx) => (
            <img
              key={`${img.src}-${idx}`}
              className={`tip__image tip__image--${imageSize}`}
              src={img.src}
              alt={img.alt || imageAlt || "Пояснение"}
            />
          ))}
        </span>
      )}
    </span>
  );
}
