// One.jsx — Этап 4: Создание модели (параметра)
import { useMemo, useRef, useState } from "react";
import "./One.css";
import BottomBar from "../components/BottomBar";
import Select from "react-select";

/* =========================================================
   ВЕРХНИЕ 6 ТАБОВ ЭТАПА
   ========================================================= */
const TABS = [
    { key: "identification", label: "1. Идентификация конкретной модели" },
    { key: "documents", label: "2. Документы конкретной модели" },
    {
        key: "characteristics",
        label: "3. Технические, физические и функциональные характеристики конкретной модели",
    },
    { key: "packaging", label: "4. Упаковка конкретной модели" },
    { key: "pricing", label: "5. Ценообразование конкретной модели" },
    { key: "delivery", label: "6. Доставка конкретной модели" },
];

/* =========================================================
   ПОДРАЗДЕЛЫ
   ========================================================= */
const IDENT_SECTIONS = [
    { key: "characteristics", label: "Сведения о конкретной модели" },
    { key: "photos", label: "Фотографии конкретной модели" },
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

// Российские размеры обуви (от 12 до 54)
const SHOE_SIZES = Array.from({ length: 54 - 12 + 1 }, (_, i) => {
    const val = String(12 + i);
    return { value: val, label: val };
});

// Российские размеры одежды (от 20 до 94, шаг 2)
const CLOTHES_SIZES = Array.from({ length: (94 - 20) / 2 + 1 }, (_, i) => {
    const val = String(20 + i * 2);
    return { value: val, label: val };
});

function SizeSelect({ value, onChange, options, placeholder = "Выберите размер" }) {
    // Находим текущее выбранное значение в массиве опций
    const current = options.find((o) => o.value === value) || null;

    return (
        <Select
            classNamePrefix="one-rs"
            className="one-field__select"
            options={options}
            value={current}
            onChange={(opt) => onChange(opt ? opt.value : "")}
            placeholder={placeholder}
            isSearchable // Позволяет вводить цифры для быстрого поиска
            isClearable
            noOptionsMessage={() => "Ничего не найдено"}
            filterOption={(option, inputValue) => {
                // Можно оставить стандартный поиск, он отлично работает для цифр
                return option.label.includes(inputValue);
            }}
        />
    );
}

/* =========================================================
   Список стран мира (195 государств) на русском языке
   Формат: { value: ISO-код, label: русское название } 
   ========================================================= */
const COUNTRIES_RU = [
    { value: "AU", label: "Австралия" },
    { value: "AT", label: "Австрия" },
    { value: "AZ", label: "Азербайджан" },
    { value: "AL", label: "Албания" },
    { value: "DZ", label: "Алжир" },
    { value: "AO", label: "Ангола" },
    { value: "AD", label: "Андорра" },
    { value: "AG", label: "Антигуа и Барбуда" },
    { value: "AR", label: "Аргентина" },
    { value: "AM", label: "Армения" },
    { value: "AF", label: "Афганистан" },
    { value: "BS", label: "Багамы" },
    { value: "BD", label: "Бангладеш" },
    { value: "BB", label: "Барбадос" },
    { value: "BH", label: "Бахрейн" },
    { value: "BY", label: "Беларусь" },
    { value: "BZ", label: "Белиз" },
    { value: "BE", label: "Бельгия" },
    { value: "BJ", label: "Бенин" },
    { value: "BG", label: "Болгария" },
    { value: "BO", label: "Боливия" },
    { value: "BA", label: "Босния и Герцеговина" },
    { value: "BW", label: "Ботсвана" },
    { value: "BR", label: "Бразилия" },
    { value: "BN", label: "Бруней" },
    { value: "BF", label: "Буркина-Фасо" },
    { value: "BI", label: "Бурунди" },
    { value: "BT", label: "Бутан" },
    { value: "VU", label: "Вануату" },
    { value: "VA", label: "Ватикан" },
    { value: "GB", label: "Великобритания" },
    { value: "HU", label: "Венгрия" },
    { value: "VE", label: "Венесуэла" },
    { value: "TL", label: "Восточный Тимор" },
    { value: "VN", label: "Вьетнам" },
    { value: "GA", label: "Габон" },
    { value: "HT", label: "Гаити" },
    { value: "GY", label: "Гайана" },
    { value: "GM", label: "Гамбия" },
    { value: "GH", label: "Гана" },
    { value: "GT", label: "Гватемала" },
    { value: "GN", label: "Гвинея" },
    { value: "GW", label: "Гвинея-Бисау" },
    { value: "DE", label: "Германия" },
    { value: "HN", label: "Гондурас" },
    { value: "GD", label: "Гренада" },
    { value: "GR", label: "Греция" },
    { value: "GE", label: "Грузия" },
    { value: "DK", label: "Дания" },
    { value: "DJ", label: "Джибути" },
    { value: "DM", label: "Доминика" },
    { value: "DO", label: "Доминиканская Республика" },
    { value: "EG", label: "Египет" },
    { value: "ZM", label: "Замбия" },
    { value: "ZW", label: "Зимбабве" },
    { value: "IL", label: "Израиль" },
    { value: "IN", label: "Индия" },
    { value: "ID", label: "Индонезия" },
    { value: "JO", label: "Иордания" },
    { value: "IQ", label: "Ирак" },
    { value: "IR", label: "Иран" },
    { value: "IE", label: "Ирландия" },
    { value: "IS", label: "Исландия" },
    { value: "ES", label: "Испания" },
    { value: "IT", label: "Италия" },
    { value: "YE", label: "Йемен" },
    { value: "CV", label: "Кабо-Верде" },
    { value: "KZ", label: "Казахстан" },
    { value: "KH", label: "Камбоджа" },
    { value: "CM", label: "Камерун" },
    { value: "CA", label: "Канада" },
    { value: "QA", label: "Катар" },
    { value: "KE", label: "Кения" },
    { value: "CY", label: "Кипр" },
    { value: "KG", label: "Киргизия" },
    { value: "KI", label: "Кирибати" },
    { value: "CN", label: "Китай" },
    { value: "CO", label: "Колумбия" },
    { value: "KM", label: "Коморы" },
    { value: "CG", label: "Конго" },
    { value: "CD", label: "Конго (ДРК)" },
    { value: "KP", label: "КНДР" },
    { value: "KR", label: "Южная Корея" },
    { value: "CR", label: "Коста-Рика" },
    { value: "CI", label: "Кот-д’Ивуар" },
    { value: "CU", label: "Куба" },
    { value: "KW", label: "Кувейт" },
    { value: "LA", label: "Лаос" },
    { value: "LV", label: "Латвия" },
    { value: "LS", label: "Лесото" },
    { value: "LR", label: "Либерия" },
    { value: "LB", label: "Ливан" },
    { value: "LY", label: "Ливия" },
    { value: "LT", label: "Литва" },
    { value: "LI", label: "Лихтенштейн" },
    { value: "LU", label: "Люксембург" },
    { value: "MU", label: "Маврикий" },
    { value: "MR", label: "Мавритания" },
    { value: "MG", label: "Мадагаскар" },
    { value: "MW", label: "Малави" },
    { value: "MY", label: "Малайзия" },
    { value: "MV", label: "Мальдивы" },
    { value: "MT", label: "Мальта" },
    { value: "ML", label: "Мали" },
    { value: "MA", label: "Марокко" },
    { value: "MH", label: "Маршалловы Острова" },
    { value: "MX", label: "Мексика" },
    { value: "MZ", label: "Мозамбик" },
    { value: "MD", label: "Молдавия" },
    { value: "MC", label: "Монако" },
    { value: "MN", label: "Монголия" },
    { value: "MM", label: "Мьянма" },
    { value: "NA", label: "Намибия" },
    { value: "NR", label: "Науру" },
    { value: "NP", label: "Непал" },
    { value: "NE", label: "Нигер" },
    { value: "NG", label: "Нигерия" },
    { value: "NL", label: "Нидерланды" },
    { value: "NI", label: "Никарагуа" },
    { value: "NZ", label: "Новая Зеландия" },
    { value: "NO", label: "Норвегия" },
    { value: "AE", label: "ОАЭ" },
    { value: "OM", label: "Оман" },
    { value: "PK", label: "Пакистан" },
    { value: "PW", label: "Палау" },
    { value: "PS", label: "Палестина" },
    { value: "PA", label: "Панама" },
    { value: "PG", label: "Папуа — Новая Гвинея" },
    { value: "PY", label: "Парагвай" },
    { value: "PE", label: "Перу" },
    { value: "PL", label: "Польша" },
    { value: "PT", label: "Португалия" },
    { value: "RU", label: "Россия" },
    { value: "RW", label: "Руанда" },
    { value: "RO", label: "Румыния" },
    { value: "SV", label: "Сальвадор" },
    { value: "WS", label: "Самоа" },
    { value: "SM", label: "Сан-Марино" },
    { value: "ST", label: "Сан-Томе и Принсипи" },
    { value: "SA", label: "Саудовская Аравия" },
    { value: "SZ", label: "Эсватини" },
    { value: "SC", label: "Сейшелы" },
    { value: "SN", label: "Сенегал" },
    { value: "VC", label: "Сент-Винсент и Гренадины" },
    { value: "KN", label: "Сент-Китс и Невис" },
    { value: "LC", label: "Сент-Люсия" },
    { value: "RS", label: "Сербия" },
    { value: "SG", label: "Сингапур" },
    { value: "SY", label: "Сирия" },
    { value: "SK", label: "Словакия" },
    { value: "SI", label: "Словения" },
    { value: "SB", label: "Соломоновы Острова" },
    { value: "SO", label: "Сомали" },
    { value: "SD", label: "Судан" },
    { value: "SR", label: "Суринам" },
    { value: "US", label: "США" },
    { value: "SL", label: "Сьерра-Леоне" },
    { value: "TJ", label: "Таджикистан" },
    { value: "TH", label: "Таиланд" },
    { value: "TZ", label: "Танзания" },
    { value: "TG", label: "Того" },
    { value: "TO", label: "Тонга" },
    { value: "TT", label: "Тринидад и Тобаго" },
    { value: "TV", label: "Тувалу" },
    { value: "TN", label: "Тунис" },
    { value: "TM", label: "Туркменистан" },
    { value: "TR", label: "Турция" },
    { value: "UG", label: "Уганда" },
    { value: "UZ", label: "Узбекистан" },
    { value: "UA", label: "Украина" },
    { value: "UY", label: "Уругвай" },
    { value: "FM", label: "Микронезия" },
    { value: "FJ", label: "Фиджи" },
    { value: "PH", label: "Филиппины" },
    { value: "FI", label: "Финляндия" },
    { value: "FR", label: "Франция" },
    { value: "HR", label: "Хорватия" },
    { value: "CF", label: "ЦАР" },
    { value: "TD", label: "Чад" },
    { value: "ME", label: "Черногория" },
    { value: "CZ", label: "Чехия" },
    { value: "CL", label: "Чили" },
    { value: "CH", label: "Швейцария" },
    { value: "SE", label: "Швеция" },
    { value: "LK", label: "Шри-Ланка" },
    { value: "EC", label: "Эквадор" },
    { value: "GQ", label: "Экваториальная Гвинея" },
    { value: "ER", label: "Эритрея" },
    { value: "EE", label: "Эстония" },
    { value: "ET", label: "Эфиопия" },
    { value: "ZA", label: "ЮАР" },
    { value: "SS", label: "Южный Судан" },
    { value: "JM", label: "Ямайка" },
    { value: "JP", label: "Япония" },
];

/* =========================================================
   Вспомогательные компоненты 
   ========================================================= */

/* =========================================================
Авторастущая textarea (растёт по мере ввода)
========================================================= */
function AutoTextarea({ value, onChange, placeholder, maxLength, className = "" }) {
    const ref = useRef(null);

    // Автоматически подгоняем высоту под содержимое
    const resize = () => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    };

    // Подгоняем высоту при каждом изменении value
    useMemo(() => {
        // requestAnimationFrame, чтобы дождаться отрисовки
        requestAnimationFrame(resize);
    }, [value]);

    return (
        <textarea
            ref={ref}
            className={`one-field__input one-field__input--auto ${className}`}
            value={value}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={1}
            onChange={(e) => {
                onChange(e.target.value);
                resize();
            }}
        />
    );
}
function BlockTitle({ children }) {
    return <div className="one-block-title">{children}</div>;
}

