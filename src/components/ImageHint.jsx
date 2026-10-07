import './PackTypeHint.css'

export default function ImageHint({
    src,
    alt,
    title = 'Подсказка',
    size = 'default',
    caption,
    icon = 'ⓘ',
}) {
    if (!src) return null

    const popupClass = size === 'large' ? 'pack-hint-popup pack-hint-popup--large' : 'pack-hint-popup'

    return (
        <span className="pack-hint-icon" title={title}>
            {icon}
            <span className={popupClass} role="tooltip">
                {caption ? <p className="pack-hint-popup__caption">{caption}</p> : null}
                <img src={src} alt={alt} />
            </span>
        </span>
    )
}
