import {
  HAZARD_CLASS_OPTIONS,
  HAZARD_GROUP_LABELS,
  hazardClassForGroup,
} from '../hazardClassByCategory'

export default function HazardClassField({ group, hazardClass, onSelect }) {
  const options = HAZARD_CLASS_OPTIONS[group] || HAZARD_CLASS_OPTIONS.иное
  const label = HAZARD_GROUP_LABELS[group] || HAZARD_GROUP_LABELS.иное

  return (
    <div className="desc-field">
      <label className="desc-field__label">Класс опасности</label>
      <div className="hazard-row">
        <span className="hazard-row__label">{label}:</span>
        <div className="hazard-row__buttons">
          {options.map((opt) => (
            <button
              type="button"
              key={`${group}-${opt}`}
              className={`hazard-btn ${
                hazardClass === hazardClassForGroup(group, opt) ? 'hazard-btn--active' : ''
              }`}
              onClick={() => onSelect(hazardClassForGroup(group, opt))}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
