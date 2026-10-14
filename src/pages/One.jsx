// One.jsx — Этап 4: Создание модели (параметра)
import { useRef, useState } from "react";
import "./One.css";

/* =========================================================
   ВЕРХНИЕ 6 ТАБОВ ЭТАПА
   ========================================================= */
const TABS = [
    { key: "identification", label: "1. Идентификация конкретной модели" },
    { key: "documents", label: "2. Документы конкретной модели" },
    { key: "packaging", label: "3. Упаковка конкретной модели" },
    { key: "pricing", label: "4. Ценообразование конкретной модели" },
    { key: "delivery", label: "5. Доставка конкретной модели" },
    {
        key: "characteristics",
        label: "6. Технические, физические и функциональные характеристики конкретной модели",
    },
];

/* =========================================================
   ПОДРАЗДЕЛЫ «ИДЕНТИФИКАЦИИ»
   ========================================================= */
const IDENT_SECTIONS = [
    { key: "photos", label: "Фотографии конкретной модели" },
    { key: "characteristics", label: "Характеристики конкретной модели" },
    { key: "manufacturer", label: "Сведения о производителе" },
    { key: "description", label: "Описание конкретной модели" },
];

const PACK_SECTIONS = [
    { key: "packaging", label: "Упаковка конкретной модели" },
    { key: "kit", label: "Комплектация" },
];

const PRICING_SECTIONS = [
    { key: "price", label: "Стоимость конкретной модели" },
    { key: "loyalty", label: "Система лояльности конкретной модели" },
];

const CURRENCY_SYMBOLS = { RUB: "₽", CNY: "¥" };

/* =========================================================
   Вспомогательные компоненты
   ========================================================= */

function BlockTitle({ children }) {
    return <div className="one-block-title">{children}</div>;
}