function FieldRow({ required, label, value, onChange, placeholder = "Значение", hint, maxLength, multiline }) {
    const [showHint, setShowHint] = useState(false);

    return (
        <div className={`one-field${multiline ? " one-field--multiline" : ""}`}>
            <span className="one-field__star">{required ? "✱" : ""}</span>
            <span className={`one-field__req${required ? "" : " one-field__req--hidden"}`}>
                {required ? "требует заполнения" : ""}
            </span>

            <div className="one-tooltip-wrap">
                <button
                    type="button"
                    className="one-field__help"
                    onClick={() => setShowHint(!showHint)}
                    aria-label="Подсказка"
                >
                    ?
                </button>
                {showHint && (
                    <div className="one-tooltip-popup">
                        {hint || "Подсказка"}
                    </div>
                )}
            </div>

            <span className="one-field__label">{label}</span>

            {multiline ? (
                <AutoTextarea
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    maxLength={maxLength}
                />
            ) : (
                <input
                    type="text"
                    className="one-field__input"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={maxLength}
                />
            )}
        </div>
    );
}

/* =========================================================
   Выпадающий список стран с флагами (react-select-country-list)
   ========================================================= */

function CountrySelect({ value, onChange, placeholder = "Выберите страну" }) {
    // Локальное значение поискового ввода
    const [inputValue, setInputValue] = useState("");

    // Сортируем: сначала совпадения с начала строки, потом — из середины
    const filteredOptions = useMemo(() => {
        const q = inputValue.trim().toLowerCase();
        if (!q) return COUNTRIES_RU;

        const starts = [];
        const contains = [];

        for (const c of COUNTRIES_RU) {
            const label = c.label.toLowerCase();
            const code = c.value.toLowerCase();

            if (label.startsWith(q) || code.startsWith(q)) {
                starts.push(c);
            } else if (label.includes(q) || code.includes(q)) {
                contains.push(c);
            }
        }

        return [...starts, ...contains];
    }, [inputValue]);

    // Текущее выбранное значение
    const current =
        COUNTRIES_RU.find((o) => o.value === value || o.label === value) ||
        null;

    return (
        <Select
            classNamePrefix="one-rs"
            className="one-field__select"
            options={filteredOptions}
            value={current}
            onChange={(opt) => onChange(opt ? opt.value : "")}
            inputValue={inputValue}
            onInputChange={(v, meta) => {
                // Обновляем inputValue только когда пользователь печатает.
                // При выборе / очистке / закрытии меню — сбрасываем.
                setInputValue(meta.action === "input-change" ? v : "");
            }}
            placeholder={placeholder}
            isSearchable
            isClearable
            noOptionsMessage={() => "Ничего не найдено"}
            /* Отключаем встроенную фильтрацию — свои правила уже применены */
            filterOption={() => true}
        />
    );
}

