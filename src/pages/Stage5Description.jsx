function DescriptionInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      className="desc-input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

function DescriptionBlock({ title, children }) {
  return (
    <section className="desc-block">
      <h3 className="desc-block__title">{title}</h3>
      <div className="desc-block__box">{children}</div>
    </section>
  );
}

function RangeInput({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  unit,
}) {
  return (
    <div className="desc-range-group">
      <span className="desc-range-group__title">{label}</span>
      <div className="desc-range-pair">
        <div className="desc-range-item">
          <span className="desc-range-item__label">От</span>
          <DescriptionInput
            value={fromValue}
            onChange={onFromChange}
            placeholder=""
          />
          <span className="desc-range-item__unit">{unit}</span>
        </div>
        <div className="desc-range-item">
          <span className="desc-range-item__label">До</span>
          <DescriptionInput
            value={toValue}
            onChange={onToChange}
            placeholder=""
          />
          <span className="desc-range-item__unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function ConditionGroup({ title, values, onChange }) {
  const patch = (field, value) => onChange({ ...values, [field]: value });

  return (
    <div className="desc-subsection">
      <p className="desc-subsection__title">{title}</p>
      <div className="desc-subsection__row desc-subsection__row--conditions">
        <RangeInput
          label="Температурный режим"
          fromValue={values.temperatureFrom}
          toValue={values.temperatureTo}
          onFromChange={(value) => patch("temperatureFrom", value)}
          onToChange={(value) => patch("temperatureTo", value)}
          unit="°C"
        />
        <RangeInput
          label="Влажность"
          fromValue={values.humidityFrom}
          toValue={values.humidityTo}
          onFromChange={(value) => patch("humidityFrom", value)}
          onToChange={(value) => patch("humidityTo", value)}
          unit="%"
        />
        <div className="desc-range-group desc-range-group--single">
          <span className="desc-range-group__title">
            Попадание прямых солнечных лучей
          </span>
          <DescriptionInput
            value={values.lighting}
            onChange={(value) => patch("lighting", value)}
            placeholder="Попадание прямых солнечных лучей"
          />
        </div>
      </div>
    </div>
  );
}

function patchComplectationItem(form, onChange, index, patch) {
  const items = [...(form.complectation.items || [{ name: "", quantity: "" }])];
  items[index] = { ...items[index], ...patch };
  const last = items[items.length - 1];
  if (last.name.trim() || last.quantity.trim()) {
    items.push({ name: "", quantity: "" });
  }
  onChange("complectation", { items });
}

export default function Stage5Description({ form, onChange, only = null }) {
  const show = (key) => !only || only === key

  return (
    <div className="desc-blocks">
      {show("description") && (
      <DescriptionBlock title="Описание">
        <DescriptionInput
          value={form.description.purpose}
          onChange={(value) =>
            onChange("description", { ...form.description, purpose: value })
          }
          placeholder="Назначение продукта - что это за продукт"
        />
        <DescriptionInput
          value={form.description.usage}
          onChange={(value) =>
            onChange("description", { ...form.description, usage: value })
          }
          placeholder="Для чего используется продукт"
        />
        <DescriptionInput
          value={form.description.principle}
          onChange={(value) =>
            onChange("description", { ...form.description, principle: value })
          }
          placeholder="Принцип работы продукта"
        />
      </DescriptionBlock>
      )}

      {show("complectation") && (
      <DescriptionBlock title="Комплектация">
        <div className="desc-complectation-list">
          {(form.complectation.items || [{ name: "", quantity: "" }]).map(
            (item, index) => (
              <div className="desc-complectation-row" key={index}>
                <DescriptionInput
                  value={item.name}
                  onChange={(value) =>
                    patchComplectationItem(form, onChange, index, { name: value })
                  }
                  placeholder="Что находится в упаковке (укажите наименование)"
                />
                <span className="desc-complectation-row__dash">—</span>
                <div className="desc-complectation-quantity">
                  <DescriptionInput
                    value={item.quantity}
                    onChange={(value) =>
                      patchComplectationItem(form, onChange, index, { quantity: value })
                    }
                    placeholder="количество"
                  />
                  <span className="desc-complectation-quantity__unit">штук</span>
                </div>
              </div>
            ),
          )}
        </div>
      </DescriptionBlock>
      )}

      {show("applicationArea") && (
      <DescriptionBlock title="Область эксплуатации продукта">
        <DescriptionInput
          value={form.applicationArea.sphere}
          onChange={(value) =>
            onChange("applicationArea", {
              ...form.applicationArea,
              sphere: value,
            })
          }
          placeholder="Для какой сферы предназначен этот продукт?"
        />
        <DescriptionInput
          value={form.applicationArea.method}
          onChange={(value) =>
            onChange("applicationArea", {
              ...form.applicationArea,
              method: value,
            })
          }
          placeholder="Способ применение"
        />
      </DescriptionBlock>
      )}

      {show("storageConditions") && (
      <DescriptionBlock title="Условия транспортировки, хранения, эксплуатации">
        <ConditionGroup
          title="Условия транспортировки"
          values={form.storageConditions.transport}
          onChange={(value) =>
            onChange("storageConditions", {
              ...form.storageConditions,
              transport: value,
            })
          }
        />
        <ConditionGroup
          title="Условия хранения"
          values={form.storageConditions.storage}
          onChange={(value) =>
            onChange("storageConditions", {
              ...form.storageConditions,
              storage: value,
            })
          }
        />
        <ConditionGroup
          title="Условия эксплуатации"
          values={form.storageConditions.operation}
          onChange={(value) =>
            onChange("storageConditions", {
              ...form.storageConditions,
              operation: value,
            })
          }
        />
        <div className="desc-subsection">
          <p className="desc-subsection__title">Срок службы</p>
          <DescriptionInput
            value={form.storageConditions.shelfLife}
            onChange={(value) =>
              onChange("storageConditions", {
                ...form.storageConditions,
                shelfLife: value,
              })
            }
            placeholder="Срок службы"
          />
        </div>
      </DescriptionBlock>
      )}

      {show("precautions") && (
      <DescriptionBlock title="Меры предосторожности">
        <DescriptionInput
          value={form.precautions.hazardClass}
          onChange={(value) =>
            onChange("precautions", { ...form.precautions, hazardClass: value })
          }
          placeholder="класс опасности (опционально)"
        />
        <DescriptionInput
          value={form.precautions.safety}
          onChange={(value) =>
            onChange("precautions", { ...form.precautions, safety: value })
          }
          placeholder="Указание мер безопасности"
        />
        <DescriptionInput
          value={form.precautions.disposal}
          onChange={(value) =>
            onChange("precautions", { ...form.precautions, disposal: value })
          }
          placeholder="утилизация товаров и упаковки"
        />
      </DescriptionBlock>
      )}
    </div>
  );
}