function FieldRow({ required, label, value, onChange, placeholder = "Значение", hint }) {
    return (
        <div className="one-field">
            <span className={`one-field__req${required ? "" : " one-field__req--hidden"}`}>
                {required ? "требует заполнения" : ""}
            </span>
            <button
                type="button"
                className="one-field__help"
                title={hint || "Подсказка"}
                aria-label="Подсказка"
            >
                ?
            </button>
            <span className="one-field__star">{required ? "✱" : ""}</span>
            <span className="one-field__label">{label}</span>
            <input
                type="text"
                className="one-field__input"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

function ChoicePair({ required, label, value, onChange, hint }) {
    const options = [
        { value: "no", label: "Не допускается" },
        { value: "yes", label: "Допускается" },
    ];
    return (
        <div className="one-field one-field--pair">
            <span className={`one-field__req${required ? "" : " one-field__req--hidden"}`}>
                {required ? "требует заполнения" : ""}
            </span>
            <button
                type="button"
                className="one-field__help"
                title={hint || "Подсказка"}
                aria-label="Подсказка"
            >
                ?
            </button>
            <span className="one-field__star">{required ? "✱" : ""}</span>
            <span className="one-field__label">{label}</span>
            <div className="one-field__pairs">
                {options.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        className={`one-chip${value === o.value ? " one-chip--active" : ""}`}
                        onClick={() => onChange(o.value)}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* =========================================================
   ПОЛЯ ДОКУМЕНТОВ
   ========================================================= */
const DOC_FIELDS = [
    { code: "warranty", label: "Гарантийный талон", required: true, template: true },
    { code: "manual", label: "Руководство по эксплуатации", required: true },
    { code: "certificate", label: "Сертификат соответствия" },
    { code: "declaration", label: "Декларация о соответствии" },
    { code: "stateRegistration", label: "Свидетельство о государственной регистрации" },
    { code: "registration", label: "Регистрационное удостоверение" },
    { code: "other", label: "Иной документ" },
];

/* =========================================================
   СЕКЦИЯ 2. ДОКУМЕНТЫ КОНКРЕТНОЙ МОДЕЛИ
   ========================================================= */
function SectionDocuments({ docs, onPick, onRemove }) {
    return (
        <section className="one-block one-docs">
            {DOC_FIELDS.map((field) => {
                const file = docs[field.code];
                return (
                    <div className="one-docs__field" key={field.code}>
                        <label className="one-docs__label">{field.label}</label>

                        <div className="one-docs__row">
                            <span className="one-docs__req-slot">
                                {field.required ? (
                                    <>
                                        <span className="one-docs__req-text one-field__req">
                                            требует заполнения
                                        </span>
                                        <span className="one-docs__req-star">✱</span>
                                    </>
                                ) : (
                                    <span className="one-docs__req-space" aria-hidden="true" />
                                )}
                            </span>

                            <div className="one-docs__input-wrap">
                                <input
                                    type="text"
                                    className="one-docs__input"
                                    value={file ? file.name : ""}
                                    placeholder={field.label}
                                    readOnly
                                />
                                {file && (
                                    <button
                                        type="button"
                                        className="one-docs__clear"
                                        title="Удалить файл"
                                        onClick={() => onRemove(field.code)}
                                    >
                                        ✕
                                    </button>
                                )}
                                <label className="one-docs__clip" title="Прикрепить файл">
                                    📎
                                    <input
                                        type="file"
                                        style={{ display: "none" }}
                                        onChange={(e) => onPick(field.code, e)}
                                    />
                                </label>
                            </div>

                            {field.template && (
                                <button
                                    type="button"
                                    className="one-docs__template"
                                    onClick={() => { }}
                                >
                                    Шаблон
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </section>
    );
}

/* =========================================================
   СЕКЦИЯ 3.1. УПАКОВКА
   ========================================================= */
function SectionPackaging({ data, onChange }) {
    const packMaterials = {
        box: [
            { value: "cardboard", label: "Картон" },
            { value: "plastic", label: "Пластик" },
            { value: "other", label: "Иное" },
        ],
        case: [
            { value: "hdpe", label: "Полиэтилен высокой плотности" },
            { value: "plastic", label: "Пластик" },
            { value: "nylon", label: "Нейлон" },
            { value: "other", label: "Иное" },
        ],
        blister: [
            { value: "hdpe", label: "Полиэтилен высокой плотности" },
            { value: "pet", label: "Полиэтилентерефталат" },
            { value: "pvc", label: "Поливинилхлорид" },
            { value: "other", label: "Иное" },
        ],
    };

    const packTypes = [
        { value: "box", label: "Коробка" },
        { value: "case", label: "Футляр" },
        { value: "blister", label: "Блистер" },
    ];

    const materials = packMaterials[data.packType] || [];

    return (
        <section id="pack-packaging" className="one-block">
            <BlockTitle>Упаковка модели (параметра)</BlockTitle>

            <p className="one-pack__intro">
                Добавьте описание заводской упаковки, в которой продукт поступает
                к покупателю.
            </p>

            <div className="one-pack__group">
                <p className="one-pack__title">
                    <span className="one-pack__req">требует заполнения</span>
                    <span className="one-pack__help">?</span>
                    Укажите вид упаковки:
                </p>
                <div className="one-pack__radios">
                    {packTypes.map((type) => (
                        <label key={type.value} className="one-radio">
                            <input
                                type="radio"
                                name="packType"
                                value={type.value}
                                checked={data.packType === type.value}
                                onChange={() => onChange({ packType: type.value, packMaterial: "" })}
                            />
                            <span>{type.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="one-pack__group">
                <p className="one-pack__title">
                    <span className="one-pack__req">требует заполнения</span>
                    <span className="one-pack__help">?</span>
                    Укажите материал упаковки:
                </p>

                {!data.packType && (
                    <p className="one-pack__hint">Сначала выберите вид упаковки выше</p>
                )}

                {data.packType && (
                    <>
                        <div className="one-pack__chips">
                            {materials.map((m) => (
                                <button
                                    key={m.value}
                                    type="button"
                                    className={`one-chip${data.packMaterial === m.value ? " one-chip--active" : ""}`}
                                    onClick={() => onChange({ packMaterial: m.value })}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        {data.packMaterial === "other" && (
                            <input
                                type="text"
                                className="one-field__input one-pack__custom"
                                placeholder="Введите своё значение"
                                value={data.packMaterialCustom || ""}
                                onChange={(e) => onChange({ packMaterialCustom: e.target.value })}
                            />
                        )}
                    </>
                )}
            </div>

            <div className="one-pack__group">
                <p className="one-pack__title one-pack__title--strong">
                    <span className="one-pack__req">требует заполнения</span>
                    <span className="one-pack__help">?</span>
                    Хрупкий продукт
                </p>
                <div className="one-pack__radios">
                    <label className="one-radio">
                        <input
                            type="radio"
                            name="isFragile"
                            value="yes"
                            checked={data.isFragile === "yes"}
                            onChange={() => onChange({ isFragile: "yes" })}
                        />
                        <span>Да</span>
                    </label>
                    <label className="one-radio">
                        <input
                            type="radio"
                            name="isFragile"
                            value="no"
                            checked={data.isFragile === "no"}
                            onChange={() => onChange({ isFragile: "no" })}
                        />
                        <span>Нет</span>
                    </label>
                </div>
            </div>

            <div className="one-pack__group">
                <p className="one-pack__title one-pack__title--strong">
                    <span className="one-pack__req">требует заполнения</span>
                    <span className="one-pack__help">?</span>
                    Вес продукта в упаковке
                </p>
                <div className="one-pack__weight">
                    <input
                        type="text"
                        className="one-field__input"
                        placeholder="Значение"
                        value={data.weight || ""}
                        onChange={(e) => onChange({ weight: e.target.value })}
                    />
                    <select
                        className="one-pack__select"
                        value={data.weightUnit || "gram"}
                        onChange={(e) => onChange({ weightUnit: e.target.value })}
                    >
                        <option value="gram">Грамм</option>
                        <option value="kilogram">Килограмм</option>
                    </select>
                </div>
            </div>

            <div className="one-pack__group">
                <p className="one-pack__title one-pack__title--strong">
                    <span className="one-pack__help">?</span>
                    Укажите внешние размеры упаковки (длина x ширина x высота):
                </p>
                {["length", "width", "height"].map((dim) => (
                    <div className="one-pack__dim" key={dim}>
                        <span className="one-pack__req">требует заполнения</span>
                        <span className="one-pack__dim-label">
                            {dim === "length" ? "Длина" : dim === "width" ? "Ширина" : "Высота"}
                        </span>
                        <input
                            type="text"
                            className="one-field__input"
                            value={data.packSizes?.[dim] || ""}
                            onChange={(e) =>
                                onChange({
                                    packSizes: { ...(data.packSizes || {}), [dim]: e.target.value },
                                })
                            }
                        />
                        <select
                            className="one-pack__select"
                            value={data.packSizeUnit || "sm"}
                            onChange={(e) => onChange({ packSizeUnit: e.target.value })}
                        >
                            <option value="sm">Сантиметры</option>
                            <option value="mm">Миллиметры</option>
                        </select>
                    </div>
                ))}
            </div>

            <div className="one-pack__group">
                <p className="one-pack__title one-pack__title--strong">
                    <span className="one-pack__help">?</span>
                    Добавьте фотографии упаковки продукта:
                </p>

                <button type="button" className="one-photos__add">
                    <span className="one-photos__add-plus">＋</span>
                    Добавить фотографию (0/5)
                </button>

                <div className="one-photos__grid">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <button
                            type="button"
                            key={i}
                            className={`one-photos__slot${i === 0 ? " one-photos__slot--first" : ""}`}
                            aria-label={`Слот фотографии упаковки ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

/* =========================================================
   СЕКЦИЯ 3.2. КОМПЛЕКТАЦИЯ
   ========================================================= */
function SectionKit({ items, onChange }) {
    const commitRows = (nextRows) => {
        const last = nextRows[nextRows.length - 1];
        const lastFilled =
            last &&
            (String(last.name || "").trim() ||
                String(last.qty || "").trim() ||
                last.photo);

        if (lastFilled) {
            nextRows = [
                ...nextRows,
                { id: Date.now() + Math.random(), name: "", qty: "", photo: null },
            ];
        }
        onChange(nextRows);
    };

    const updateRow = (id, patch) => {
        const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
        commitRows(next);
    };

    const setPhoto = (id, file) => updateRow(id, { photo: file });

    return (
        <section id="pack-kit" className="one-block">
            <h3 className="one-kit__title">
                <span className="one-kit__help one-kit__help--lg">?</span>
                <span>Комплектация</span>
            </h3>

            <p className="one-kit__intro">
                Опишите всё, что входит в комплект поставки (в упаковку):
                <br />
                Аксессуары, которые находятся в упаковке с моделью (например: кабель,
                зарядное устройство, чехол, ремешок)
                <br />
                Документы (инструкция)
            </p>

            <div className="one-kit__list">
                {items.map((item, index) => (
                    <div className="one-kit__row" key={item.id}>
                        <span className="one-kit__help one-kit__help--row" aria-hidden="true">
                            ?
                        </span>
                        <span className="one-kit__num">{index + 1}.</span>

                        <input
                            type="text"
                            className="one-kit__name"
                            placeholder={
                                index === 0 ? "*Наименование модели*" : "Наименование"
                            }
                            value={item.name}
                            onChange={(e) => updateRow(item.id, { name: e.target.value })}
                        />

                        <span className="one-kit__dash">—</span>

                        <input
                            type="text"
                            className="one-kit__qty"
                            placeholder="Количество"
                            value={item.qty}
                            onChange={(e) => updateRow(item.id, { qty: e.target.value })}
                        />

                        <span className="one-kit__unit">штук</span>

                        <label className="one-kit__photo">
                            {item.photo ? (
                                <img
                                    src={URL.createObjectURL(item.photo)}
                                    alt=""
                                    className="one-kit__photo-preview"
                                />
                            ) : (
                                <>
                                    <span className="one-kit__photo-plus">＋</span>
                                    <span className="one-kit__photo-text">Добавить фото</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = "";
                                    if (f) setPhoto(item.id, f);
                                }}
                            />
                        </label>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* =========================================================
   СЕКЦИЯ 4. ЦЕНООБРАЗОВАНИЕ
   ========================================================= */
function SectionPricing({ data, onChange }) {
    const updateDiscount = (index, patch) =>
        onChange({
            discounts: data.discounts.map((d, i) =>
                i === index ? { ...d, ...patch } : d,
            ),
        });

    const toggleDiscount = (index) =>
        updateDiscount(index, { enabled: !data.discounts[index].enabled });

    return (
        <>
            <section id="price-cost" className="one-block">
                <p className="one-price__lead">Укажите стоимость модели</p>

                <h3 className="one-price__title">
                    <span className="one-price__help">?</span>
                    Стоимость модели
                </h3>

                <div className="one-price__row">
                    <span className="one-price__label">Выберите валюту:</span>
                    <div className="one-price__currencies">
                        <button
                            type="button"
                            className={`one-price__currency${data.currency === "RUB" ? " one-price__currency--active" : ""}`}
                            onClick={() => onChange({ currency: "RUB" })}
                        >
                            ₽ RUB
                        </button>
                        <button
                            type="button"
                            className={`one-price__currency${data.currency === "CNY" ? " one-price__currency--active" : ""}`}
                            onClick={() => onChange({ currency: "CNY" })}
                        >
                            ¥ CNY
                        </button>
                    </div>
                </div>

                <div className="one-price__row">
                    <span className="one-field__req">требует заполнения</span>
                    <span className="one-price__label one-price__label--wide">
                        Введите стоимость модели:
                    </span>
                    <span className="one-price__symbol">
                        {CURRENCY_SYMBOLS[data.currency]}
                    </span>
                    <input
                        type="text"
                        className="one-price__input"
                        value={data.price}
                        onChange={(e) => onChange({ price: e.target.value })}
                    />
                </div>
            </section>

            <section id="price-loyalty" className="one-block">
                <p className="one-price__lead">выберите систему лояльности</p>

                <h3 className="one-price__title">
                    <span className="one-price__help">?</span>
                    Система лояльности
                </h3>

                <p className="one-price__subtitle">
                    1.Предоставить скидку от количества продукта
                </p>

                <div className="one-loyalty__list">
                    {data.discounts.map((discount, index) => (
                        <div className="one-loyalty__row" key={index}>
                            <span className="one-field__req">
                                {index === 0 ? "требует заполнения" : ""}
                            </span>

                            <button
                                type="button"
                                className={`one-toggle${discount.enabled ? " one-toggle--on" : ""}`}
                                onClick={() => toggleDiscount(index)}
                                aria-pressed={discount.enabled}
                                aria-label={discount.enabled ? "Выключить" : "Включить"}
                            >
                                <span className="one-toggle__knob" />
                            </button>

                            <span className="one-loyalty__text">При покупке от</span>

                            <input
                                type="text"
                                className="one-loyalty__input"
                                value={discount.from}
                                disabled={!discount.enabled}
                                onChange={(e) =>
                                    updateDiscount(index, { from: e.target.value })
                                }
                            />

                            <span className="one-loyalty__text">до</span>

                            <input
                                type="text"
                                className="one-loyalty__input"
                                value={discount.to}
                                disabled={!discount.enabled}
                                onChange={(e) =>
                                    updateDiscount(index, { to: e.target.value })
                                }
                            />

                            <span className="one-loyalty__text">
                                штук, стоимость за единицу продукта составит
                            </span>

                            <span className="one-price__symbol">
                                {CURRENCY_SYMBOLS[data.currency]}
                            </span>

                            <input
                                type="text"
                                className="one-loyalty__input one-loyalty__input--price"
                                value={discount.value}
                                disabled={!discount.enabled}
                                onChange={(e) =>
                                    updateDiscount(index, { value: e.target.value })
                                }
                            />

                            <span className="one-loyalty__info" title="Подсказка">
                                ⓘ
                            </span>

                            {index === 0 && <span className="one-loyalty__star">✱</span>}
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}

/* =========================================================
   СЕКЦИЯ 5. ДОСТАВКА
   ========================================================= */
const blankWarehouse = () => ({
    name: "",
    index: "",
    region: "",
    city: "",
    street: "",
    house: "",
    office: "",
});

function composeAddress(w) {
    const parts = [
        w.index,
        w.name,
        w.region,
        w.city ? `г. ${w.city}` : "",
        w.street ? `ул. ${w.street}` : "",
        w.house ? `д. ${w.house}` : "",
        w.office ? `офис ${w.office}` : "",
    ];
    return parts.map((p) => String(p || "").trim()).filter(Boolean).join(", ");
}

function warehouseFormFrom(item) {
    return {
        name: item.name || "",
        index: item.index || "",
        region: item.region || "",
        city: item.city || "",
        street: item.street || "",
        house: item.house || "",
        office: item.office || "",
    };
}

function SectionDelivery({ items, onChange }) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(blankWarehouse);

    const updateItem = (id, patch) =>
        onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

    const toggleItem = (id) => {
        const current = items.find((it) => it.id === id);
        updateItem(id, { active: !current.active });
    };

    const setField = (field, value) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const openNewForm = () => {
        if (showForm && editingId == null) {
            closeForm();
            return;
        }
        setEditingId(null);
        setForm(blankWarehouse());
        setShowForm(true);
    };

    const editItem = (id) => {
        const current = items.find((it) => it.id === id);
        if (!current) return;
        setForm(warehouseFormFrom(current));
        setEditingId(id);
        setShowForm(true);
    };

    const closeForm = () => {
        setForm(blankWarehouse());
        setEditingId(null);
        setShowForm(false);
    };

    const saveForm = () => {
        const address = composeAddress(form);
        const stored = {
            name: form.name,
            index: form.index,
            region: form.region,
            city: form.city,
            street: form.street,
            house: form.house,
            office: form.office,
            address,
        };

        if (editingId == null) {
            onChange([
                ...items,
                {
                    id: Date.now(),
                    active: true,
                    quantity: "",
                    ...stored,
                },
            ]);
        } else {
            updateItem(editingId, stored);
        }
        closeForm();
    };

    return (
        <section id="delivery" className="one-block">
            <BlockTitle>Доставка модели</BlockTitle>

            <p className="one-delivery__intro">
                Выберите склад и укажите количество продукта на каждом складе
            </p>

            <button type="button" className="one-delivery__add" onClick={openNewForm}>
                <span className="one-delivery__add-plus">＋</span>
                <span className="one-delivery__add-text">Добавить адрес отгрузки</span>
            </button>

            {showForm && (
                <div className="one-delivery__form">
                    <input
                        type="text"
                        className="one-delivery__form-input"
                        placeholder="Наименование склада"
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                    />
                    <input
                        type="text"
                        className="one-delivery__form-input"
                        placeholder="Индекс"
                        value={form.index}
                        onChange={(e) => setField("index", e.target.value)}
                    />
                    <input
                        type="text"
                        className="one-delivery__form-input"
                        placeholder="Область"
                        value={form.region}
                        onChange={(e) => setField("region", e.target.value)}
                    />
                    <input
                        type="text"
                        className="one-delivery__form-input"
                        placeholder="Город"
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                    />
                    <input
                        type="text"
                        className="one-delivery__form-input"
                        placeholder="Улица"
                        value={form.street}
                        onChange={(e) => setField("street", e.target.value)}
                    />
                    <input
                        type="text"
                        className="one-delivery__form-input"
                        placeholder="Дом"
                        value={form.house}
                        onChange={(e) => setField("house", e.target.value)}
                    />
                    <input
                        type="text"
                        className="one-delivery__form-input"
                        placeholder="Офис"
                        value={form.office}
                        onChange={(e) => setField("office", e.target.value)}
                    />

                    <div className="one-delivery__form-actions">
                        <button
                            type="button"
                            className="one-delivery__form-btn one-delivery__form-btn--cancel"
                            onClick={closeForm}
                            title="Отмена"
                        >
                            ✕
                        </button>
                        <button
                            type="button"
                            className="one-delivery__form-btn one-delivery__form-btn--save"
                            onClick={saveForm}
                            title="Сохранить"
                        >
                            ✓
                        </button>
                    </div>
                </div>
            )}

            <div className="one-delivery__list">
                {items.map((item) => (
                    <div className="one-delivery__item" key={item.id}>
                        <div className="one-delivery__head">
                            <button
                                type="button"
                                className={`one-toggle${item.active ? " one-toggle--on" : ""}`}
                                onClick={() => toggleItem(item.id)}
                                aria-pressed={item.active}
                                aria-label={item.active ? "Выключить" : "Включить"}
                            >
                                <span className="one-toggle__knob" />
                            </button>

                            <div className="one-delivery__body">
                                <div className="one-delivery__address">
                                    {item.address || "Адрес не указан"}
                                </div>
                                <div className="one-delivery__status">
                                    {item.active ? "Склад активный" : "Склад неактивный"}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="one-delivery__edit"
                                title="Редактировать"
                                aria-label="Редактировать"
                                onClick={() => editItem(item.id)}
                            >
                                ✎
                            </button>
                        </div>

                        {item.active && (
                            <div className="one-delivery__qty">
                                <span className="one-delivery__help">?</span>
                                <span className="one-delivery__qty-label">
                                    Количество товаров на складе:
                                </span>
                                <input
                                    type="text"
                                    className="one-delivery__qty-input"
                                    value={item.quantity}
                                    onChange={(e) =>
                                        updateItem(item.id, { quantity: e.target.value })
                                    }
                                />
                                <span className="one-delivery__qty-unit">штук</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

/* =========================================================
   СЕКЦИЯ 1. ФОТОГРАФИИ
   ========================================================= */
function SectionPhotos() {
    const slots = 5;

    return (
        <section id="ident-photos" className="one-block">
            <BlockTitle>Фотографии конкретной модели</BlockTitle>

            <div className="one-photos">
                <div className="one-photos__left">
                    <p className="one-photos__label">Требования к фотографиям:</p>
                    <div className="one-photos__req">
                        <p><b>Фон:</b> продукт на фотографии должен быть на белом фоне.</p>
                        <p><b>Ракурс:</b> продукт должен занимать 2/3 изображения.</p>
                        <p><b>Формат:</b> JPG, PNG.</p>
                        <p>
                            <b>Размер фотографий:</b><br />
                            минимальный — 1000 X 1000 px<br />
                            рекомендуемый — 1600 X 1600 px<br />
                            максимальный — 2560 X 1440 px
                        </p>
                    </div>
                </div>

                <div className="one-photos__right">
                    <p className="one-photos__label">Пример правильного заполнения:</p>
                    <div className="one-photos__examples">
                        <img src="/images/product-single-example1.png" alt="Пример 1" />
                        <img src="/images/product-single-example2.png" alt="Пример 2" />
                    </div>
                </div>
            </div>

            <button type="button" className="one-photos__add">
                <span className="one-photos__add-plus">＋</span>
                Добавить фотографию (0/{slots})
            </button>

            <div className="one-photos__grid">
                {Array.from({ length: slots }).map((_, i) => (
                    <button
                        type="button"
                        key={i}
                        className={`one-photos__slot${i === 0 ? " one-photos__slot--first" : ""}`}
                        aria-label={`Слот фотографии ${i + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}

/* =========================================================
   СЕКЦИЯ 2. ХАРАКТЕРИСТИКИ (для подраздела «Идентификация»)
   ========================================================= */
function SectionCharacteristics({ values, onChange }) {
    return (
        <section id="ident-characteristics" className="one-block">
            <BlockTitle>Характеристики конкретной модели</BlockTitle>

            <FieldRow
                label="Артикул модели (параметра) от завода-изготовителя"
                value={values.article}
                onChange={(v) => onChange("article", v)}
                hint="Артикул, присвоенный производителем"
            />
            <FieldRow
                required
                label="Наименование модели"
                value={values.model}
                onChange={(v) => onChange("model", v)}
                hint="Как модель называется у производителя"
            />
        </section>
    );
}

/* =========================================================
   СЕКЦИЯ 6. ХАРАКТЕРИСТИКИ — вспомогательные компоненты
   ========================================================= */

const CHAR_SIDEBAR = [
    { key: "technical", label: "Технические характеристики" },
    { key: "physical", label: "Физические характеристики" },
    { key: "functional", label: "Функциональные характеристики" },
];

const TECH_SECTIONS = [
    { key: "tech-warranty", label: "Гарантийные обязательства" },
    { key: "tech-technical", label: "Технические характеристики" },
    { key: "tech-power", label: "Энергопотребление" },
    { key: "tech-display", label: "Дисплей" },
    { key: "tech-system", label: "Системные компоненты" },
];

function CharRow({ required, label, value, onChange, children }) {
    return (
        <div className={`one-char__row${required ? " one-char__row--required" : ""}`}>
            <span className="one-char__req">
                {required ? "требует заполнения" : ""}
            </span>
            <label className="one-char__check" title="Отобразить в наименовании модели">
                <input
                    type="checkbox"
                    checked={Boolean(value?.inName)}
                    onChange={(e) => onChange({ ...value, inName: e.target.checked })}
                />
            </label>
            <span className="one-char__info" title="Подсказка">ⓘ</span>
            <span className="one-char__star">{required ? "✱" : ""}</span>
            <span className="one-char__label">{label}</span>
            <div className="one-char__control">{children}</div>
        </div>
    );
}

function CharInput({ value, onChange, placeholder = "Значение", unit }) {
    return (
        <div className="one-char__input-wrap">
            <input
                type="text"
                className="one-char__input"
                placeholder={placeholder}
                value={value?.text || ""}
                onChange={(e) => onChange({ ...value, text: e.target.value })}
            />
            {unit?.length > 0 && (
                <select
                    className="one-char__unit"
                    value={value?.unit || unit[0].value}
                    onChange={(e) => onChange({ ...value, unit: e.target.value })}
                >
                    {unit.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                </select>
            )}
            {!unit && value?.unitLabel && (
                <span className="one-char__unit-label">{value.unitLabel}</span>
            )}
        </div>
    );
}

function CharChips({ value, onChange, options }) {
    return (
        <div className="one-char__chips">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    className={`one-chip${value?.text === o.value ? " one-chip--active" : ""}`}
                    onClick={() => onChange({ ...value, text: o.value })}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function CharGroupTitle({ children }) {
    return <p className="one-char__group-title">{children}</p>;
}

function CharCustom({ value, onChange }) {
    return (
        <div className="one-char__custom">
            <span className="one-char__info" title="Подсказка">ⓘ</span>
            <input
                type="text"
                className="one-char__custom-name"
                placeholder="Наименование характеристики"
                value={value?.name || ""}
                onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
            <input
                type="text"
                className="one-char__custom-value"
                placeholder="Значение"
                value={value?.text || ""}
                onChange={(e) => onChange({ ...value, text: e.target.value })}
            />
            <select
                className="one-char__custom-unit"
                value={value?.unit || ""}
                onChange={(e) => onChange({ ...value, unit: e.target.value })}
            >
                <option value="">Единица измерения</option>
                <option value="mm">мм</option>
                <option value="cm">см</option>
                <option value="g">г</option>
                <option value="kg">кг</option>
                <option value="vt">Вт</option>
                <option value="hz">Гц</option>
                <option value="db">дБ</option>
            </select>
        </div>
    );
}

/* =========================================================
   СЕКЦИЯ 6. ХАРАКТЕРИСТИКИ — полный вид
   ========================================================= */
function SectionCharacteristicsFull({ values, onChange }) {
    const [sideTab, setSideTab] = useState("technical");

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <section className="one-block one-char">
            <h2 className="one-char__heading">
                Технические, физические и функциональные характеристики модели
            </h2>
            <p className="one-char__hint">
                Заполните характеристики, которые будут соответствовать модели (параметру).
                <br />
                Отметьте галочкой характеристики, которые будут отображаться
                в наименовании модели (параметра).
            </p>

            <div className="one-char__layout">
                <aside className="one-char__sidebar">
                    {CHAR_SIDEBAR.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            className={`one-char__side${sideTab === s.key ? " one-char__side--active" : ""}`}
                            onClick={() => setSideTab(s.key)}
                        >
                            {s.label}
                        </button>
                    ))}
                </aside>

                <div className="one-char__content">
                    {sideTab === "technical" && (
                        <>
                            <nav
                                className="one-char__nav"
                                aria-label="Разделы технических характеристик"
                            >
                                {TECH_SECTIONS.map((s, i) => (
                                    <button
                                        key={s.key}
                                        type="button"
                                        className="one-char__nav-item"
                                        onClick={() => scrollTo(s.key)}
                                    >
                                        {i + 1}. {s.label}
                                    </button>
                                ))}
                            </nav>

                            <TechCharacteristics values={values} onChange={onChange} />
                        </>
                    )}
                    {sideTab === "physical" && (
                        <p className="one-char__placeholder">
                            Раздел «Физические характеристики» — в разработке.
                        </p>
                    )}
                    {sideTab === "functional" && (
                        <p className="one-char__placeholder">
                            Раздел «Функциональные характеристики» — в разработке.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

/* =========================================================
   ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ
   ========================================================= */
function TechCharacteristics({ values, onChange }) {
    const v = (code) => values[code] || {};
    const set = (code) => (patch) => onChange(code, patch);

    return (
        <>
            {/* --- Гарантийные обязательства --- */}
            <h3 id="tech-warranty" className="one-char__section-title">
                Гарантийные обязательства
            </h3>

            <CharRow
                required
                label="Гарантия производителя"
                value={v("warrantyPeriod")}
                onChange={set("warrantyPeriod")}
            >
                <input
                    type="number"
                    className="one-char__input one-char__input--sm"
                    placeholder="Введите число"
                    value={v("warrantyPeriod").text || ""}
                    onChange={(e) =>
                        onChange("warrantyPeriod", {
                            ...v("warrantyPeriod"),
                            text: e.target.value,
                        })
                    }
                />
                <select
                    className="one-char__unit"
                    value={v("warrantyPeriod").unit || "months"}
                    onChange={(e) =>
                        onChange("warrantyPeriod", {
                            ...v("warrantyPeriod"),
                            unit: e.target.value,
                        })
                    }
                >
                    <option value="days">дней</option>
                    <option value="months">месяцев</option>
                    <option value="years">лет</option>
                </select>
            </CharRow>

            <CharRow
                required
                label="Срок эксплуатации"
                value={v("serviceLife")}
                onChange={set("serviceLife")}
            >
                <input
                    type="number"
                    className="one-char__input one-char__input--sm"
                    placeholder="Введите число"
                    value={v("serviceLife").text || ""}
                    onChange={(e) =>
                        onChange("serviceLife", {
                            ...v("serviceLife"),
                            text: e.target.value,
                        })
                    }
                />
                <select
                    className="one-char__unit"
                    value={v("serviceLife").unit || "months"}
                    onChange={(e) =>
                        onChange("serviceLife", {
                            ...v("serviceLife"),
                            unit: e.target.value,
                        })
                    }
                >
                    <option value="days">дней</option>
                    <option value="months">месяцев</option>
                    <option value="years">лет</option>
                </select>
            </CharRow>

            {/* --- Технические --- */}
            <h3 id="tech-technical" className="one-char__section-title">
                Технические
            </h3>

            <CharGroupTitle>Охлаждение</CharGroupTitle>

            <CharRow label="Охлаждение" value={v("hasCooling")} onChange={set("hasCooling")}>
                <CharChips
                    value={v("hasCooling")}
                    onChange={set("hasCooling")}
                    options={[
                        { value: "yes", label: "Есть" },
                        { value: "no", label: "Нет" },
                    ]}
                />
            </CharRow>
            <CharRow label="Тип охлаждения" value={v("coolingType")} onChange={set("coolingType")}>
                <CharInput value={v("coolingType")} onChange={set("coolingType")} />
            </CharRow>

            <CharGroupTitle>Двигатель</CharGroupTitle>

            <CharRow label="Количество цилиндров" value={v("cylinders")} onChange={set("cylinders")}>
                <CharInput
                    value={v("cylinders")}
                    onChange={set("cylinders")}
                    unit={[{ value: "шт", label: "шт." }]}
                />
            </CharRow>
            <CharRow
                label="Количество тактов двигателя"
                value={v("engineStrokes")}
                onChange={set("engineStrokes")}
            >
                <CharInput
                    value={v("engineStrokes")}
                    onChange={set("engineStrokes")}
                    unit={[{ value: "такт", label: "такт" }]}
                />
            </CharRow>
            <CharRow
                label="Скорость вращения двигателя"
                value={v("engineSpeed")}
                onChange={set("engineSpeed")}
            >
                <CharInput
                    value={v("engineSpeed")}
                    onChange={set("engineSpeed")}
                    unit={[{ value: "rpm", label: "об/мин" }]}
                />
            </CharRow>
            <CharRow label="Тип стартера" value={v("starterType")} onChange={set("starterType")}>
                <CharChips
                    value={v("starterType")}
                    onChange={set("starterType")}
                    options={[
                        { value: "manual", label: "Ручной" },
                        { value: "electric", label: "Электрический" },
                        { value: "auto", label: "Автоматический" },
                    ]}
                />
            </CharRow>
            <CharRow label="Вид топлива" value={v("fuelType")} onChange={set("fuelType")}>
                <CharInput value={v("fuelType")} onChange={set("fuelType")} />
            </CharRow>
            <CharRow
                label="Объём топливного бака"
                value={v("fuelTankVolume")}
                onChange={set("fuelTankVolume")}
            >
                <CharInput
                    value={v("fuelTankVolume")}
                    onChange={set("fuelTankVolume")}
                    unit={[
                        { value: "l", label: "Литры" },
                        { value: "ml", label: "Миллилитры" },
                    ]}
                />
            </CharRow>
            <CharRow
                label="Расход топлива"
                value={v("fuelConsumption")}
                onChange={set("fuelConsumption")}
            >
                <CharInput
                    value={v("fuelConsumption")}
                    onChange={set("fuelConsumption")}
                    unit={[{ value: "l_h", label: "л/ч" }]}
                />
            </CharRow>

            <CharGroupTitle>Уровень шума</CharGroupTitle>

            <CharRow label="Уровень шума" value={v("noiseLevel")} onChange={set("noiseLevel")}>
                <CharInput
                    value={v("noiseLevel")}
                    onChange={set("noiseLevel")}
                    unit={[{ value: "db", label: "дБ" }]}
                />
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom value={v("customTechnical")} onChange={set("customTechnical")} />

            {/* --- Энергопотребление --- */}
            <h3 id="tech-power" className="one-char__section-title">
                Энергопотребление
            </h3>

            <CharGroupTitle>Электропитание</CharGroupTitle>

            <CharRow
                label="Потребляемая мощность"
                value={v("powerConsumption")}
                onChange={set("powerConsumption")}
            >
                <CharInput
                    value={v("powerConsumption")}
                    onChange={set("powerConsumption")}
                    unit={[{ value: "vt", label: "Вт" }]}
                />
            </CharRow>
            <CharRow
                label="Время непрерывной работы"
                value={v("workingTime")}
                onChange={set("workingTime")}
            >
                <CharInput
                    value={v("workingTime")}
                    onChange={set("workingTime")}
                    unit={[
                        { value: "min", label: "Минут" },
                        { value: "hour", label: "Часов" },
                    ]}
                />
            </CharRow>
            <CharRow label="Тип вилки" value={v("plugType")} onChange={set("plugType")}>
                <div className="one-char__stack">
                    <input
                        type="text"
                        className="one-char__input"
                        placeholder="Введите значение"
                        value={v("plugType").text || ""}
                        onChange={(e) =>
                            onChange("plugType", { ...v("plugType"), text: e.target.value })
                        }
                    />
                    <CharChips
                        value={v("plugType")}
                        onChange={set("plugType")}
                        options={[
                            { value: "A", label: "A" },
                            { value: "B", label: "B" },
                            { value: "C", label: "C" },
                            { value: "D", label: "D" },
                            { value: "E", label: "E" },
                        ]}
                    />
                </div>
            </CharRow>
            <CharRow label="Напряжение" value={v("voltage")} onChange={set("voltage")}>
                <CharChips
                    value={v("voltage")}
                    onChange={set("voltage")}
                    options={[
                        { value: "5", label: "5 В" },
                        { value: "12", label: "12 В" },
                        { value: "24", label: "24 В" },
                        { value: "220", label: "220 В" },
                        { value: "380", label: "380 В" },
                    ]}
                />
            </CharRow>
            <CharRow label="Частота" value={v("frequency")} onChange={set("frequency")}>
                <CharInput
                    value={v("frequency")}
                    onChange={set("frequency")}
                    unit={[{ value: "hz", label: "Гц" }]}
                />
            </CharRow>
            <CharRow label="Род тока" value={v("currentType")} onChange={set("currentType")}>
                <CharChips
                    value={v("currentType")}
                    onChange={set("currentType")}
                    options={[
                        { value: "dc", label: "Постоянный" },
                        { value: "ac", label: "Переменный" },
                    ]}
                />
            </CharRow>
            <CharRow label="Число фаз" value={v("phases")} onChange={set("phases")}>
                <CharChips
                    value={v("phases")}
                    onChange={set("phases")}
                    options={[
                        { value: "1", label: "1" },
                        { value: "3", label: "3" },
                    ]}
                />
            </CharRow>

            <CharGroupTitle>Аккумулятор</CharGroupTitle>

            <CharRow
                label="Ёмкость"
                value={v("batteryCapacity")}
                onChange={set("batteryCapacity")}
            >
                <CharInput
                    value={v("batteryCapacity")}
                    onChange={set("batteryCapacity")}
                    unit={[{ value: "mah", label: "мА·ч" }]}
                />
            </CharRow>
            <CharRow
                label="Тип элемента питания"
                value={v("batteryType")}
                onChange={set("batteryType")}
            >
                <div className="one-char__stack">
                    <input
                        type="text"
                        className="one-char__input"
                        placeholder="Введите значение"
                        value={v("batteryType").text || ""}
                        onChange={(e) =>
                            onChange("batteryType", { ...v("batteryType"), text: e.target.value })
                        }
                    />
                    <CharChips
                        value={v("batteryType")}
                        onChange={set("batteryType")}
                        options={[
                            { value: "AA", label: "AA" },
                            { value: "AAA", label: "AAA" },
                            { value: "PP3", label: "Крона (PP3, 9V)" },
                            { value: "CR2032", label: "CR2032" },
                            { value: "Li-Ion", label: "Li-Ion" },
                        ]}
                    />
                </div>
            </CharRow>
            <CharRow
                label="Съёмный аккумулятор"
                value={v("removableBattery")}
                onChange={set("removableBattery")}
            >
                <CharChips
                    value={v("removableBattery")}
                    onChange={set("removableBattery")}
                    options={[
                        { value: "yes", label: "Да" },
                        { value: "no", label: "Нет" },
                    ]}
                />
            </CharRow>

            <CharGroupTitle>Мощность</CharGroupTitle>

            <CharRow label="Номинальная" value={v("nominalPower")} onChange={set("nominalPower")}>
                <CharInput
                    value={v("nominalPower")}
                    onChange={set("nominalPower")}
                    unit={[{ value: "vt", label: "Вт" }]}
                />
            </CharRow>
            <CharRow label="Максимальная" value={v("maxPower")} onChange={set("maxPower")}>
                <CharInput
                    value={v("maxPower")}
                    onChange={set("maxPower")}
                    unit={[{ value: "vt", label: "Вт" }]}
                />
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom value={v("customPower")} onChange={set("customPower")} />

            {/* --- Дисплей --- */}
            <h3 id="tech-display" className="one-char__section-title">
                Дисплей
            </h3>

            <CharRow label="Дисплей" value={v("hasDisplay")} onChange={set("hasDisplay")}>
                <CharChips
                    value={v("hasDisplay")}
                    onChange={set("hasDisplay")}
                    options={[
                        { value: "yes", label: "Есть" },
                        { value: "no", label: "Нет" },
                    ]}
                />
            </CharRow>
            <CharRow label="Тип дисплея" value={v("displayType")} onChange={set("displayType")}>
                <CharChips
                    value={v("displayType")}
                    onChange={set("displayType")}
                    options={[
                        { value: "ips", label: "IPS" },
                        { value: "oled", label: "OLED" },
                        { value: "amoled", label: "AMOLED" },
                        { value: "tft", label: "TFT" },
                        { value: "lcd", label: "LCD" },
                        { value: "led", label: "LED" },
                        { value: "tn", label: "TN" },
                        { value: "va", label: "VA" },
                        { value: "eink", label: "E-Ink" },
                        { value: "touch", label: "Сенсорный" },
                        { value: "non-touch", label: "Несенсорный" },
                    ]}
                />
            </CharRow>
            <CharRow label="Диагональ" value={v("diagonal")} onChange={set("diagonal")}>
                <CharInput
                    value={v("diagonal")}
                    onChange={set("diagonal")}
                    unit={[{ value: "inch", label: "дюймы" }]}
                />
            </CharRow>
            <CharRow
                label="Соотношение сторон"
                value={v("aspectRatio")}
                onChange={set("aspectRatio")}
            >
                <CharChips
                    value={v("aspectRatio")}
                    onChange={set("aspectRatio")}
                    options={[
                        "1:1", "4:3", "3:2", "5:4", "16:9", "16:10",
                        "18:9", "19.5:9", "20:9", "21:9", "32:9", "9:16",
                    ].map((x) => ({ value: x, label: x }))}
                />
            </CharRow>
            <CharRow label="Тип матрицы" value={v("matrixType")} onChange={set("matrixType")}>
                <CharChips
                    value={v("matrixType")}
                    onChange={set("matrixType")}
                    options={[
                        { value: "ips", label: "IPS" },
                        { value: "tn", label: "TN" },
                        { value: "va", label: "VA" },
                    ]}
                />
            </CharRow>
            <CharRow
                label="Частота обновления экрана"
                value={v("refreshRate")}
                onChange={set("refreshRate")}
            >
                <CharInput
                    value={v("refreshRate")}
                    onChange={set("refreshRate")}
                    unit={[{ value: "hz", label: "Гц" }]}
                />
            </CharRow>
            <CharRow label="Яркость" value={v("brightness")} onChange={set("brightness")}>
                <CharInput
                    value={v("brightness")}
                    onChange={set("brightness")}
                    unit={[{ value: "nit", label: "НИТ" }]}
                />
            </CharRow>
            <CharRow label="Разрешение" value={v("resolution")} onChange={set("resolution")}>
                <div className="one-char__stack">
                    <input
                        type="text"
                        className="one-char__input"
                        placeholder="Введите значение"
                        value={v("resolution").text || ""}
                        onChange={(e) =>
                            onChange("resolution", { ...v("resolution"), text: e.target.value })
                        }
                    />
                    <CharChips
                        value={v("resolution")}
                        onChange={set("resolution")}
                        options={[
                            "1280×720", "1366×768", "1600×900", "1920×1080",
                            "2560×1440", "2560×1600", "3840×2160", "3440×1440",
                        ].map((x) => ({ value: x, label: x }))}
                    />
                </div>
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom value={v("customDisplay")} onChange={set("customDisplay")} />

            {/* --- Системные компоненты --- */}
            <h3 id="tech-system" className="one-char__section-title">
                Системные компоненты
            </h3>

            <CharGroupTitle>Процессор</CharGroupTitle>

            <CharRow label="Тип процессора" value={v("processorType")} onChange={set("processorType")}>
                <div className="one-char__stack">
                    <input
                        type="text"
                        className="one-char__input"
                        placeholder="Введите значение"
                        value={v("processorType").text || ""}
                        onChange={(e) =>
                            onChange("processorType", { ...v("processorType"), text: e.target.value })
                        }
                    />
                    <CharChips
                        value={v("processorType")}
                        onChange={set("processorType")}
                        options={[
                            { value: "Intel Core i5", label: "Intel Core i5" },
                            { value: "Intel Core i7", label: "Intel Core i7" },
                            { value: "AMD Ryzen 5", label: "AMD Ryzen 5" },
                            { value: "AMD Ryzen 7", label: "AMD Ryzen 7" },
                            { value: "Apple M1", label: "Apple M1" },
                            { value: "Apple M2", label: "Apple M2" },
                            { value: "Qualcomm Snapdragon", label: "Qualcomm Snapdragon" },
                            { value: "MediaTek Dimensity", label: "MediaTek Dimensity" },
                            { value: "Samsung Exynos", label: "Samsung Exynos" },
                        ]}
                    />
                </div>
            </CharRow>
            <CharRow label="Количество ядер" value={v("cores")} onChange={set("cores")}>
                <CharChips
                    value={v("cores")}
                    onChange={set("cores")}
                    options={[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32, 64].map((x) => ({
                        value: String(x),
                        label: String(x),
                    }))}
                />
            </CharRow>

            <CharGroupTitle>Память</CharGroupTitle>

            <CharRow label="Оперативная память" value={v("ram")} onChange={set("ram")}>
                <CharInput
                    value={v("ram")}
                    onChange={set("ram")}
                    unit={[{ value: "gb", label: "ГБ" }]}
                />
            </CharRow>
            <CharRow label="Встроенная память" value={v("storage")} onChange={set("storage")}>
                <CharInput
                    value={v("storage")}
                    onChange={set("storage")}
                    unit={[
                        { value: "gb", label: "ГБ" },
                        { value: "tb", label: "ТБ" },
                    ]}
                />
            </CharRow>
            <CharRow
                label="Слот для карты памяти"
                value={v("memorySlot")}
                onChange={set("memorySlot")}
            >
                <CharChips
                    value={v("memorySlot")}
                    onChange={set("memorySlot")}
                    options={[
                        { value: "yes", label: "Есть" },
                        { value: "no", label: "Нет" },
                    ]}
                />
            </CharRow>

            <CharGroupTitle>Операционная система</CharGroupTitle>

            <CharRow label="Вид" value={v("osType")} onChange={set("osType")}>
                <CharChips
                    value={v("osType")}
                    onChange={set("osType")}
                    options={[
                        { value: "none", label: "Нет ОС" },
                        { value: "Android", label: "Android" },
                        { value: "iOS", label: "iOS" },
                        { value: "iPadOS", label: "iPadOS" },
                        { value: "Windows", label: "Windows" },
                        { value: "macOS", label: "macOS" },
                        { value: "Linux", label: "Linux" },
                        { value: "HarmonyOS", label: "HarmonyOS" },
                        { value: "Chrome OS", label: "Chrome OS" },
                        { value: "Tizen", label: "Tizen" },
                        { value: "WebOS", label: "WebOS" },
                    ]}
                />
            </CharRow>
            <CharRow label="Версия" value={v("osVersion")} onChange={set("osVersion")}>
                <CharInput value={v("osVersion")} onChange={set("osVersion")} />
            </CharRow>

            <CharGroupTitle>Сим-карта</CharGroupTitle>

            <CharRow label="Вид" value={v("simType")} onChange={set("simType")}>
                <CharChips
                    value={v("simType")}
                    onChange={set("simType")}
                    options={[
                        { value: "Mini-SIM", label: "Mini-SIM" },
                        { value: "Micro-SIM", label: "Micro-SIM" },
                        { value: "Nano-SIM", label: "Nano-SIM" },
                        { value: "eSIM", label: "eSIM" },
                    ]}
                />
            </CharRow>
            <CharRow label="Количество" value={v("simCount")} onChange={set("simCount")}>
                <CharChips
                    value={v("simCount")}
                    onChange={set("simCount")}
                    options={[1, 2, 3, 4].map((x) => ({ value: String(x), label: String(x) }))}
                />
            </CharRow>

            <CharGroupTitle>Камера</CharGroupTitle>

            <p className="one-char__minihead">Основная камера</p>

            <CharRow
                label="Количество основных камер"
                value={v("mainCameras")}
                onChange={set("mainCameras")}
            >
                <CharInput
                    value={v("mainCameras")}
                    onChange={set("mainCameras")}
                    unit={[{ value: "pcs", label: "штук" }]}
                />
            </CharRow>
            <CharRow
                label="Количество мегапикселей основной камеры"
                value={v("mainCameraMp")}
                onChange={set("mainCameraMp")}
            >
                <CharInput
                    value={v("mainCameraMp")}
                    onChange={set("mainCameraMp")}
                    unit={[{ value: "mp", label: "Мп" }]}
                />
            </CharRow>
            <CharRow
                label="Угол обзора объектива"
                value={v("cameraAngle")}
                onChange={set("cameraAngle")}
            >
                <CharInput
                    value={v("cameraAngle")}
                    onChange={set("cameraAngle")}
                    unit={[{ value: "deg", label: "°" }]}
                />
            </CharRow>
            <CharRow label="Цифровой зум" value={v("digitalZoom")} onChange={set("digitalZoom")}>
                <CharInput
                    value={v("digitalZoom")}
                    onChange={set("digitalZoom")}
                    unit={[{ value: "x", label: "x" }]}
                />
            </CharRow>

            <p className="one-char__minihead">Фронтальная камера</p>

            <CharRow
                label="Количество мегапикселей фронтальной камеры"
                value={v("frontCameraMp")}
                onChange={set("frontCameraMp")}
            >
                <CharInput
                    value={v("frontCameraMp")}
                    onChange={set("frontCameraMp")}
                    unit={[{ value: "mp", label: "Мп" }]}
                />
            </CharRow>

            <CharGroupTitle>Аудио</CharGroupTitle>

            <CharRow label="Количество динамиков" value={v("speakers")} onChange={set("speakers")}>
                <CharInput
                    value={v("speakers")}
                    onChange={set("speakers")}
                    unit={[{ value: "pcs", label: "штук" }]}
                />
            </CharRow>
            <CharRow label="Мощность" value={v("audioPower")} onChange={set("audioPower")}>
                <CharInput
                    value={v("audioPower")}
                    onChange={set("audioPower")}
                    unit={[{ value: "vt", label: "Вт" }]}
                />
            </CharRow>
            <CharRow
                label="Минимальная воспроизводимая частота"
                value={v("minFrequency")}
                onChange={set("minFrequency")}
            >
                <CharInput
                    value={v("minFrequency")}
                    onChange={set("minFrequency")}
                    unit={[{ value: "hz", label: "Гц" }]}
                />
            </CharRow>
            <CharRow
                label="Максимальная воспроизводимая частота"
                value={v("maxFrequency")}
                onChange={set("maxFrequency")}
            >
                <CharInput
                    value={v("maxFrequency")}
                    onChange={set("maxFrequency")}
                    unit={[{ value: "hz", label: "Гц" }]}
                />
            </CharRow>

            <CharGroupTitle>Разъёмы</CharGroupTitle>

            <CharRow label="Тип порта" value={v("portType")} onChange={set("portType")}>
                <CharChips
                    value={v("portType")}
                    onChange={set("portType")}
                    options={[
                        "USB Type-A", "USB Type-C", "Micro-USB", "HDMI",
                        "Jack 3.5 мм", "Lightning", "DisplayPort", "RJ-45",
                    ].map((x) => ({ value: x, label: x }))}
                />
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom value={v("customSystem")} onChange={set("customSystem")} />
        </>
    );
}

/* =========================================================
   СЕКЦИЯ 3. СВЕДЕНИЯ О ПРОИЗВОДИТЕЛЕ
   ========================================================= */
function SectionManufacturer({ values, onChange }) {
    return (
        <section id="ident-manufacturer" className="one-block">
            <BlockTitle>Сведения о производителе</BlockTitle>

            <FieldRow
                required
                label="Наименование производителя"
                value={values.manufacturerName}
                onChange={(v) => onChange("manufacturerName", v)}
            />
            <FieldRow
                required
                label="Страна производства"
                value={values.country}
                onChange={(v) => onChange("country", v)}
            />
        </section>
    );
}

/* =========================================================
   СЕКЦИЯ 4. ОПИСАНИЕ
   ========================================================= */
function SectionDescription({ values, onChange }) {
    return (
        <section id="ident-description" className="one-block">
            <BlockTitle>Описание конкретной модели</BlockTitle>

            <h3 className="one-subtitle">
                <span className="one-subtitle__help">?</span>
                Порядок работы с продуктом
            </h3>
            <p className="one-subtitle__hint">
                Заполните назначение и принцип действия продукта. При заполнении
                ориентируйтесь на следующие документы: 1. Руководство по эксплуатации.
            </p>

            <FieldRow
                required
                label="Назначение модели"
                value={values.purpose}
                onChange={(v) => onChange("purpose", v)}
            />
            <FieldRow
                required
                label="Принцип действия модели"
                value={values.actionPrinciple}
                onChange={(v) => onChange("actionPrinciple", v)}
            />

            <h3 className="one-subtitle">
                <span className="one-subtitle__help">?</span>
                Условия транспортировки, хранения и эксплуатации
            </h3>
            <p className="one-subtitle__hint">
                Заполните условия транспортировки, хранения, эксплуатации и срок
                эксплуатации. При заполнении ориентируйтесь на следующие документы:
                1. Руководство по эксплуатации.
            </p>

            <SubBlock title="Условия транспортировки">
                <RangeRow
                    label="Температурный режим"
                    unit="°C"
                    from={values.transportTempFrom}
                    to={values.transportTempTo}
                    onChangeFrom={(v) => onChange("transportTempFrom", v)}
                    onChangeTo={(v) => onChange("transportTempTo", v)}
                />
                <RangeRow
                    label="Влажность"
                    unit="%"
                    from={values.transportHumidityFrom}
                    to={values.transportHumidityTo}
                    onChangeFrom={(v) => onChange("transportHumidityFrom", v)}
                    onChangeTo={(v) => onChange("transportHumidityTo", v)}
                />
                <ChoicePair
                    required
                    label="Попадание прямых солнечных лучей"
                    value={values.transportSun}
                    onChange={(v) => onChange("transportSun", v)}
                />
            </SubBlock>

            <SubBlock title="Условия хранения на складе">
                <RangeRow
                    label="Температурный режим"
                    unit="°C"
                    from={values.storageTempFrom}
                    to={values.storageTempTo}
                    onChangeFrom={(v) => onChange("storageTempFrom", v)}
                    onChangeTo={(v) => onChange("storageTempTo", v)}
                />
                <RangeRow
                    label="Влажность"
                    unit="%"
                    from={values.storageHumidityFrom}
                    to={values.storageHumidityTo}
                    onChangeFrom={(v) => onChange("storageHumidityFrom", v)}
                    onChangeTo={(v) => onChange("storageHumidityTo", v)}
                />
                <ChoicePair
                    required
                    label="Попадание прямых солнечных лучей"
                    value={values.storageSun}
                    onChange={(v) => onChange("storageSun", v)}
                />
            </SubBlock>

            <SubBlock title="Условия эксплуатации модели (параметра)">
                <RangeRow
                    label="Температурный режим"
                    unit="°C"
                    from={values.usageTempFrom}
                    to={values.usageTempTo}
                    onChangeFrom={(v) => onChange("usageTempFrom", v)}
                    onChangeTo={(v) => onChange("usageTempTo", v)}
                />
                <RangeRow
                    label="Влажность"
                    unit="%"
                    from={values.usageHumidityFrom}
                    to={values.usageHumidityTo}
                    onChangeFrom={(v) => onChange("usageHumidityFrom", v)}
                    onChangeTo={(v) => onChange("usageHumidityTo", v)}
                />
                <ChoicePair
                    required
                    label="Попадание прямых солнечных лучей"
                    value={values.usageSun}
                    onChange={(v) => onChange("usageSun", v)}
                />
            </SubBlock>

            <h3 className="one-subtitle">
                <span className="one-subtitle__help">?</span>
                Меры безопасности при работе с моделью
            </h3>
            <p className="one-subtitle__hint">
                Заполните меры безопасности при использовании продукта. При
                заполнении ориентируйтесь на следующие документы: 1. Руководство
                по эксплуатации.
            </p>

            <div className="one-field">
                <span className="one-field__req">требует заполнения</span>
                <span className="one-field__help-slot" />
                <span className="one-field__star">✱</span>
                <span className="one-field__label">Класс опасности</span>
                <div className="one-hazard">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <button
                            key={n}
                            type="button"
                            className={`one-hazard__item${values.hazardClass === String(n) ? " one-hazard__item--active" : ""}`}
                            onClick={() => onChange("hazardClass", String(n))}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            <FieldRow
                required
                label="Указание мер безопасности"
                value={values.safetyMeasures}
                onChange={(v) => onChange("safetyMeasures", v)}
            />
            <FieldRow
                required
                label="Утилизация товаров и упаковки"
                value={values.utilization}
                onChange={(v) => onChange("utilization", v)}
            />
        </section>
    );
}

function SubBlock({ title, children }) {
    return (
        <div className="one-subblock">
            <p className="one-subblock__title">{title}</p>
            {children}
        </div>
    );
}

function RangeRow({ label, unit, from, to, onChangeFrom, onChangeTo }) {
    return (
        <div className="one-range">
            <span className="one-range__label">{label}</span>
            <div className="one-range__row">
                <span className="one-field__req">требует заполнения</span>
                <span className="one-field__help-slot" />
                <span className="one-field__star">✱</span>
                <span className="one-range__cap">От</span>
                <input
                    type="text"
                    className="one-range__input"
                    value={from}
                    onChange={(e) => onChangeFrom(e.target.value)}
                />
                <span className="one-range__cap">До</span>
                <input
                    type="text"
                    className="one-range__input"
                    value={to}
                    onChange={(e) => onChangeTo(e.target.value)}
                />
                <span className="one-range__unit">{unit}</span>
            </div>
        </div>
    );
}

/* =========================================================
   Основной компонент
   ========================================================= */
export default function One() {
    const [activeTab, setActiveTab] = useState("identification");

    const baseLineName = "Ноутбук Huawei Two";
    const modelDisplayName = [
        baseLineName,
        "Модель",
        "1 характеристика",
        "2 характеристика",
    ]
        .filter(Boolean)
        .join(" + ");

    const [ident, setIdent] = useState({
        article: "",
        model: "",
        manufacturerName: "",
        country: "",
        purpose: "",
        actionPrinciple: "",
        transportTempFrom: "", transportTempTo: "",
        transportHumidityFrom: "", transportHumidityTo: "",
        transportSun: "",
        storageTempFrom: "", storageTempTo: "",
        storageHumidityFrom: "", storageHumidityTo: "",
        storageSun: "",
        usageTempFrom: "", usageTempTo: "",
        usageHumidityFrom: "", usageHumidityTo: "",
        usageSun: "",
        hazardClass: "",
        safetyMeasures: "",
        utilization: "",
    });

    const [chars, setChars] = useState({});
    const updateChars = (code, patch) =>
        setChars((prev) => ({ ...prev, [code]: patch }));

    const [docs, setDocs] = useState({});

    const [delivery, setDelivery] = useState([
        {
            id: 1,
            active: true,
            name: "1",
            index: "1",
            region: "1",
            city: "1",
            street: "1",
            house: "1",
            office: "1",
            address: "1, 1, 1, г. 1, ул. 1, д. 1, офис 1",
            quantity: "",
        },
    ]);

    const [pricing, setPricing] = useState({
        currency: "RUB",
        price: "",
        discounts: [
            { enabled: true, from: "", to: "", value: "" },
            { enabled: false, from: "", to: "", value: "" },
            { enabled: false, from: "", to: "", value: "" },
        ],
    });
    const updatePricing = (patch) =>
        setPricing((prev) => ({ ...prev, ...patch }));

    const [pack, setPack] = useState({
        packType: "",
        packMaterial: "",
        packMaterialCustom: "",
        isFragile: "",
        weight: "",
        weightUnit: "gram",
        packSizeUnit: "sm",
        packSizes: { length: "", width: "", height: "" },
    });
    const updatePack = (patch) => setPack((prev) => ({ ...prev, ...patch }));

    const [kit, setKit] = useState([
        { id: 1, name: "", qty: "", photo: null },
        { id: 2, name: "", qty: "", photo: null },
        { id: 3, name: "", qty: "", photo: null },
    ]);

    const handleDocPick = (code, event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setDocs((prev) => ({ ...prev, [code]: file }));
    };

    const handleDocRemove = (code) => {
        setDocs((prev) => {
            const next = { ...prev };
            delete next[code];
            return next;
        });
    };

    const updateIdent = (code, value) =>
        setIdent((prev) => ({ ...prev, [code]: value }));

    const sectionsRef = useRef({
        photos: null,
        characteristics: null,
        manufacturer: null,
        description: null,
        packaging: null,
        kit: null,
        price: null,
        loyalty: null,
    });

    const scrollTo = (key) => {
        sectionsRef.current[key]?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    return (
        <div className="container add-page one-page">
            <h1 className="title">Этап 4 - Создание модели (параметра)</h1>

            <h2 className="one-section-title">
                Наименование конкретной модели (параметра)
            </h2>

            <div className="stage4-name-box">
                <button
                    type="button"
                    className="stage4-name-box__help"
                    title="Подсказка по полю «Наименование модели»"
                    aria-label="Подсказка"
                >
                    ?
                </button>
                <span className="stage4-name-box__text">{modelDisplayName}</span>
            </div>

            <div className="one-tabs" role="tablist">
                {TABS.map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            className={`one-tab${active ? " one-tab--active" : ""}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <span className="one-tab__label">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {activeTab === "packaging" && (
                <>
                    <nav className="one-subnav" aria-label="Разделы упаковки">
                        {PACK_SECTIONS.map((s, i) => (
                            <button
                                key={s.key}
                                type="button"
                                className="one-subnav__item"
                                onClick={() => scrollTo(s.key)}
                            >
                                {i + 1}. {s.label}
                            </button>
                        ))}
                    </nav>

                    <div ref={(el) => (sectionsRef.current.packaging = el)}>
                        <SectionPackaging data={pack} onChange={updatePack} />
                    </div>

                    <div ref={(el) => (sectionsRef.current.kit = el)}>
                        <SectionKit items={kit} onChange={setKit} />
                    </div>
                </>
            )}

            {activeTab === "characteristics" && (
                <SectionCharacteristicsFull values={chars} onChange={updateChars} />
            )}

            {activeTab === "delivery" && (
                <SectionDelivery items={delivery} onChange={setDelivery} />
            )}

            {activeTab === "pricing" && (
                <>
                    <nav className="one-subnav" aria-label="Разделы ценообразования">
                        {PRICING_SECTIONS.map((s, i) => (
                            <button
                                key={s.key}
                                type="button"
                                className="one-subnav__item"
                                onClick={() => scrollTo(s.key)}
                            >
                                {i + 1}. {s.label}
                            </button>
                        ))}
                    </nav>

                    <div ref={(el) => (sectionsRef.current.price = el)}>
                        <div id="price" />
                    </div>
                    <div ref={(el) => (sectionsRef.current.loyalty = el)}>
                        <div id="loyalty" />
                    </div>

                    <SectionPricing data={pricing} onChange={updatePricing} />
                </>
            )}

            {activeTab === "documents" && (
                <SectionDocuments
                    docs={docs}
                    onPick={handleDocPick}
                    onRemove={handleDocRemove}
                />
            )}

            {activeTab === "identification" && (
                <>
                    <nav className="one-subnav" aria-label="Разделы идентификации">
                        {IDENT_SECTIONS.map((s, i) => (
                            <button
                                key={s.key}
                                type="button"
                                className="one-subnav__item"
                                onClick={() => scrollTo(s.key)}
                            >
                                {i + 1}. {s.label}
                            </button>
                        ))}
                    </nav>

                    <div ref={(el) => (sectionsRef.current.photos = el)}>
                        <SectionPhotos />
                    </div>

                    <div ref={(el) => (sectionsRef.current.characteristics = el)}>
                        <SectionCharacteristics values={ident} onChange={updateIdent} />
                    </div>

                    <div ref={(el) => (sectionsRef.current.manufacturer = el)}>
                        <SectionManufacturer values={ident} onChange={updateIdent} />
                    </div>

                    <div ref={(el) => (sectionsRef.current.description = el)}>
                        <SectionDescription values={ident} onChange={updateIdent} />
                    </div>
                </>
            )}
        </div>
    );
}