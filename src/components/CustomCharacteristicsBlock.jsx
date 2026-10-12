import {
    allUnitOptions,
    normalizeCustomRows,
} from '../customCharacteristics'

function CustomCharacteristicsBlock({ rows, unitGroups, onChange }) {
    const units = allUnitOptions(unitGroups)

    const updateRow = (id, patch) => {
        const next = rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
        onChange(normalizeCustomRows(next))
    }

    const handleUnitChange = (row, nextValue) => {
        if (nextValue === 'other') {
            updateRow(row.id, { unitMode: 'other', unit: '', customUnit: row.customUnit || '' })
            return
        }
        updateRow(row.id, { unitMode: 'preset', unit: nextValue, customUnit: '' })
    }

    return (
        <div className="custom-spec-block">
            {/* <h3 className="subtitle subtitle--spaced">Иное</h3> */}
            {rows.map((row) => (
                <div className="custom-spec-row" key={row.id}>
                    <span className="info-icon" title="Подсказка">ⓘ</span>
                    <input
                        type="text"
                        className="field-input"
                        placeholder="Наименование характеристики"
                        value={row.name}
                        onChange={(event) => updateRow(row.id, { name: event.target.value })}
                    />
                    <input
                        type="text"
                        className="field-input"
                        placeholder="Значение"
                        value={row.value}
                        onChange={(event) => updateRow(row.id, { value: event.target.value })}
                    />
                    <select
                        className="field-select"
                        value={row.unitMode === 'other' ? 'other' : (row.unit || '')}
                        onChange={(event) => handleUnitChange(row, event.target.value)}
                    >
                        <option value="">Единица измерения</option>
                        {units.map((unit) => (
                            <option key={unit.value} value={unit.value}>{unit.label}</option>
                        ))}
                        <option value="other">Иное</option>
                    </select>
                    {row.unitMode === 'other' && (
                        <input
                            type="text"
                            className="field-input custom-spec-row__unit-custom"
                            placeholder="Своя единица измерения"
                            value={row.customUnit}
                            onChange={(event) => updateRow(row.id, { customUnit: event.target.value })}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}

export default CustomCharacteristicsBlock