function ChoicePair({ required, label, value, onChange, hint }) {
    const options = [
        { value: "no", label: "Не допускается" },
        { value: "yes", label: "Допускается" },
    ];
    return (
        <div className="one-field one-field--pair">
            <span className="one-field__star">{required ? "✱" : ""}</span>
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
            {/* <span className="one-field__star">{required ? "✱" : ""}</span> */}
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


function SubBlock({ title, children }) {
    return (
        <div className="one-subblock">
            <p className="one-subblock__title">{title}</p>
            {children}
        </div>
    );
}

function RangeRow({ label, unit, from, to, onChangeFrom, onChangeTo, maxLength }) {
    return (
        <div className="one-range">
            <span className="one-range__label">{label}</span>
            <div className="one-range__row">
                <span className="one-field__star">✱</span>
                <span className="one-field__req">требует заполнения</span>
                <span className="one-field__help-slot" />
                {/* <span className="one-field__star">✱</span> */}
                <span className="one-range__cap">От</span>
                <input
                    type="text"
                    className="one-range__input"
                    value={from}
                    maxLength={maxLength}
                    onChange={(e) => onChangeFrom(e.target.value)}
                />
                <span className="one-range__cap">До</span>
                <input
                    type="text"
                    className="one-range__input"
                    value={to}
                    maxLength={maxLength}
                    onChange={(e) => onChangeTo(e.target.value)}
                />
                <span className="one-range__unit">{unit}</span>
            </div>
        </div>
    );
}


/* =========================================================
   Блок добавления фотографий
   ========================================================= */
// 
function PhotoSlots({ photos = [], total = 5, onChange }) {
    const inputRef = useRef(null);

    const openPicker = () => {
        inputRef.current?.click();
    };

    const handleFiles = (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length) return;

        const next = [...photos];
        for (const file of files) {
            if (next.length >= total) break;
            next.push({
                id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                name: file.name,
                url: URL.createObjectURL(file),
                file,
            });
        }
        onChange?.(next);
    };

    const removeAt = (index) => {
        const next = photos.slice();
        next.splice(index, 1);
        onChange?.(next);
    };

    // Функция для назначения фото главным (перемещение в начало)
    const setAsMain = (index) => {
        if (index === 0) return;
        const next = [...photos];
        const selectedPhoto = next.splice(index, 1)[0]; // Вырезаем
        next.unshift(selectedPhoto); // Вставляем в начало
        onChange?.(next);
    };

    const bigPhoto = photos[0] || null;
    const smallPhotos = photos.slice(1);
    const smallSlots = total - 1;

    return (
        <div className="one-photo-slots">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleFiles}
            />

            {/* Большое (главное) фото */}
            {bigPhoto ? (
                <div className="one-photo-slots__big one-photo-slots__big--filled">
                    <img
                        src={bigPhoto.url}
                        alt={bigPhoto.name}
                        className="one-photo-slots__preview"
                    />
                    {/* Бейдж "Главное фото" */}
                    <div className="one-photo-slots__main-badge" title="Главное фото">
                        ★
                    </div>
                    <button
                        type="button"
                        className="one-photo-slots__remove"
                        title="Удалить"
                        onClick={() => removeAt(0)}
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    className="one-photo-slots__big"
                    onClick={openPicker}
                    aria-label="Добавить фотографию"
                >
                    <span className="one-photo-slots__plus one-photo-slots__plus--lg">
                        +
                    </span>
                    <span className="one-photo-slots__caption">
                        Добавить фотографию
                    </span>
                </button>
            )}

            {/* Маленькие фото */}
            <div className="one-photo-slots__grid">
                {Array.from({ length: smallSlots }).map((_, i) => {
                    const photo = smallPhotos[i];
                    if (photo) {
                        return (
                            <div
                                key={photo.id}
                                className="one-photo-slots__small one-photo-slots__small--filled"
                            >
                                <img
                                    src={photo.url}
                                    alt={photo.name}
                                    className="one-photo-slots__preview"
                                />

                                {/* Кнопка "Сделать главной" */}
                                <button
                                    type="button"
                                    className="one-photo-slots__set-main"
                                    title="Сделать главной"
                                    onClick={() => setAsMain(i + 1)}
                                >
                                    ★
                                </button>

                                <button
                                    type="button"
                                    className="one-photo-slots__remove"
                                    title="Удалить"
                                    onClick={() => removeAt(i + 1)}
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    }
                    return (
                        <button
                            type="button"
                            key={`empty-${i}`}
                            className="one-photo-slots__small"
                            onClick={openPicker}
                            aria-label={`Добавить фотографию ${i + 2}`}
                        >
                            <span className="one-photo-slots__plus">+</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* =========================================================
   СЕКЦИЯ 2. ДОКУМЕНТЫ
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
                                    
                                        <span className="one-field__req">✱ требует заполнения</span>
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
function SectionPackaging({ data, onChange, photos, onPhotosChange }) {
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
                    <span className="one-field__star">✱</span>
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
                    <span class="one-field__star">✱</span>
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
                    <span class="one-field__star">✱</span>
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
                    <span class="one-field__star">✱</span>
                    <span className="one-pack__req">требует заполнения</span>
                    <span className="one-pack__help">?</span>
                    Вес продукта в упаковке
                </p>
                <div className="one-pack__weight">
                    <CharInput
                        // type="text"
                        className="one-field__input"
                        placeholder="Введите значение"
                        filter="numeric"
                        maxLength={8}
                        value={{ text: data.weight}}
                        onChange={(newVal) => onChange({ weight: newVal.text })}
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
                        {/* <span class="one-field__star">✱</span> */}
                        <span className="one-pack__req">✱ требует заполнения</span>
                        <span className="one-pack__dim-label">
                            {dim === "length" ? "Длина" : dim === "width" ? "Ширина" : "Высота"}
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            className="one-field__input"
                            value={data.packSizes?.[dim] || ""}
                            onChange={(e) => {
        // 1. replace(/\D/g, "") — заменяем всё, что НЕ является цифрой, на пустую строку
        // 2. slice(0, 10) — обрезаем результат до 10 символов
        const cleanValue = e.target.value.replace(/\D/g, "").slice(0, 10);
        
        onChange({
            packSizes: { ...(data.packSizes || {}), [dim]: cleanValue },
        });
    }}
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

                <PhotoSlots
                    photos={photos || []}
                    total={3}
                    onChange={onPhotosChange}
                />
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
                            placeholder={index === 0 ? "*Наименование модели*" : "Наименование"}
                            value={item.name}
                            onChange={(e) => {
                                // Оставляем только буквы (рус/англ), пробелы и дефисы
                                const cleanName = e.target.value.replace(/[^A-Za-zА-Яа-яЁё\s\-]/g, "");
                                updateRow(item.id, { name: cleanName });
                            }}
                        />

                        <span className="one-kit__dash">—</span>

                        <input
                            type="text"
                            inputMode="numeric" // Открывает цифровую клавиатуру на телефонах
                            className="one-kit__qty"
                            placeholder="Количество"
                            value={item.qty}
                            onChange={(e) => {
                                // Оставляем только цифры, обрезаем до 6 символов
                                const cleanQty = e.target.value.replace(/\D/g, "").slice(0, 6);
                                updateRow(item.id, { qty: cleanQty });
                            }}
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
                {/* <p className="one-price__lead err">Укажите стоимость модели</p> */}

                <h3 className="one-price__title">
                    <span className="one-price__help">?</span>
                    Укажите стоимость модели
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
                    <span class="one-field__star">✱</span>
                    <span className="one-pack__req">требует заполнения</span>
                    <span className="one-price__label one-price__label--wide">
                        Введите стоимость модели:
                    </span>
                    <span className="one-price__symbol">
                        {CURRENCY_SYMBOLS[data.currency]}
                    </span>
                    <CharInput
                        filter="numeric"
                        maxLength={10}
                        className="one-price__input"
                        // Передаем объект, так как CharInput ждет value.text
                        value={{ text: data.price }}
                        // Забираем значение из объекта, который возвращает CharInput
                        onChange={(val) => onChange({ price: val.text })}
                    />
                </div>
            </section>

            <section id="price-loyalty" className="one-block">
               

                <h3 className="one-price__title">
                    <span className="one-price__help">?</span>
                    Выберите систему лояльности
                </h3>

                <p className="one-price__subtitle">
                    1.Предоставить скидку от количества продукта
                </p>

                <div className="one-loyalty__list">
                    {data.discounts.map((discount, index) => (
                        <div className="one-loyalty__row" key={index}>
                            {/* <span className="one-field__star">
                                {index === 0 ? "✱" : ""}
                            </span> */}
                           
                            <span className="one-field__req">
                                {index === 0 ? "✱ требует заполнения" : ""}
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
                                inputMode="numeric" // Открывает цифровую клавиатуру на смартфонах
                                className="one-loyalty__input"
                                value={discount.from}
                                disabled={!discount.enabled}
                                onChange={(e) => {
                                    // Оставляем только цифры, ограничиваем 5 символами
                                    const cleanValue = e.target.value.replace(/\D/g, "").slice(0, 5);
                                    updateDiscount(index, { from: cleanValue });
                                }}
                            />

                            <span className="one-loyalty__text">до</span>

                            <input
                                type="text"
                                inputMode="numeric"
                                className="one-loyalty__input"
                                value={discount.to}
                                disabled={!discount.enabled}
                                onChange={(e) => {
                                    const cleanValue = e.target.value.replace(/\D/g, "").slice(0, 5);
                                    updateDiscount(index, { to: cleanValue });
                                }}
                            />

                            <span className="one-loyalty__text">
                                штук, стоимость за единицу продукта составит
                            </span>

                            <span className="one-price__symbol">
                                {CURRENCY_SYMBOLS[data.currency]}
                            </span>

                            <input
                                type="text"
                                inputMode="numeric"
                                className="one-loyalty__input one-loyalty__input--price"
                                value={discount.value}
                                disabled={!discount.enabled}
                                onChange={(e) => {
                                    // Для цены можно разрешить чуть больше символов, например, 10
                                    const cleanValue = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    updateDiscount(index, { value: cleanValue });
                                }}
                            />

                            <span className="one-loyalty__info" title="Подсказка">
                                ⓘ
                            </span>

                            {/* {index === 0 && <span className="one-loyalty__star">✱</span>} */}
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
                                <CharInput
                                    filter="numeric"
                                    maxLength={10}
                                    className="one-delivery__qty-input"
                                    // Передаем объект, который ждет CharInput
                                    value={{ text: item.quantity }}
                                    // Забираем значение из объекта (val)
                                    onChange={(val) => updateItem(item.id, { quantity: val.text })}
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
   СЕКЦИЯ 1. ХАРАКТЕРИСТИКИ (в «Идентификации»)
   ========================================================= */
function SectionCharacteristics({ values, onChange }) {
    return (
        <section id="ident-characteristics" className="one-block">
            <BlockTitle>Сведения о конкретной модели</BlockTitle>


            <FieldRow
                required
                multiline
                label="Наименование модели"
                value={values.model}
                onChange={(v) => onChange("model", v)}
                hint="Наименование модели – это уникальное название продукта, которое отличает один конкретный продукт от другого в одной линейке.  Например: 15, 15 Pro, 15 Pro Max."
                maxLength={75}

            />
            <FieldRow
                multiline
                label="Артикул модели (параметра) от завода-изготовителя"
                value={values.article}
                onChange={(v) => onChange("article", v)}
                // Меняем подсказку:
                hint="Артикул модели - это уникальный код, который завод-изготовитель присваивает конкретной конфигурации продукта для точной идентификации. Если у завода-изготовителя нет артикула, придумайте и введите свой уникальный внутренний код (например, 1234567)."
                // Меняем серый текст в поле:
                placeholder="Введите заводской или придумайте свой артикул"
                maxLength={75}
            />
        </section>
    );
}

/* =========================================================
   СЕКЦИЯ 2. ФОТОГРАФИИ
   ========================================================= */
function SectionPhotos({ photos = [], onPhotosChange }) {
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

            <PhotoSlots
                photos={photos}
                total={slots}
                onChange={onPhotosChange}
            />
        </section>
    );
}


/* =========================================================
   СЕКЦИЯ 6. ХАРАКТЕРИСТИКИ — вспомогательные
   ========================================================= */
// const CHAR_SIDEBAR = [
//     { key: "technical", label: "Технические характеристики" },
//     { key: "physical", label: "Физические характеристики" },
//     { key: "functional", label: "Функциональные характеристики" },
// ];

// One.jsx

const ALL_CHAR_SECTIONS = [
    { key: "technical", label: "Технические характеристики" },
    { key: "tech-warranty", label: "1. Гарантийные обязательства" },
    { key: "tech-technical", label: "2. Технические характеристики" },
    { key: "tech-power", label: "3. Энергопотребление" },
    { key: "tech-display", label: "4. Дисплей" },
    { key: "tech-system", label: "5. Системные компоненты" },
    { key: "physical", label: "Физические характеристики" },
    { key: "physical-dimensions", label: "6. Габаритные размеры и вес" },
    { key: "physical-material", label: "7. Материал и состав" },
    { key: "physical-affiliation", label: "8. Принадлежность" },
    { key: "physical-conditions", label: "9. Условия транспортировки, хранения и эксплуатации" },
    { key: "functional", label: "Функциональные характеристики" },
    { key: "functional-10", label: "10. Эксплуатационные свойства" }, // Было "functional"
];
// const TECH_SECTIONS = [
//     { key: "tech-warranty", label: "Гарантийные обязательства" },
//     { key: "tech-technical", label: "Технические характеристики" },
//     { key: "tech-power", label: "Энергопотребление" },
//     { key: "tech-display", label: "Дисплей" },
//     { key: "tech-system", label: "Системные компоненты" },
// ];

// const PHYSICAL_SECTIONS = [
//     { key: "physical-dimensions", label: "Габаритные размеры и вес" },
//     { key: "physical-material", label: "Материал и состав" },
//     { key: "physical-affiliation", label: "Принадлежность" },
//     { key: "physical-conditions", label: "Условия транспортировки, хранения и эксплуатации"},
// ];

// const FUNCTIONAL_SECTIONS = [
//     { key: "functional", label: "Функциональные" },
// ];

function CharRow({ required, label, value, onChange, children, multiline, maxLength, hint }) {
    const [showHint, setShowHint] = useState(false);

    return (
        <div className={`one-char__row${required ? " one-char__row--required" : ""}`}>
            <span className="one-char__req-wrap">
                <span className="one-char__star">{required ? "✱" : ""}</span>
                <span className="one-char__req">
                    {required ? "требует заполнения" : ""}
                </span>
            </span>
            <label className="one-char__check" title="Отобразить в наименовании модели">
                <input
                    type="checkbox"
                    checked={Boolean(value?.inName)}
                    onChange={(e) => onChange({ ...value, inName: e.target.checked })}
                    maxLength={maxLength}
                />
            </label>

            <div className="one-tooltip-wrap">
                <span
                    className="one-char__info"
                    onClick={() => setShowHint(!showHint)}
                    style={{ cursor: "pointer" }}
                >
                    ⓘ
                </span>
                {showHint && (
                    <div className="one-tooltip-popup">
                        {hint || "Отметьте галочкой, если хотите вывести эту характеристику в наименование модели."}
                    </div>
                )}
            </div>

            <span className="one-char__label">{label}</span>
            <div className="one-char__control">{children}</div>
        </div>
    );
}

function CharInput({
    value,
    onChange,
    placeholder = "Значение",
    unit,
    maxLength,
    filter = "any",   // "any" | "text" | "numeric"
}) {
    // Функция фильтрации ввода
    const applyFilter = (raw) => {
        let result = raw;

        if (filter === "text") {
            // Только буквы (кириллица, латиница) и пробел/дефис
            result = result.replace(/[^A-Za-zА-Яа-яЁё\s\-]/g, "");
        } else if (filter === "numeric") {
            // Только цифры
            result = result.replace(/\D/g, "");
        }

        // Обрезаем по максимальной длине
        if (maxLength && result.length > maxLength) {
            result = result.slice(0, maxLength);
        }

        return result;
    };

    return (
        <div className="one-char__input-wrap">
            <input
                type="text"
                inputMode={filter === "numeric" ? "numeric" : "text"}
                className="one-char__input"
                placeholder={placeholder}
                value={value?.text || ""}
                onChange={(e) => {
                    const clean = applyFilter(e.target.value);
                    onChange({ ...value, text: clean });
                }}
            />
            {unit?.length > 0 && (
                unit.length === 1 ? (
                    <span className="one-char__unit-text">
                        {unit[0].label}
                    </span>
                ) : (

                
                <select
                    className="one-char__unit"
                    value={value?.unit || unit[0].value}
                    onChange={(e) => onChange({ ...value, unit: e.target.value })}
                >
                    {unit.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                </select>
                    )
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

function CharCustom({ value, onChange, maxLength }) {
    return (
        <div className="one-char__custom">
            <span className="one-char__info" title="Подсказка">ⓘ</span>
            <input
                type="text"
                className="one-char__custom-name"
                placeholder="Наименование характеристики"
                value={value?.name || ""}
                maxLength={30}
                onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
            <input
                type="text"
                className="one-char__custom-value"
                placeholder="Значение"
                maxLength={30}
                value={value?.text || ""}
                onChange={(e) => onChange({ ...value, text: e.target.value })}
            />
            <div className="one-char__custom-unit-wrap">
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
                    {/* Добавили опцию "Иное" */}
                    <option value="other">Иное...</option>
                </select>

                {/* Показываем инпут, если выбрано "Иное" */}
                {value?.unit === "other" && (
                    <input
                        type="text"
                        className="one-char__custom-unit-input"
                        placeholder="Введите значение"
                        maxLength={15}
                        value={value?.customUnitText || ""}
                        onChange={(e) =>
                            onChange({ ...value, customUnitText: e.target.value })
                        }
                    />
                )}
            </div>
        </div>
    );
}

/* =========================================================
   СЕКЦИЯ 6. ХАРАКТЕРИСТИКИ — полный вид
   ========================================================= */
// One.jsx

function SectionCharacteristicsFull({ values, onChange }) {
    const scrollTo = (id) => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <section className="one-block one-char">
            {/* 1. Навигация слева (отдельный flex-элемент) */}
            <nav className="one-subnav-boxx" aria-label="Разделы характеристик">
                <div className="one-subnav-box__list">
                    {ALL_CHAR_SECTIONS.map((s, i) => (
                        <button
                            key={`${s.key}-${i}`}
                            type="button"
                            className="one-subnav-box__item"
                            onClick={() => scrollTo(s.key)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* 2. Оборачиваем весь основной контент в один div */}
            <div className="one-char__main">
                <h2 className="one-block-title">
                    Технические, физические и функциональные характеристики модели
                </h2>

                <p className="one-char__hint">
                    Заполните характеристики, которые будут соответствовать модели (параметру).
                    <br />
                    Отметьте галочкой характеристики, которые будут отображаться
                    в наименовании модели (параметра).
                </p>

                <div className="one-char__content">
                    <section id="technical" className="one-char__group">
                        <h3 className="one-char__group-heading">
                            Технические характеристики
                        </h3>
                        <TechCharacteristics values={values} onChange={onChange} />
                    </section>

                    <section id="physical" className="one-char__group">
                        <h3 className="one-char__group-heading">
                            Физические характеристики
                        </h3>
                        <PhysicalCharacteristics values={values} onChange={onChange} />
                    </section>

                    <section id="functional" className="one-char__group">
                        <h3 className="one-char__group-heading">
                            Функциональные характеристики
                        </h3>
                        <FunctionalCharacteristics values={values} onChange={onChange} />
                    </section>
                </div>
            </div> {/* <--- Закрывающий тег one-char__main */}
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
            <h3 id="tech-warranty" className="one-char__section-title">
                Гарантийные обязательства
            </h3>

            <CharRow
                required
                label="Гарантия производителя"
                value={v("warrantyPeriod")}
                onChange={set("warrantyPeriod")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("warrantyPeriod")}
                    onChange={set("warrantyPeriod")}
                    filter="numeric"
                    maxLength={3}
                    unit={[
                        { value: "days", label: "дней" },
                        { value: "months", label: "месяцев" },
                        { value: "years", label: "лет" },
                    ]}
                />
        
            </CharRow>

            <CharRow
                required
                label="Срок эксплуатации"
                value={v("serviceLife")}
                onChange={set("serviceLife")}
            >
                <CharInput
                   
                    placeholder="Введите число"
                    value={v("operationPeriod")}
                    onChange={set("operationPeriod")}
                    filter="numeric"
                    maxLength={3}
                    unit={[
                        { value: "days", label: "дней" },
                        { value: "months", label: "месяцев" },
                        { value: "years", label: "лет" },
                    ]}
                />
            </CharRow>

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

            <CharRow
                label="Тип охлаждения"
                value={v("coolingType")}
                onChange={set("coolingType")}
            >
                <AutoTextarea
                    value={v("coolingType").text || ""}
                    onChange={(text) => onChange("coolingType", { ...v("coolingType"), text })}
                    placeholder="Введите значение"
                    maxLength={50}
                    className="one-char__auto" // добавляем класс для стилизации под ширину
                />
            </CharRow>

            <CharGroupTitle>Двигатель</CharGroupTitle>

            <CharRow 
                label="Количество цилиндров" 
                value={v("cylinders")} 
                onChange={set("cylinders")}
                >
                <CharInput
                    placeholder="Введите число"
                    value={v("cylinders")}
                    onChange={set("cylinders")}
                    filter="numeric"
                    maxLength={3}
                    unit={[{ value: "штук", label: "штук" }]}
                />
            </CharRow>

            {/* <CharRow
                required
                label="Срок эксплуатации"
                value={v("serviceLife")}
                onChange={set("serviceLife")}
            >
                <CharInput

                    placeholder="Введите число"
                    value={v("operationPeriod")}
                    onChange={set("operationPeriod")}
                    filter="numeric"
                    maxLength={3}
                    unit={[
                        { value: "days", label: "дней" },
                        { value: "months", label: "месяцев" },
                        { value: "years", label: "лет" },
                    ]}
                />
            </CharRow> */}
            {/* <CharRow
                label="Количество тактов двигателя"
                value={v("engineStrokes")}
                onChange={set("engineStrokes")}
            >
                <CharInput
                    value={v("engineStrokes")}
                    onChange={set("engineStrokes")}
                    unit={[{ value: "такт", label: "такта" }]}
                />
            </CharRow> */}
            <CharRow
                label="Количество тактов двигателя"
                value={v("engineStrokes")}
                onChange={set("engineStrokes")}
            >
                <CharChips
                    value={v("engineStrokes")}
                    onChange={set("engineStrokes")}
                    options={[
                        { value: "two", label: "Два такта" },
                        { value: "four", label: "Четыре такта" },
                    ]}
                />
            </CharRow>
            <CharRow
                label="Скорость вращения двигателя"
                value={v("engineSpeed")}
                onChange={set("engineSpeed")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("engineSpeed")}
                    onChange={set("engineSpeed")}
                    filter="numeric"
                    maxLength={5}
                    unit={[{ value: "rpm", label: "оборотов в минуту" }]}
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
            
            {/* <CharRow label="Вид топлива" value={v("fuelType")} onChange={set("fuelType")}>
                <CharInput value={v("fuelType")} onChange={set("fuelType")} />
            </CharRow> */}

            <CharRow
                label="Вид топлива"
                value={v("fuelType")}
                onChange={set("fuelType")}
            >
                <AutoTextarea
                    value={v("fuelType").text || ""}
                    onChange={(text) => onChange("fuelType", { ...v("fuelType"), text })}
                    placeholder="Введите значение"
                    maxLength={50}
                    className="one-char__auto"
                />
            </CharRow>

            <CharRow
                label="Объём топливного бака"
                value={v("fuelTankVolume")}
                onChange={set("fuelTankVolume")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("fuelTankVolume")}
                    onChange={set("fuelTankVolume")}
                    filter="numeric"
                    maxLength={3}
                    unit={[
                        { value: "l", label: "Литров" },
                        { value: "ml", label: "Миллилитров" },
                    ]}
                />
            </CharRow>

            <CharRow
                label="Расход топлива"
                value={v("fuelConsumption")}
                onChange={set("fuelConsumption")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("fuelConsumption")}
                    onChange={set("fuelConsumption")}
                    filter="numeric"
                    maxLength={3}
                    unit={[{ value: "l_h", label: "литров в час (л/ч)" }]}
                />
            </CharRow>

            <CharGroupTitle>Уровень шума</CharGroupTitle>

            <CharRow
                label="Уровень шума" 
                value={v("noiseLevel")} 
                onChange={set("noiseLevel")}
                >
                <CharInput
                    placeholder="Введите число"
                    value={v("noiseLevel")}
                    onChange={set("noiseLevel")}
                    filter="numeric"
                    maxLength={3}
                    unit={[{ value: "db", label: "децибел (дБ)" }]}
                />
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom value={v("customTechnical")} onChange={set("customTechnical")} />

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
                    placeholder="Введите число"
                    value={v("powerConsumption")}
                    onChange={set("powerConsumption")}
                    filter="numeric"
                    maxLength={4}
                    unit={[{ value: "vt", label: "Вт" }]}
                />
            </CharRow>
            <CharRow
                label="Время непрерывной работы"
                value={v("workingTime")}
                onChange={set("workingTime")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("workingTime")}
                    onChange={set("workingTime")}
                    filter="numeric"
                    maxLength={3}
                    unit={[
                        { value: "min", label: "Минут" },
                        { value: "hour", label: "Часа" },
                    ]}
                />
            </CharRow>
            <CharRow label="Тип вилки" value={v("plugType")} onChange={set("plugType")}>
                <div className="one-char__stack">
                    <CharChips
                        value={v("plugType")}
                        onChange={set("plugType")}
                        options={[
                            { value: "A", label: "A" },
                            { value: "B", label: "B" },
                            { value: "C", label: "C" },
                            { value: "D", label: "D" },
                            { value: "E", label: "E" },
                            { value: "F", label: "F"},
                            { value: "G", label: "G" },
                            { value: "H", label: "H" },
                            { value: "I", label: "I" },
                            { value: "J", label: "J" },
                            { value: "K", label: "K" },
                            { value: "L", label: "L" },
                            { value: "M", label: "M" },
                            
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
                    placeholder="Введите число"
                    value={v("frequency")}
                    onChange={set("frequency")}
                    filter="numeric"
                    maxLength={3}
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
                    placeholder="Введите значение"
                    value={v("batteryCapacity")}
                    onChange={set("batteryCapacity")}
                    filter="numeric"
                    maxLength={6}
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
                        maxLength={20}
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
                    placeholder="Введите число"
                    value={v("nominalPower")}
                    onChange={set("nominalPower")}
                    filter="numeric"
                    maxLength={10}
                    unit={[{ value: "vt", label: "Вт" }]}
                />
            </CharRow>
            <CharRow label="Максимальная" value={v("maxPower")} onChange={set("maxPower")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("maxPower")}
                    onChange={set("maxPower")}
                    filter="numeric"
                    maxLength={10}
                    unit={[{ value: "vt", label: "Вт" }]}
                />
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom value={v("customPower")} onChange={set("customPower")} />

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
                    placeholder="Введите число"
                    value={v("diagonal")}
                    onChange={set("diagonal")}
                    filter="numeric"
                    maxLength={5}
                    unit={[
                        { value: "inch", label: "Дюймов" },
                        { value: "sm", label: "Сантиметров" },
                    ]}
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
                    placeholder="Введите значение"
                    value={v("refreshRate")}
                    onChange={set("refreshRate")}
                    filter="numeric"
                    maxLength={5}
                    unit={[{ value: "hz", label: "Гц" }]}
                />
            </CharRow>
            <CharRow label="Яркость" value={v("brightness")} onChange={set("brightness")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("brightness")}
                    onChange={set("brightness")}
                    filter="numeric"
                    maxLength={5}
                    unit={[{ value: "nit", label: "Нит" }]}
                />
            </CharRow>
            <CharRow label="Разрешение" value={v("resolution")} onChange={set("resolution")}>
                <div className="one-char__stack">
                    <p> Ширина экрана по горизонтали:
                    <CharInput
                        placeholder="Введите число"
                        filter="numeric"
                        maxLength={4}
                        value={v("resolution1")}
                        onChange={set("resolution1")}
                        unit={[{ value: "px", label: "Пикселей" }]}
                    />
                    </p>
                    <p> Ширина экрана по вертикали:
                        <CharInput
                            placeholder="Введите число"
                            filter="numeric"
                            maxLength={4}
                            value={v("resolution2")}
                            onChange={set("resolution2")}
                            unit={[{ value: "px", label: "Пикселей" }]}
                        />
                    </p>
                    <CharChips
                        value={v("resolution")}
                        onChange={set("resolution")}
                        options={[
                            "1280×720 Пикс.", "1366×768 Пикс.", "1600×900 Пикс.", "1920×1080 Пикс.",
                            "2560×1440 Пикс.", "2560×1600 Пикс.", "3840×2160 Пикс.", "3440×1440 Пикс.",
                        ].map((x) => ({ value: x, label: x }))}
                    />
                </div>
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom value={v("customDisplay")} onChange={set("customDisplay")} />

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
                        maxLength={30}
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
                    placeholder="Введите число"
                    value={v("ram")}
                    onChange={set("ram")}
                    filter="numeric"
                    maxLength={4}
                    unit={[{ value: "gb", label: "ГБ" }]}
                />
            </CharRow>
            <CharRow label="Встроенная память" value={v("storage")} onChange={set("storage")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("storage")}
                    onChange={set("storage")}
                    filter="numeric"
                    maxLength={4}
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
            {/* <CharRow 
                label="Версия операционной системы" 
                value={v("osVersion")} 
                onChange={set("osVersion")}
            >
                <CharInput 
                    value={v("osVersion")} 
                    onChange={set("osVersion")} 
                    maxlength={50}
                />
            </CharRow> */}

            <CharRow
                label="Версия"
                value={v("osVersion")}
                onChange={set("osVersion")}
            >
                <AutoTextarea
                    value={v("osVersion").text || ""}
                    onChange={(text) => onChange("osVersion", { ...v("osVersion"), text })}
                    placeholder="Введите значение"
                    maxLength={50}
                    className="one-char__auto"
                />
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
                    placeholder="Введите число"
                    value={v("mainCameras")}
                    onChange={set("mainCameras")}
                    filter="numeric"
                    maxLength={2}
                    unit={[{ value: "pcs", label: "штук" }]}
                />
            </CharRow>
            <CharRow
                label="Количество мегапикселей основной камеры"
                value={v("mainCameraMp")}
                onChange={set("mainCameraMp")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("mainCameraMp")}
                    onChange={set("mainCameraMp")}
                    filter="numeric"
                    maxLength={3}
                    unit={[{ value: "mp", label: "Мп" }]}
                />
            </CharRow>
            <CharRow
                label="Угол обзора объектива"
                value={v("cameraAngle")}
                onChange={set("cameraAngle")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("cameraAngle")}
                    onChange={set("cameraAngle")}
                    filter="numeric"
                    maxLength={3}
                    unit={[{ value: "deg", label: "°" }]}
                />
            </CharRow>
            <CharRow label="Цифровой зум" value={v("digitalZoom")} onChange={set("digitalZoom")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("digitalZoom")}
                    onChange={set("digitalZoom")}
                    filter="numeric"
                    maxLength={3}
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
                    placeholder="Введите число"
                    value={v("frontCameraMp")}
                    onChange={set("frontCameraMp")}
                    filter="numeric"
                    maxLength={3}
                    unit={[{ value: "mp", label: "Мп" }]}
                />
            </CharRow>

            <CharGroupTitle>Аудио</CharGroupTitle>

            <CharRow label="Количество динамиков" value={v("speakers")} onChange={set("speakers")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("speakers")}
                    onChange={set("speakers")}
                    filter="numeric"
                    maxLength={2}
                    unit={[{ value: "pcs", label: "штук" }]}
                />
            </CharRow>
            <CharRow label="Мощность" value={v("audioPower")} onChange={set("audioPower")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("audioPower")}
                    onChange={set("audioPower")}
                    filter="numeric"
                    maxLength="3"
                    unit={[{ value: "vt", label: "Вт" }]}
                />
            </CharRow>
            <CharRow
                label="Минимальная воспроизводимая частота"
                value={v("minFrequency")}
                onChange={set("minFrequency")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("minFrequency")}
                    onChange={set("minFrequency")}
                    filter="numeric"
                    maxLength={4}
                    unit={[{ value: "hz", label: "Гц" }]}
                />
            </CharRow>
            <CharRow
                label="Максимальная воспроизводимая частота"
                value={v("maxFrequency")}
                onChange={set("maxFrequency")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("maxFrequency")}
                    onChange={set("maxFrequency")}
                    filter="numeric"
                    maxLength={4}
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
   ФИЗИЧЕСКИЕ ХАРАКТЕРИСТИКИ
   ========================================================= */
function PhysicalCharacteristics({ values, onChange }) {
    const v = (code) => values[code] || {};
    const set = (code) => (patch) => onChange(code, patch);

    return (
        <>
            <h3 id="physical-dimensions" className="one-char__section-title">
                Габаритные размеры и вес
            </h3>

            <CharRow required label="Длина" value={v("length")} onChange={set("length")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("length")}
                    onChange={set("length")}
                    filter="numeric"
                    maxLength={8}
                    unit={[
                        { value: "mm", label: "Миллиметры" },
                        { value: "cm", label: "Сантиметры" },
                    ]}
                />
            </CharRow>

            <CharRow required label="Ширина" value={v("width")} onChange={set("width")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("width")}
                    onChange={set("width")}
                    filter="numeric"
                    maxLength={8}
                    unit={[
                        { value: "mm", label: "Миллиметры" },
                        { value: "cm", label: "Сантиметры" },
                    ]}
                />
            </CharRow>

            <CharRow required label="Высота" value={v("height")} onChange={set("height")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("height")}
                    onChange={set("height")}
                    filter="numeric"
                    maxLength={8}
                    unit={[
                        { value: "mm", label: "Миллиметры" },
                        { value: "cm", label: "Сантиметры" },
                    ]}
                />
            </CharRow>

            <CharRow
                required
                label="Вес модели без упаковки"
                value={v("weight")}
                onChange={set("weight")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("weight")}
                    onChange={set("weight")}
                    filter="numeric"
                    maxLength={8}
                    unit={[
                        { value: "g", label: "Грамм" },
                        { value: "kg", label: "Килограмм" },
                    ]}
                />
            </CharRow>

            <CharRow
                required
                label="Погрешность веса"
                value={v("weightTolerance")}
                onChange={set("weightTolerance")}
            >
                <CharInput
                    placeholder="Введите число"
                    value={v("weightTolerance")}
                    onChange={set("weightTolerance")}
                    filter="numeric"
                    maxLength={6}
                    unit={[
                        { value: "g", label: "Грамм" },
                        { value: "kg", label: "Килограмм" },
                    ]}
                />
            </CharRow>

            <CharRow label="Диаметр" value={v("diameter")} onChange={set("diameter")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("diameter")}
                    onChange={set("diameter")}
                    filter="numeric"
                    maxLength={8}
                    unit={[
                        { value: "mm", label: "Миллиметры" },
                        { value: "cm", label: "Сантиметры" },
                    ]}
                />
            </CharRow>

            <CharRow label="Объём" value={v("volume")} onChange={set("volume")}>
                <CharInput
                    placeholder="Введите число"
                    value={v("volume")}
                    onChange={set("volume")}
                    filter="numeric"
                    maxLength={8}
                    unit={[
                        { value: "ml", label: "Миллилитры" },
                        { value: "l", label: "Литры" },
                        { value: "cm3", label: "Сантиметры³" },
                    ]}
                />
            </CharRow>

            <h3 id="physical-material" className="one-char__section-title">
                Материал и состав
            </h3>

            <CharRow
                label="Состав (материал) продукта"
                value={v("materialPercent2")}
                onChange={set("materialPercent")}
            >
                <div className="one-char__input-wrap">
                    <input
                        type="text"
                        className="one-char__input"
                        placeholder="Наименование материала"
                        maxLength={25}
                        value={v("materialPercent1").text || ""}
                        onChange={(e) =>
                            onChange("materialPercent1", {
                                ...v("materialPercent1"),
                                text: e.target.value,
                            })
                        }
                    />
                    <p>-</p>
                    <CharInput
                        // placeholder="Введите значение"
                        // className="one-char__input"
                        placeholder="Введите количество в составе в процентном соотношении"
                        value={v("materialPercent2")}
                        filter="numeric"
                        maxLength={3}
                        onChange={set("materialPercent2")}
                    />
                    <span className="one-char__unit-label">%</span>
                </div>
            </CharRow>

            <CharRow label="Корпус" value={v("hasCase")} onChange={set("hasCase")}>
                <CharChips
                    value={v("hasCase")}
                    onChange={set("hasCase")}
                    options={[
                        { value: "yes", label: "Есть" },
                        { value: "no", label: "Нет" },
                    ]}
                />
            </CharRow>

            {/* <CharRow
                label="Материал корпуса"
                value={v("caseMaterial")}
                onChange={set("caseMaterial")}
            >
                <CharInput
                    value={v("caseMaterial")}
                    onChange={set("caseMaterial")}
                />
            </CharRow> */}

            <FieldRow
                multiline
                label="Материал корпуса"
                value={v("caseMaterial").text || ""}
                onChange={(text) => onChange("caseMaterial", { ...v("caseMaterial"), text })}
                maxLength={30}
            />

            <CharRow
                label="Влагозащитный корпус"
                value={v("waterproofCase")}
                onChange={set("waterproofCase")}
            >
                <CharChips
                    value={v("waterproofCase")}
                    onChange={set("waterproofCase")}
                    options={[
                        { value: "yes", label: "Да" },
                        { value: "no", label: "Нет" },
                    ]}
                />
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom
                value={v("customMaterial")}
                onChange={set("customMaterial")}
            />

            <h3 id="physical-affiliation" className="one-char__section-title">
                Принадлежность
            </h3>

            <CharRow label="Пол" value={v("gender")} onChange={set("gender")}>
                <CharChips
                    value={v("gender")}
                    onChange={set("gender")}
                    options={[
                        { value: "female", label: "Женский" },
                        { value: "male", label: "Мужской" },
                        { value: "girls", label: "Девочки" },
                        { value: "boys", label: "Мальчики" },
                        { value: "unisex", label: "Унисекс" },
                    ]}
                />
            </CharRow>

            <CharRow label="Возраст" value={v("ageGroup")} onChange={set("ageGroup")}>
                <CharChips
                    value={v("ageGroup")}
                    onChange={set("ageGroup")}
                    options={[
                        { value: "0-12", label: "Дети 0–12 лет" },
                        { value: "13-18", label: "Подростки 13–18 лет" },
                        { value: "19-59", label: "Взрослые 19–59 лет" },
                        { value: "60+", label: "Пожилые 60+ лет" },
                    ]}
                />
            </CharRow>

            <CharRow
                label="Возрастное ограничение"
                value={v("ageLimit")}
                onChange={set("ageLimit")}
            >
                <CharChips
                    value={v("ageLimit")}
                    onChange={set("ageLimit")}
                    options={[
                        { value: "0+", label: "0+" },
                        { value: "6+", label: "6+" },
                        { value: "12+", label: "12+" },
                        { value: "16+", label: "16+" },
                        { value: "18+", label: "18+" },
                    ]}
                />
            </CharRow>

            <CharGroupTitle>Размерная сетка</CharGroupTitle>

            {/* <CharRow
                label="Российский размер обуви"
                value={v("shoeSize")}
                onChange={set("shoeSize")}
            >
                <div className="one-char__input-wrap">
                    <input
                        type="text"
                        className="one-char__input"
                        placeholder="Значение"
                        value={v("shoeSize").text || ""}
                        onChange={(e) =>
                            onChange("shoeSize", {
                                ...v("shoeSize"),
                                text: e.target.value,
                            })
                        }
                    />
                    <span className="one-char__unit-label">12–54</span>
                </div>
            </CharRow> */}
            <CharRow
                label="Российский размер обуви"
                value={v("shoeSize")}
                onChange={set("shoeSize")}
            >
                <SizeSelect
                    options={SHOE_SIZES}
                    value={v("shoeSize").text || ""}
                    onChange={(val) => onChange("shoeSize", { ...v("shoeSize"), text: val })}
                    placeholder="Значение от 12 до 54"
                />
            </CharRow>

            <CharRow
                label="Российский размер одежды"
                value={v("clothesSize")}
                onChange={set("clothesSize")}
            >
                <SizeSelect
                    options={CLOTHES_SIZES}
                    value={v("clothesSize").text || ""}
                    onChange={(val) => onChange("clothesSize", { ...v("clothesSize"), text: val })}
                    placeholder="Значение от 20 до 94"
                />
            </CharRow>
            {/* <FieldRow
                multiline
                label="Российский размер обуви (значение от 12 до 54)"
                value={v("shoeSize").text || ""}
                onChange={(text) => onChange("shoeSize", { ...v("shoeSize"), text })}
                maxLength={2}
            />

            <FieldRow
                multiline
                label="Российский размер одежды (значение от 20 до 94)"
                value={v("clothesSize").text || ""}
                onChange={(text) => onChange("clothesSize", { ...v("clothesSize"), text })}
                maxLength={2}
                filter="numeric"
            /> */}
            <CharRow
                label="Российский размер одежды"
                value={v("ageLimit")}
                onChange={set("ageLimit")}
            >
                <CharChips
                    value={v("ageLimit")}
                    onChange={set("ageLimit")}
                    options={[
                        { value: "XXS", label: "XXS (38)" },
                        { value: "XS", label: "XS (40)" },
                        { value: "S", label: "S (42)" },
                        { value: "M", label: "M (44-46)" },
                        { value: "L", label: "L (48-50)" },
                        { value: "XL", label: "XL (52)" },
                        { value: "XXL", label: "XXL (54-56)" },
                    ]}
                />
            </CharRow>

            

            {/* <CharRow
                label="Российский размер одежды"
                value={v("clothesSize")}
                onChange={set("clothesSize")}
            >
                <div className="one-char__input-wrap">
                    <input
                        type="text"
                        className="one-char__input"
                        placeholder="Значение"
                        value={v("clothesSize").text || ""}
                        onChange={(e) =>
                            onChange("clothesSize", {
                                ...v("clothesSize"),
                                text: e.target.value,
                            })
                        }
                    />
                    <span className="one-char__unit-label">20–94</span>
                </div>
            </CharRow> */}

            <CharGroupTitle>Сезон</CharGroupTitle>

            <CharRow label="Сезон" value={v("season")} onChange={set("season")}>
                <CharChips
                    value={v("season")}
                    onChange={set("season")}
                    options={[
                        { value: "summer", label: "Лето" },
                        { value: "autumn", label: "Осень" },
                        { value: "winter", label: "Зима" },
                        { value: "spring", label: "Весна" },
                    ]}
                />
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom
                value={v("customAffiliation")}
                onChange={set("customAffiliation")}
            />

            {/* --- Условия транспортировки, хранения и эксплуатации --- */}
            <h3 id="physical-conditions" className="one-char__section-title">
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
                    maxLength={3}
                    from={v("transportTempFrom").text || ""}
                    to={v("transportTempTo").text || ""}
                    onChangeFrom={(text) => {
                        // Оставляем только цифры, минус, точку и запятую (для температур)
                        const clean = text.replace(/[^\d.,-]/g, "");
                        onChange("transportTempFrom", { ...v("transportTempFrom"), text: clean });
                    }}
                    onChangeTo={(text) => {
                        const clean = text.replace(/[^\d.,-]/g, "");
                        onChange("transportTempTo", { ...v("transportTempTo"), text: clean });
                    }}
                />
                <RangeRow
                    label="Влажность"
                    unit="%"
                    maxLength={3}
                    from={v("transportHumidityFrom").text || ""}
                    to={v("transportHumidityTo").text || ""}
                    onChangeFrom={(text) => {
                        // Оставляем только цифры (для влажности минус не нужен)
                        const clean = text.replace(/\D/g, "");
                        onChange("transportHumidityFrom", { ...v("transportHumidityFrom"), text: clean });
                    }}
                    onChangeTo={(text) => {
                        const clean = text.replace(/\D/g, "");
                        onChange("transportHumidityTo", { ...v("transportHumidityTo"), text: clean });
                    }}
                />
                <ChoicePair
                    required
                    label="Попадание прямых солнечных лучей"
                    value={v("transportSun").text || ""}
                    onChange={(value) =>
                        onChange("transportSun", { ...v("transportSun"), text: value })
                    }
                />
            </SubBlock>

            <SubBlock title="Условия хранения на складе">
                <RangeRow
                    label="Температурный режим"
                    unit="°C"
                    maxLength={3}
                    from={v("storageTempFrom").text || ""}
                    to={v("storageTempTo").text || ""}
                    onChangeFrom={(text) =>
                        onChange("storageTempFrom", { ...v("storageTempFrom"), text })
                    }
                    onChangeTo={(text) =>
                        onChange("storageTempTo", { ...v("storageTempTo"), text })
                    }
                />
                <RangeRow
                    label="Влажность"
                    unit="%"
                    maxLength={3}
                    from={v("storageHumidityFrom").text || ""}
                    to={v("storageHumidityTo").text || ""}
                    onChangeFrom={(text) =>
                        onChange("storageHumidityFrom", { ...v("storageHumidityFrom"), text })
                    }
                    onChangeTo={(text) =>
                        onChange("storageHumidityTo", { ...v("storageHumidityTo"), text })
                    }
                />
                <ChoicePair
                    required
                    label="Попадание прямых солнечных лучей"
                    value={v("storageSun").text || ""}
                    onChange={(value) =>
                        onChange("storageSun", { ...v("storageSun"), text: value })
                    }
                />
            </SubBlock>

            <SubBlock title="Условия эксплуатации модели (параметра)">
                <RangeRow
                    label="Температурный режим"
                    unit="°C"
                    maxLength={3}
                    from={v("usageTempFrom").text || ""}
                    to={v("usageTempTo").text || ""}
                    onChangeFrom={(text) =>
                        onChange("usageTempFrom", { ...v("usageTempFrom"), text })
                    }
                    onChangeTo={(text) =>
                        onChange("usageTempTo", { ...v("usageTempTo"), text })
                    }
                />
                <RangeRow
                    label="Влажность"
                    unit="%"
                    maxLength={3}
                    from={v("usageHumidityFrom").text || ""}
                    to={v("usageHumidityTo").text || ""}
                    onChangeFrom={(text) =>
                        onChange("usageHumidityFrom", { ...v("usageHumidityFrom"), text })
                    }
                    onChangeTo={(text) =>
                        onChange("usageHumidityTo", { ...v("usageHumidityTo"), text })
                    }
                />
                <ChoicePair
                    required
                    label="Попадание прямых солнечных лучей"
                    value={v("usageSun").text || ""}
                    onChange={(value) =>
                        onChange("usageSun", { ...v("usageSun"), text: value })
                    }
                />
            </SubBlock>
        </>
    );
}
/* =========================================================
   ФУНКЦИОНАЛЬНЫЕ ХАРАКТЕРИСТИКИ
   ========================================================= */
function FunctionalCharacteristics({ values, onChange }) {
    const v = (code) => values[code] || {};
    const set = (code) => (patch) => onChange(code, patch);

    const COLOR_OPTIONS = [
        "Белый", "Черный", "Серый", "Серебристый", "Синий", "Красный",
        "Бежевый", "Коричневый", "Зеленый", "Желтый", "Оранжевый",
        "Фиолетовый", "Розовый", "Голубой", "Бордовый",
    ].map((x) => ({ value: x, label: x }));

    const ENERGY_CLASS_OPTIONS = [
        "A++", "A+", "A", "B", "C", "D", "E", "F", "G",
    ].map((x) => ({ value: x, label: x }));

    return (
        <>
            <h3 id="functional-10" className="one-char__section-title"> {/* Было id="functional" */}
                Эксплуатационные свойства
            </h3>

            <CharGroupTitle>Цвет</CharGroupTitle>

            <CharRow label="Цвет" value={v("color")} onChange={set("color")}>
                <div className="one-char__stack">
                    <input

                        type="text"
                        maxLength={25}
                        className="one-char__input"
                        placeholder="Введите значение"
                        value={v("color").text || ""}
                        onChange={(e) =>
                            onChange("color", { ...v("color"), text: e.target.value })
                        }
                    />
                    <CharChips
                        value={v("color")}
                        onChange={set("color")}
                        options={COLOR_OPTIONS}
                    />
                </div>
            </CharRow>

            <CharGroupTitle>Нагрузка</CharGroupTitle>

            <CharRow
                label="Максимальная нагрузка на продукт"
                value={v("maxLoad")}
                onChange={set("maxLoad")}
            >
                <CharInput
                    placeholder="Введите значение"
                    value={v("maxLoad")}
                    onChange={set("maxLoad")}
                    maxLength={5}
                    filter="numeric"
                    unit={[
                        { value: "kg", label: "Килограмм" },
                        { value: "g", label: "Грамм" },
                    ]}
                />
            </CharRow>

            <CharGroupTitle>Класс энергоэффективности</CharGroupTitle>

            <CharRow
                label="Класс энергоэффективности"
                value={v("energyClass")}
                onChange={set("energyClass")}
            >
                <CharChips
                    value={v("energyClass")}
                    onChange={set("energyClass")}
                    options={ENERGY_CLASS_OPTIONS}
                />
            </CharRow>

            <h3 className="one-char__section-title">Иное</h3>
            <CharCustom

                value={v("customFunctional")}
                onChange={set("customFunctional")}
            />
        </>
    );
}

/* =========================================================
   СЕКЦИЯ 3. СВЕДЕНИЯ О ПРОИЗВОДИТЕЛЕ
   ========================================================= */
function SectionManufacturer({ values, onChange }) {
    // 1. Добавляем состояние для второй подсказки
    const [showCountryHint, setShowCountryHint] = useState(false);

    return (
        <section id="ident-manufacturer" className="one-block">
            <BlockTitle>Сведения о производителе</BlockTitle>

            <FieldRow
                multiline
                required
                label="Наименование производителя"
                value={values.manufacturerName}
                onChange={(v) => onChange("manufacturerName", v)}
                maxLength={75}
                // Исправил опечатку "ориентируйтель" -> "ориентируйтесь"
                hint="Наименование производителя — это официальное название компании, завода, фабрики или индивидуального предпринимателя, которые выпустили этот товар. При заполнении ориентируйтесь на юридическое наименование производителя (например, ООО 'Онлайн', End Co., Ltd, One Inc., ИП Иванов Иван Олегович)."
            />

            <div className="one-field">
                <span className="one-field__star">✱</span>
                <span className="one-field__req">требует заполнения</span>

                {/* 2. Оборачиваем кнопку в one-tooltip-wrap */}
                <div className="one-tooltip-wrap">
                    <button
                        type="button"
                        className="one-field__help"
                        onClick={() => setShowCountryHint(!showCountryHint)}
                        aria-label="Подсказка"
                    >
                        ?
                    </button>

                    {/* 3. Выводим всплывающее окно при клике */}
                    {showCountryHint && (
                        <div className="one-tooltip-popup">
                            Страна производства — это государство, в котором товар был изготовлен (например, Китай, Россия, Вьетнам).
                        </div>
                    )}
                </div>

                <span className="one-field__label">Страна производства конкретной модели</span>

                <CountrySelect
                    value={values.country}
                    onChange={(v) => onChange("country", v)}
                />
            </div>
        </section>
    );
}

/* =========================================================
   СЕКЦИЯ 4. ОПИСАНИЕ
   ========================================================= */
function SectionDescription({ values, onChange }) {
    const [showHazardHint, setShowHazardHint] = useState(false);
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
                multiline
                label="Назначение модели"
                value={values.purpose}
                onChange={(v) => onChange("purpose", v)}
                maxLength={500}
                hint="Назначение модели - это цель использования продукта, его сфера применения и основная задача, которую он выполняет."
            />
            <FieldRow
                required
                multiline
                label="Принцип действия модели"
                value={values.actionPrinciple}
                onChange={(v) => onChange("actionPrinciple", v)}
                maxLength={500}
                hint="Принцип действия модели - это описание работы продукта - процесса, который происходит внутри продукта и позволяет ему выполнять свое назначение."
            />

            {/* <h3 className="one-subtitle">
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
            </SubBlock> */}

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
                {/* Оставляем пустой блок звездочки, чтобы колонка не схлопнулась */}
                <span className="one-field__star"></span>

                {/* Оставляем текст, но скрываем его через класс --hidden */}
                <span className="one-field__req one-field__req--hidden"></span>

                <div className="one-tooltip-wrap">
                    <button
                        type="button"
                        className="one-field__help"
                        onClick={() => setShowHazardHint(!showHazardHint)}
                        aria-label="Подсказка"
                    >
                        ?
                    </button>

                    {showHazardHint && (
                        <div className="one-tooltip-popup" style={{ width: "380px", maxWidth: "380px" }}>
                            <strong style={{ display: "block", marginBottom: "8px" }}>Классы опасности грузов:</strong>
                            <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
                                1. Взрывчатые вещества (петарды, пиротехника).<br />
                                2. Газы (баллончики со сжатым газом, аэрозоли).<br />
                                3. Легковоспламеняющиеся жидкости (бензин, лаки, духи, спирты).<br />
                                4. Легковоспламеняющиеся твердые вещества (спички, сера).<br />
                                5. Окисляющие вещества (перекись водорода, отбеливатели).<br />
                                6. Токсичные и инфекционные вещества (пестициды, ртутные градусники).<br />
                                7. Радиоактивные материалы (приборы с изотопами).<br />
                                8. Коррозионные (едкие) вещества (кислоты, щелочи).<br />
                                9. Прочие опасные вещества (литиевые аккумуляторы, сухой лед).
                            </div>
                        </div>
                    )}
                </div>

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
                multiline
                label="Указание мер безопасности"
                value={values.safetyMeasures}
                onChange={(v) => onChange("safetyMeasures", v)}
                maxLength={500}
                hint="Указание мер безопасности — это перечень правил, предостережений и ограничений, которые необходимо соблюдать при использовании, хранении, транспортировке и утилизации товара, чтобы не навредить себе, другим людям или продукту."
            />
            <FieldRow
                required
                multiline
                label="Утилизация продукта и упаковочных материалов"
                value={values.utilization}
                onChange={(v) => onChange("utilization", v)}
                maxLength={500}
                hint="Утилизация продукта и упаковочных материалов - это порядок и способы безопасного вывода продукта и упаковочных материалов из эксплуатации по истечении срока эксплуатеции в соответствии с экологическими нормами и требованиями законодательства."
            />
        </section>
    );
}

// function SubBlock({ title, children }) {
//     return (
//         <div className="one-subblock">
//             <p className="one-subblock__title">{title}</p>
//             {children}
//         </div>
//     );
// }

// function RangeRow({ label, unit, from, to, onChangeFrom, onChangeTo }) {
//     return (
//         <div className="one-range">
//             <span className="one-range__label">{label}</span>
//             <div className="one-range__row">
//                 <span className="one-field__star">✱</span>
//                 <span className="one-field__req">требует заполнения</span>
//                 <span className="one-field__help-slot" />
//                 {/* <span className="one-field__star">✱</span> */}
//                 <span className="one-range__cap">От</span>
//                 <input
//                     type="text"
//                     className="one-range__input"
//                     value={from}
//                     onChange={(e) => onChangeFrom(e.target.value)}
//                 />
//                 <span className="one-range__cap">До</span>
//                 <input
//                     type="text"
//                     className="one-range__input"
//                     value={to}
//                     onChange={(e) => onChangeTo(e.target.value)}
//                 />
//                 <span className="one-range__unit">{unit}</span>
//             </div>
//         </div>
//     );
// }

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
    const [modelPhotos, setModelPhotos] = useState([]);
    const [packPhotos, setPackPhotos] = useState([]);

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

            {/* Проверяем наличие фото. Если оно есть — показываем заголовок и фото */}
            {modelPhotos.length > 0 && modelPhotos[0].url && (
                <>
                    <h2 className="one-section-title">Фотография конкретной модели</h2>
                    <div className="one-page__top-photo">
                        <img
                            src={modelPhotos[0].url}
                            alt="Главное фото модели"
                        />
                    </div>
                </>
            )}

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

            <div className="one-page__excel-row">
                <button type="button" className="one-page__excel-btn">
                    Заполнить через файл Excel
                </button>
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

            {/* ============== УПАКОВКА ============== */}
         
            {activeTab === "packaging" && (
                <div className="one-ident-layout">
                    <nav className="one-subnav-box" aria-label="Разделы упаковки">
                        <div className="one-subnav-box__list">
                            {PACK_SECTIONS.map((s, i) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    className="one-subnav-box__item"
                                    onClick={() => scrollTo(s.key)}
                                >
                                    {i + 1}. {s.label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Основной контент справа */}
                    <div className="one-ident__main">
                        <div ref={(el) => (sectionsRef.current.packaging = el)}>
                            <SectionPackaging
                                data={pack}
                                onChange={updatePack}
                                photos={packPhotos}
                                onPhotosChange={setPackPhotos}
                            />
                        </div>

                        <div ref={(el) => (sectionsRef.current.kit = el)}>
                            <SectionKit items={kit} onChange={setKit} />
                        </div>
                    </div>
                </div>
            )}

            {/* ============== ХАРАКТЕРИСТИКИ ============== */}
            {activeTab === "characteristics" && (
                <SectionCharacteristicsFull values={chars} onChange={updateChars} />
            )}

            {/* ============== ДОСТАВКА ============== */}
            {activeTab === "delivery" && (
                <SectionDelivery items={delivery} onChange={setDelivery} />
            )}

            {/* ============== ЦЕНООБРАЗОВАНИЕ ============== */}
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

            {/* ============== ДОКУМЕНТЫ ============== */}
            {activeTab === "documents" && (
                <SectionDocuments
                    docs={docs}
                    onPick={handleDocPick}
                    onRemove={handleDocRemove}
                />
            )}

            {/* ============== ИДЕНТИФИКАЦИЯ ============== */}
            {activeTab === "identification" && (
                <div className="one-ident-layout">
                    <nav className="one-subnav-box" aria-label="Разделы идентификации">
                        <div className="one-subnav-box__list">
                            {IDENT_SECTIONS.map((s, i) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    className="one-subnav-box__item"
                                    onClick={() => scrollTo(s.key)}
                                >
                                    {i + 1}. {s.label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Оборачиваем весь контент в один блок */}
                    <div className="one-ident__main">
                        <div ref={(el) => (sectionsRef.current.characteristics = el)}>
                            <SectionCharacteristics values={ident} onChange={updateIdent} />
                        </div>

                        <div ref={(el) => (sectionsRef.current.photos = el)}>
                            <SectionPhotos
                                photos={modelPhotos}
                                onPhotosChange={setModelPhotos}
                            />
                        </div>

                        <div ref={(el) => (sectionsRef.current.manufacturer = el)}>
                            <SectionManufacturer values={ident} onChange={updateIdent} />
                        </div>

                        <div ref={(el) => (sectionsRef.current.description = el)}>
                            <SectionDescription values={ident} onChange={updateIdent} />
                        </div>
                    </div>
                </div>
            )}

            <BottomBar
                current={4}
                total={4}
                prevPath="/stage22"
                nextPath="/stage22"
                onSave={async () => {
                    // TODO: подключить API
                    console.log("save", {
                        ident,
                        chars,
                        pack,
                        kit,
                        pricing,
                        delivery,
                        docs,
                        modelPhotos,
                        packPhotos,
                    });
                }}
                homeIconSrc="../images/Home.png"
            />
        </div>
    );
}