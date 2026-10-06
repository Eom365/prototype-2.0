import { DIMENSION_CODES, DIMENSION_LABELS } from '../productSpecs'
import './DimensionsGroup.css'

const UNIT_ORDER = ['centimeters', 'millimeters']

function sortUnitOptions(options) {
    return [...options].sort((left, right) => {
        const leftIndex = UNIT_ORDER.indexOf(left.value)
        const rightIndex = UNIT_ORDER.indexOf(right.value)
        return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex)
    })
}

export default function DimensionsGroup({ fields, specs, unitOptions, onChange }) {
    const dimensionFields = DIMENSION_CODES
        .map((code) => fields.find((field) => field.code === code))
        .filter(Boolean)

    if (dimensionFields.length === 0) return null

    const sortedUnits = sortUnitOptions(unitOptions)
    const fallbackUnit = sortedUnits[0]?.value || 'millimeters'

    return (
        <div className="dimensions-group">
            {/* <h2 className="subtitle">Укажите габариты (длина × ширина × высота):</h2> */}

            {dimensionFields.map((field) => {
                const current = specs[field.code] || {
                    value: '',
                    customValue: '',
                    unit: fallbackUnit,
                }
                const currentUnit = current.unit || fallbackUnit

                return (
                    <div className="dimension-row" key={field.code}>
                        <label className="dimension-label">
                            {DIMENSION_LABELS[field.code] || field.name}
                        </label>

                        <input
                            type="text"
                            className="dimension-input"
                            placeholder="Значение"
                            value={current.value}
                            onChange={(event) =>
                                onChange(field.code, { value: event.target.value })
                            }
                        />

                        <select
                            className="dimension-select"
                            value={currentUnit}
                            onChange={(event) =>
                                onChange(field.code, { unit: event.target.value })
                            }
                        >
                            {sortedUnits.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )
            })}
        </div>
    )
}