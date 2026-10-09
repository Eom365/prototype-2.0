// Add.jsx — единая страница: документы, характеристики, описание
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import CustomCharacteristicsBlock from "../components/CustomCharacteristicsBlock";
import DimensionsGroup from "../components/DimensionsGroup";
import ImageHint from "../components/ImageHint";
import VariantFlowHeader from "../components/VariantFlowHeader";
import PhotoGallery from "../components/PhotoGallery";
import { catalogApi, productsApi } from "../api";
import {
    axisValueFromVariation,
    sameId,
    useCardIds,
    variationSpecsFrom,
} from "../cardScope";
import {
    CUSTOM_CODE_PREFIX,
    allUnitOptions,
    customRowsFromValues,
    displayCustomCharacteristic,
    normalizeCustomRows,
    serializeCustomRows,
} from "../customCharacteristics";
import {
    DIMENSION_CODES,
    dimensionUnitLabel,
    prefillSpecFromProduct,
} from "../productSpecs";
import {
    customTechFieldsFromProduct,
    loadNameFeatures,
    needsCustomVariantSetup,
    nextPathAfterCharacteristics,
    resolveVariantFlow,
    skipsVariantParamStage,
} from "../variantFlow";
import {
    VARIANT_FILL_STAGE_COUNT,
    fillProgressStep,
    fillProgressTotal,
    isProductWizard,
    setProductWizard,
    variantFillStageHeading,
} from "../stageProgress";
import {
    characteristicsTabRequiresFill,
    isCharacteristicsTabFilled,
    markVisited,
    tabClassName,
    tabFilledState,
} from "../wizardTabStatus";
import Stage24 from "./Stage24";
import Stage25 from "./Stage25";
import Stage26 from "./Stage26";
import "./Add.css";
import "./Stage7.css";
import "./Stage2.css";
import "./Stage5.css";
import "./Stage24.css";
import "./Stage23.css";

/* =========================================================
   БЛОК ДОКУМЕНТОВ (из Stage7)
   ========================================================= */

const documentFields = [
    ["warranty", "Гарантийный талон"],
    ["certificate", "Сертификат соответствия"],
    ["declaration", "Декларация о соответствии"],
    ["stateRegistration", "Свидетельство о государственной регистрации"],
    ["registration", "Регистрационное удостоверение"],
    ["manual", "Руководство по эксплуатации"],
    ["other", "Иной документ"],
];

function resolveDocumentGroup(product) {
    const kindCode = (product?.kindCode || "").toLowerCase();
    const categoryCode = (product?.categoryCode || "").toLowerCase();
    const path = (product?.categoryPath || "").toLowerCase();
    if (kindCode === "other") return "other";
    if (categoryCode === "handpieces" || path.includes("наконечник")) {
        return "handpieces";
    }
    if (
        categoryCode === "aerosols" ||
        path.includes("аэрозол") ||
        path.includes("баллон")
    ) {
        return "aerosols";
    }
    return "other";
}

function getRequiredFields(product) {
    const group = resolveDocumentGroup(product);
    const required = new Set(["warranty", "manual"]);
    if (group === "handpieces") required.add("registration");
    if (group === "aerosols") {
        required.add("certificate");
        required.add("declaration");
    }
    return required;
}

function getVisibleDocumentFields(product, requiredFields) {
    const group = resolveDocumentGroup(product);
    return documentFields.filter(([name]) => {
        if (group === "other") return true;
        return requiredFields.has(name);
    });
}

/* =========================================================
   БЛОК ХАРАКТЕРИСТИК (из Stage23)
   ========================================================= */

const DIMENSIONS_HINT_IMAGE = "/images/dimensions.png";
const WEIGHT_CODES = ["weight", "weightTolerance"];
const FIELD_LABELS = {
    article: "Артикул модели (параметра) от завода-изготовителя",
    manufacturer: "Наименование производителя",
    countryOfOrigin: "Страна производства",
    weight: "Вес модели без упаковки",
};

function mainFieldsOrder(fields) {
    const rank = { article: 0, model: 1 };
    return [...fields].sort((a, b) => (rank[a.code] ?? 10) - (rank[b.code] ?? 10));
}

const WARRANTY_FIELDS = [
    {
        code: "warrantyPeriod",
        name: "Гарантия производителя",
        defaultUnit: "months",
        hint: "Срок, в течение которого производитель устраняет недостатки бесплатно",
        required: true,
    },
    {
        code: "serviceLife",
        name: "Срок эксплуатации",
        defaultUnit: "months",
        hint: "Период, в течение которого товар пригоден и безопасен для использования",
        required: true,
    },
];

const TIME_UNITS = [
    { value: "days", label: "дней" },
    { value: "months", label: "месяцев" },
    { value: "years", label: "лет" },
];

const TABS = [
    { key: "main", label: "Технические, физические и функциональные характеристики модели" },
    { key: "dimensions", label: "Наименование модели" },
    { key: "manufacturer", label: "Фотографии модели" },
    { key: "garant", label: "Упаковка модели" },
    { key: "tech", label: "Стоимость модели и система лояльности" },
    { key: "custom", label: "Достака модели" },
    { key: "review", label: "Просмотр заполненных характеристик" },
];

const CHARACTERISTIC_SECTIONS = [
    { key: "identification", label: "1. Идентификация" },
    { key: "manufacturer", label: "2. Сведения о производителе" },
    { key: "warranty", label: "3. Гарантийные обязательства" },
    { key: "functional", label: "4. Функциональные характеристики" },
    { key: "technical", label: "5. Технические характеристики" },
    { key: "material", label: "6. Материал и состав" },
    { key: "affiliation", label: "7. Принадлежность" },
    { key: "power", label: "8. Энергопотребление" },
    { key: "display", label: "9. Дисплей" },
    { key: "system", label: "10. Системные компоненты" },
];

const REQUIRED_DIM_CODES = ["length", "width", "height"];
const REQUIRED_WEIGHT_CODES = ["weight"];

const FALLBACK_SECTIONS = {
    material: [
        { code: "materialPercent", name: "Состав (материал) продукта", inputType: "text", unitLabel: "%" },
        {
            code: "hasCase", name: "Корпус", inputType: "choice", options: [
                { value: "yes", label: "Есть" },
                { value: "no", label: "Нет" },
            ],
        },
        { code: "caseMaterial", name: "Материал корпуса", inputType: "text" },
        {
            code: "waterproofCase", name: "Влагозащитный корпус", inputType: "choice", options: [
                { value: "yes", label: "Да" },
                { value: "no", label: "Нет" },
            ],
        },
    ],
    display: [
        {
            code: "hasDisplay", name: "Дисплей", inputType: "choice", options: [
                { value: "yes", label: "Есть" }, { value: "no", label: "Нет" },
            ],
        },
        {
            code: "displayType", name: "Тип дисплея", inputType: "choice", options: [
                { value: "ips", label: "IPS" }, { value: "oled", label: "OLED" },
                { value: "amoled", label: "AMOLED" }, { value: "tft", label: "TFT" },
                { value: "lcd", label: "LCD" }, { value: "led", label: "LED" },
                { value: "tn", label: "TN" }, { value: "va", label: "VA" },
                { value: "eink", label: "E-Ink" }, { value: "touch", label: "Сенсорный" },
                { value: "non-touch", label: "Несенсорный" },
            ],
        },
        { code: "diagonal", name: "Диагональ", inputType: "text", unitLabel: "дюймы" },
        {
            code: "aspectRatio", name: "Соотношение сторон", inputType: "choice", options: [
                "1:1", "4:3", "3:2", "5:4", "16:9", "16:10",
                "18:9", "19.5:9", "20:9", "21:9", "32:9", "9:16",
            ].map((v) => ({ value: v, label: v })),
        },
        {
            code: "matrixType", name: "Тип матрицы", inputType: "choice", options: [
                { value: "ips", label: "IPS" }, { value: "tn", label: "TN" },
                { value: "va", label: "VA" },
            ],
        },
        { code: "refreshRate", name: "Частота обновления экрана", inputType: "text", unitLabel: "Гц" },
        { code: "brightness", name: "Яркость", inputType: "text", unitLabel: "нит" },
    ],
};

const defaultUnits = {
    weight: "gram",
    tolerance: "gram",
    dimension: "millimeters",
    duration: "months",
};

function findKind(catalog, kindCode) {
    if (!catalog || !kindCode) return null;
    for (const category of catalog.categories) {
        const kind = category.kinds.find((item) => item.code === kindCode);
        if (kind) return kind;
    }
    return null;
}

function buildGroups(kind) {
    const groups = [];
    for (const field of kind?.characteristics || []) {
        let group = groups.find((item) => item.name === field.group);
        if (!group) {
            group = { name: field.group, fields: [] };
            groups.push(group);
        }
        group.fields.push(field);
    }
    return groups;
}

function unitLabelForSpec(field, unitCode, unitGroups) {
    if (!unitCode) return "";
    if (field?.unitGroup) {
        const match = (unitGroups?.[field.unitGroup] || []).find(
            (item) => item.value === unitCode,
        );
        if (match) return match.label;
    }
    for (const group of Object.values(unitGroups || {})) {
        const match = group.find((item) => item.value === unitCode);
        if (match) return match.label;
    }
    if (field?.code && DIMENSION_CODES.includes(field.code)) {
        return dimensionUnitLabel(unitCode);
    }
    return unitCode;
}

function formatSpecValue(field, value, unitGroups) {
    if (!value) return "";
    const raw =
        value.value === "other"
            ? (value.customValue || "").trim()
            : (value.value || "").trim();
    if (!raw) return "";
    const option = (field.options || []).find((o) => o.value === raw);
    let text = option ? option.label : raw;
    const unitLabel = unitLabelForSpec(field, value.unit, unitGroups);
    if (unitLabel) text = `${text} ${unitLabel}`;
    return text;
}

function formatCustomRowDisplay(row, unitGroups) {
    const value = String(row.value || "").trim();
    if (!value) return "";
    const unit =
        row.unitMode === "other"
            ? String(row.customUnit || "").trim()
            : String(row.unit || "").trim();
    if (!unit) return value;
    return displayCustomCharacteristic({ customValue: value, unit }, unitGroups);
}

function CharacteristicRow({ field, value, unitGroups, onChange, checkbox }) {
    const raw = value || { value: "", customValue: "", unit: "" };
    const optionValues = new Set((field.options || []).map((item) => item.value));
    const current =
        field.inputType === "choice" &&
            field.allowCustom &&
            raw.value &&
            raw.value !== "other" &&
            !optionValues.has(raw.value)
            ? { ...raw, value: "other", customValue: raw.value }
            : raw;
    const units = field.unitOptions
        ? field.unitOptions
        : field.unitGroup
            ? unitGroups?.[field.unitGroup] || []
            : [];
    const placeholder =
        field.code === "article" ? "Введите значение" : "Значение";

    return (
        <div
            className={`field-row ${field.inputType === "choice" ? "field-row--options" : ""} ${field.required ? "field-row--required" : ""}`}
        >
            {checkbox && (
                <label className="field-checkbox" title="Отобразить в наименовании модели">
                    <input
                        type="checkbox"
                        checked={checkbox.checked}
                        onChange={checkbox.onChange}
                    />
                </label>
            )}
            <span className="info-icon" title="Подсказка">
                ⓘ
            </span>
            <span className="required-mark-slot">
                {field.required && <span className="required-mark">✱</span>}
            </span>
            <span className="field-name">{FIELD_LABELS[field.code] || field.name}</span>

            {field.inputType === "choice" ? (
                <div className="option-group">
                    {(field.options || []).map((option) => (
                        <button
                            type="button"
                            key={option.value}
                            className={`option-btn ${current.value === option.value ? "option-btn--active" : ""}`}
                            onClick={() => onChange({ value: option.value, customValue: "" })}
                        >
                            {option.label}
                        </button>
                    ))}
                    {field.allowCustom && (
                        <button
                            type="button"
                            className={`option-btn ${current.value === "other" ? "option-btn--active" : ""}`}
                            onClick={() => onChange({ value: "other" })}
                        >
                            Иное
                        </button>
                    )}
                    {field.allowCustom && current.value === "other" && (
                        <input
                            type="text"
                            className="field-input option-custom-input"
                            placeholder="Введите своё значение"
                            value={current.customValue}
                            onChange={(event) => onChange({ customValue: event.target.value })}
                        />
                    )}
                </div>
            ) : (
                <input
                    type="text"
                    className="field-input"
                    placeholder={placeholder}
                    value={current.value}
                    onChange={(event) => onChange({ value: event.target.value })}
                />
            )}

            {units.length > 0 && (
                <select
                    className="field-select"
                    value={current.unit || units[0].value}
                    onChange={(event) => onChange({ unit: event.target.value })}
                >
                    {units.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                            {unit.label}
                        </option>
                    ))}
                </select>
            )}

            {!units.length && field.unitLabel && (
                <span className="field-unit-label">{field.unitLabel}</span>
            )}
        </div>
    );
}

/* =========================================================
   ОСНОВНОЙ КОМПОНЕНТ
   ========================================================= */

const Add = forwardRef(function Add(_props, ref) {
    const navigate = useNavigate();
    const location = useLocation();
    const [params] = useSearchParams();
    const productId = params.get("id");
    const { variationId } = useCardIds();

    /* ---------- Документы ---------- */
    const [docs, setDocs] = useState({});
    const [requiredFields, setRequiredFields] = useState(
        new Set(["warranty", "manual"]),
    );
    const fileInputsRef = useRef({});

    const [openDocsGroup, setOpenDocsGroup] = useState(null);

    const toggleDocsGroup = (key) => {
        setOpenDocsGroup((prev) => (prev === key ? null : key));
    };

    /* ---------- Общие ---------- */
    const [product, setProduct] = useState(null);
    const [catalog, setCatalog] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);

    /* ---------- Характеристики ---------- */
    const [kindCode, setKindCode] = useState("");
    const [nextStage, setNextStage] = useState("/stage24");
    const [specs, setSpecs] = useState({});
    const [customRows, setCustomRows] = useState(() => normalizeCustomRows([]));
    const [techCustomFields, setTechCustomFields] = useState([]);
    const [techCustomValues, setTechCustomValues] = useState({});
    const [techCustomUnits, setTechCustomUnits] = useState({});
    const [productLine, setProductLine] = useState("");
    const [categorySnapshot, setCategorySnapshot] = useState(null);
    const [stabilized, setStabilized] = useState(false);
    const [logo, setLogo] = useState(null);
    const [activeTab, setActiveTab] = useState("main");
    const [visitedTabs, setVisitedTabs] = useState(["main"]);
    const [panelFocus, setPanelFocus] = useState("characteristics");
    const [axisPreview, setAxisPreview] = useState([]);
    const [nameOptions, setNameOptions] = useState([]);
    const [charsRefreshKey, setCharsRefreshKey] = useState(0);
    const [openDescriptionTick, setOpenDescriptionTick] = useState(0);
    const [phase, setPhase] = useState("edit");
    const axisRef = useRef(null);
    const nameRef = useRef(null);
    const descriptionRef = useRef(null);
    const logoInputRef = useRef(null);
    const axisPreviewSigRef = useRef("");
    const nameOptionsSigRef = useRef("");
    const [nameFeatureCodes, setNameFeatureCodes] = useState([]);

    const toggleNameFeature = (code) => {
        setNameFeatureCodes((prev) =>
            prev.includes(code)
                ? prev.filter((c) => c !== code)
                : [...prev, code],
        );
    };

    const handleAxisSelectionChange = useCallback((items) => {
        const next = items || [];
        const signature = next
            .map((item) => `${item.key}:${item.value}:${item.unit || ""}`)
            .join("|");
        if (signature === axisPreviewSigRef.current) return;
        axisPreviewSigRef.current = signature;
        setAxisPreview(next);
    }, []);

    const handleNameOptionsChange = useCallback((items) => {
        const next = items || [];
        const signature = next
            .map(
                (item) =>
                    `${item.key}:${item.value}:${item.label || ""}:${item.unit || ""}`,
            )
            .join("|");
        if (signature === nameOptionsSigRef.current) return;
        nameOptionsSigRef.current = signature;
        setNameOptions(next);
    }, []);

    useEffect(() => {
        catalogApi
            .get()
            .then(setCatalog)
            .catch((loadError) => setError(loadError.message));
    }, []);

    useEffect(() => {
        if (!productId || !catalog) return;
        productsApi
            .get(productId)
            .then((loadedProduct) => {
                setProduct(loadedProduct);

                const nextDocs = {};
                for (const file of loadedProduct.files || []) {
                    if (
                        file.role === "document" &&
                        file.documentType &&
                        file.documentType !== "brand" &&
                        sameVariationId(file.variationId, variationId)
                    ) {
                        nextDocs[file.documentType] = file;
                    }
                }
                setRequiredFields(getRequiredFields(loadedProduct));
                setDocs(nextDocs);

                const variation = variationId
                    ? (loadedProduct.variations || []).find((item) =>
                        sameId(item.id, variationId),
                    )
                    : null;

                setKindCode(loadedProduct.kindCode || "");
                const flow = resolveVariantFlow(loadedProduct);
                setStabilized(Boolean(flow.stabilized));
                setNextStage(nextPathAfterCharacteristics(loadedProduct));
                setProductLine(loadedProduct.productLine || "");
                setCategorySnapshot({
                    purpose: loadedProduct.purpose || "",
                    kindCode: loadedProduct.kindCode || "",
                    productName: loadedProduct.productName || "",
                    categoryPath: loadedProduct.categoryPath || "",
                    productLine: loadedProduct.productLine || "",
                });

                const kind = findKind(catalog, loadedProduct.kindCode);
                const fields = kind?.characteristics || [];
                const techFields = flow.stabilized
                    ? customTechFieldsFromProduct(loadedProduct)
                    : [];
                setTechCustomFields(techFields);

                if (variation) {
                    const loadedSpecs = variationSpecsFrom(
                        loadedProduct,
                        variation,
                        fields,
                        defaultUnits,
                    );
                    for (const wf of WARRANTY_FIELDS) {
                        const saved = (variation.values || []).find(
                            (item) => item.code === wf.code,
                        );
                        loadedSpecs[wf.code] = {
                            value: String(saved?.value || saved?.customValue || "").trim(),
                            customValue: "",
                            unit: String(saved?.unit || wf.defaultUnit).trim(),
                        };
                    }
                    setSpecs(loadedSpecs);

                    const techValues = {};
                    const techUnits = {};
                    for (const field of techFields) {
                        const saved = (variation.values || []).find(
                            (item) => item.code === field.code,
                        );
                        techValues[field.code] = String(saved?.customValue || "").trim();
                        techUnits[field.code] = String(
                            saved?.unit || field.unit || "",
                        ).trim();
                    }
                    setTechCustomValues(techValues);
                    setTechCustomUnits(techUnits);

                    const knownTechCodes = new Set(techFields.map((item) => item.code));
                    setCustomRows(
                        normalizeCustomRows(
                            customRowsFromValues(
                                (variation.values || []).filter(
                                    (item) =>
                                        item.code?.startsWith(CUSTOM_CODE_PREFIX) &&
                                        !knownTechCodes.has(item.code),
                                ),
                                { variationId },
                                catalog.unitGroups,
                            ),
                        ),
                    );
                    setLogo(
                        (loadedProduct.files || []).find(
                            (file) =>
                                file.role === "logo" &&
                                sameVariationId(file.variationId, variationId),
                        ) || null,
                    );
                } else {
                    const next = {};
                    for (const field of fields) {
                        const saved = (loadedProduct.values || []).find(
                            (value) => value.code === field.code && !value.variationId,
                        );
                        const defaultUnit = field.unitGroup
                            ? defaultUnits[field.unitGroup]
                            : "";
                        next[field.code] = prefillSpecFromProduct(
                            field.code,
                            saved,
                            loadedProduct,
                            defaultUnit,
                        );
                    }
                    for (const wf of WARRANTY_FIELDS) {
                        const saved = (loadedProduct.values || []).find(
                            (item) => item.code === wf.code && !item.variationId,
                        );
                        next[wf.code] = {
                            value: String(saved?.value || saved?.customValue || "").trim(),
                            customValue: "",
                            unit: String(saved?.unit || wf.defaultUnit).trim(),
                        };
                    }
                    setSpecs(next);

                    const knownTechCodes = new Set(techFields.map((item) => item.code));
                    setCustomRows(
                        normalizeCustomRows(
                            customRowsFromValues(
                                (loadedProduct.values || []).filter(
                                    (item) =>
                                        !item.variationId &&
                                        item.code?.startsWith(CUSTOM_CODE_PREFIX) &&
                                        !knownTechCodes.has(item.code),
                                ),
                                {},
                                catalog.unitGroups,
                            ),
                        ),
                    );
                    const techValues = {};
                    const techUnits = {};
                    for (const field of techFields) {
                        const saved = (loadedProduct.values || []).find(
                            (item) => item.code === field.code && !item.variationId,
                        );
                        techValues[field.code] = String(saved?.customValue || "").trim();
                        techUnits[field.code] = String(
                            saved?.unit || field.unit || "",
                        ).trim();
                    }
                    setTechCustomValues(techValues);
                    setTechCustomUnits(techUnits);
                    setLogo(
                        (loadedProduct.files || []).find(
                            (file) => file.role === "logo" && !file.variationId,
                        ) || null,
                    );
                }
                setLoaded(true);
            })
            .catch((loadError) => setError(loadError.message));
    }, [productId, variationId, catalog]);

    useEffect(() => {
        if (productId) setProductWizard(productId, false);
    }, [productId]);

    function sameVariationId(fileVariationId, targetVariationId) {
        if (!targetVariationId) return !fileVariationId;
        return (
            String(fileVariationId || "").toLowerCase() ===
            String(targetVariationId).toLowerCase()
        );
    }

    const reloadDocs = async () => {
        if (!productId) return;
        const fresh = await productsApi.get(productId);
        setProduct(fresh);
        const nextDocs = {};
        for (const file of fresh.files || []) {
            if (
                file.role === "document" &&
                file.documentType &&
                file.documentType !== "brand" &&
                sameVariationId(file.variationId, variationId)
            ) {
                nextDocs[file.documentType] = file;
            }
        }
        setDocs(nextDocs);
    };

    const handleDocFileChange = async (name, event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !productId) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("role", "document");
        formData.append("documentType", name);
        if (variationId) formData.append("variationId", variationId);
        setError("");
        try {
            await productsApi.upload(productId, formData);
            await reloadDocs();
        } catch (uploadError) {
            setError(uploadError.message);
        }
    };

    const handleDocFileRemove = async (name) => {
        const file = docs[name];
        if (!file) return;
        setError("");
        try {
            await productsApi.deleteFile(file.id);
            await reloadDocs();
        } catch (removeError) {
            setError(removeError.message);
        }
    };

    const kind = findKind(catalog, kindCode);
    const groups = buildGroups(kind);
    const mainGroup = groups.find((group) => group.name === "Основные");
    const dimensionsGroup = groups.find((group) => group.name === "Габариты");
    const manufacturerGroup = groups.find(
        (group) => group.name === "Производитель",
    );
    const techGroups = groups.filter(
        (group) =>
            ![
                "Основные",
                "Габариты",
                "Производитель",
                "Гарантия",
                "Гарантийные обязательства",
            ].includes(group.name),
    );
    const weightFields = (mainGroup?.fields || []).filter((field) =>
        WEIGHT_CODES.includes(field.code),
    );
    const mainFields = (mainGroup?.fields || []).filter(
        (field) => !WEIGHT_CODES.includes(field.code),
    );
    const manufacturerFields = (manufacturerGroup?.fields || []).filter(
        (field) =>
            field.code !== "brand" &&
            field.code !== "warranty" &&
            field.code !== "warrantyPeriod" &&
            field.code !== "serviceLife",
    );
    const isCustomFlow = resolveVariantFlow(product).mode === "custom";
    const showCustomVariantSetup = needsCustomVariantSetup(product);

    const tabs = showCustomVariantSetup
        ? TABS.filter((tab) => tab.key !== "tech")
        : TABS;
    const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
    const charTabContext = {
        specs,
        mainFields,
        weightFields,
        manufacturerFields,
        techGroups,
        customRows,
        productLine,
        logo,
    };
    const charsPanelOpen =
        panelFocus === "characteristics" || panelFocus === "both";

    const selectTab = (key) => {
        if (key === "review") {
            setActiveTab("review");
            setVisitedTabs((prev) => markVisited(prev, "review"));
            setPanelFocus("both");
            setOpenDescriptionTick((prev) => prev + 1);
            return;
        }
        if (activeTab === key && charsPanelOpen) {
            setActiveTab(null);
            setPanelFocus(null);
            return;
        }
        setActiveTab(key);
        setVisitedTabs((prev) => markVisited(prev, key));
        setPanelFocus("characteristics");
    };

    const closeCharacteristicsForDescription = () => {
        setActiveTab(null);
        setPanelFocus("description");
    };

    const handleDescriptionOpenChange = (open) => {
        if (open) {
            if (activeTab === "review") {
                setPanelFocus("both");
                return;
            }
            closeCharacteristicsForDescription();
            return;
        }
        if (panelFocus === "both" && activeTab === "review") {
            setPanelFocus("characteristics");
            return;
        }
        if (panelFocus === "description" || panelFocus === "both") {
            setPanelFocus(null);
        }
    };

    useEffect(() => {
        if (!showCustomVariantSetup || !loaded || !productId) return undefined;
        const timer = window.setTimeout(() => {
            persist()
                .then(() => setCharsRefreshKey((prev) => prev + 1))
                .catch(() => { });
        }, 900);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        showCustomVariantSetup,
        loaded,
        productId,
        specs,
        customRows,
        productLine,
        techCustomValues,
        techCustomUnits,
    ]);

    const updateSpec = (code, patch) => {
        setSpecs((prev) => {
            const next = {
                ...prev,
                [code]: {
                    ...(prev[code] || { value: "", customValue: "", unit: "" }),
                    ...patch,
                },
            };
            if (code === "light" && patch.value === "no") {
                next.lightSource = {
                    ...(prev.lightSource || { value: "", customValue: "", unit: "" }),
                    value: "",
                    customValue: "",
                };
            }
            return next;
        });
    };

    const handleLogoChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !productId) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("role", "logo");
        if (variationId) formData.append("variationId", variationId);
        setError("");
        try {
            const saved = await productsApi.upload(productId, formData);
            setLogo(saved);
        } catch (uploadError) {
            setError(uploadError.message);
        }
    };

    const handleLogoRemove = async () => {
        if (!logo?.id) {
            setLogo(null);
            return;
        }
        setError("");
        try {
            await productsApi.deleteFile(logo.id);
            setLogo(null);
        } catch (removeError) {
            setError(removeError.message);
        }
    };

    const persist = async () => {
        if (!productId)
            throw new Error("Сначала создайте карточку на главной странице");
        if (!loaded) throw new Error("Карточка ещё загружается, подождите секунду");
        if (categorySnapshot) {
            await productsApi.saveCategory(productId, {
                ...categorySnapshot,
                productLine: productLine.trim() || categorySnapshot.productLine || "",
            });
        }
        const latest = variationId ? await productsApi.get(productId) : null;
        const variation =
            variationId && latest
                ? (latest.variations || []).find((item) => sameId(item.id, variationId))
                : null;
        const axes = new Set(latest?.variantAxes || []);

        const techCodes = new Set(techCustomFields.map((item) => item.code));
        const values = [
            ...Object.entries(specs).map(([code, spec]) => {
                let value = spec.value;
                let customValue = spec.customValue;
                const empty =
                    !String(value || "").trim() && !String(customValue || "").trim();
                if (empty && variation && axes.has(code)) {
                    const axisText = axisValueFromVariation(variation, code);
                    if (axisText) value = axisText;
                }
                return { code, value, customValue, unit: spec.unit || null };
            }),
            ...techCustomFields.map((field) => ({
                code: field.code,
                value: field.name,
                customValue: String(techCustomValues[field.code] || "").trim(),
                unit:
                    String(techCustomUnits[field.code] || field.unit || "").trim() ||
                    null,
            })),
            ...serializeCustomRows(customRows).filter(
                (row) => !techCodes.has(row.code),
            ),
        ];
        if (variationId) {
            await productsApi.saveVariationCharacteristics(productId, variationId, {
                values,
            });
            const shouldAutoNameVariant =
                stabilized ||
                (!showCustomVariantSetup &&
                    Boolean((product?.variantAxes || []).filter(Boolean).length));
            if (shouldAutoNameVariant && product) {
                let featureCodes = loadNameFeatures(productId);
                if (!featureCodes.length) {
                    const approved = (product.variations || []).find(
                        (item) =>
                            (item.reviewStatus || "").toLowerCase() === "approved" &&
                            (item.fullName || "").trim(),
                    );
                    const fullName = (approved?.fullName || "").trim();
                    if (fullName) {
                        const candidates = [
                            ...techCustomFields.map((item) => ({
                                code: item.code,
                                label: item.name,
                            })),
                            ...(product.variantAxes || []).map((code) => ({
                                code,
                                label:
                                    code === "model"
                                        ? "Модель"
                                        : code === "volume"
                                            ? "Объем"
                                            : code === "width"
                                                ? "Ширина"
                                                : code === "height"
                                                    ? "Высота"
                                                    : code === "length"
                                                        ? "Длина"
                                                        : code === "weight"
                                                            ? "Вес"
                                                            : code,
                            })),
                        ];
                        featureCodes = candidates
                            .filter((item) => item.label && fullName.includes(item.label))
                            .map((item) => item.code)
                            .slice(0, 3);
                    }
                }
                const nameParts = [];
                for (const code of featureCodes) {
                    const tech = techCustomFields.find((item) => item.code === code);
                    if (tech) {
                        const text = displayCustomCharacteristic(
                            {
                                customValue: String(techCustomValues[code] || "").trim(),
                                unit: String(techCustomUnits[code] || tech.unit || "").trim(),
                            },
                            catalog?.unitGroups,
                        );
                        if (text) nameParts.push(text);
                        continue;
                    }
                    const spec = specs[code];
                    if (spec) {
                        const field = (kind?.characteristics || []).find(
                            (item) => item.code === code,
                        );
                        const text = field
                            ? formatSpecValue(field, spec, catalog?.unitGroups)
                            : spec.value === "other"
                                ? String(spec.customValue || "").trim()
                                : String(spec.value || "").trim();
                        if (text) nameParts.push(text);
                        continue;
                    }
                    const fromValues = values.find((item) => item.code === code);
                    if (fromValues) {
                        const text =
                            fromValues.value === "other" ||
                                String(fromValues.code || "").startsWith("custom:")
                                ? String(fromValues.customValue || "").trim() ||
                                String(fromValues.value || "").trim()
                                : String(fromValues.value || "").trim();
                        if (text) nameParts.push(text);
                    }
                }
                const base = [
                    (product.fullName || "").trim() ||
                    [
                        (product.productName || "").trim(),
                        (product.brandName || "").trim(),
                        (productLine || product.productLine || "").trim(),
                    ]
                        .filter(Boolean)
                        .join(" "),
                    ...nameParts,
                ]
                    .filter(Boolean)
                    .join(" ");
                const logoFile =
                    (product.files || []).find(
                        (file) =>
                            file.role === "logo" &&
                            sameVariationId(file.variationId, variationId),
                    ) ||
                    (product.files || []).find(
                        (file) => file.role === "logo" && !file.variationId,
                    );
                await productsApi.saveVariationName(productId, variationId, {
                    fullName: base,
                    nameIncludesLogo: Boolean(logoFile),
                    nameIncludesType: false,
                    nameIncludesBrand: false,
                    nameIncludesLine: false,
                    nameIncludesModel: featureCodes.includes("model"),
                });
            }
        } else {
            await productsApi.saveCharacteristics(productId, { values });
        }
    };

    useImperativeHandle(ref, () => ({
        save: persist,
        saveAll: async () => {
            await persist();
            setCharsRefreshKey((prev) => prev + 1);
            let savedVariationId = variationId;
            if (showCustomVariantSetup && axisPreview.length > 0) {
                savedVariationId =
                    (await axisRef.current?.save?.()) || savedVariationId;
                await nameRef.current?.save?.(savedVariationId);
            }
            await descriptionRef.current?.save?.();
            return savedVariationId;
        },
    }));

    const go = (path) =>
        navigate({ pathname: path, search: location.search });

    const renderFields = (fields) =>
        fields
            .filter(
                (field) => !(field.code === "lightSource" && specs.light?.value === "no"),
            )
            .map((field) => (
                <CharacteristicRow
                    key={field.code}
                    field={field}
                    value={specs[field.code]}
                    unitGroups={catalog?.unitGroups}
                    onChange={(patch) => updateSpec(field.code, patch)}
                />
            ));

    const renderSection = (key) => {
        // 1. Идентификация
        if (key === "identification") {
            const fromCatalog = mainFieldsOrder(
                mainFields.filter((field) =>
                    ["article", "model"].includes(field.code),
                ),
            );
            const catalogCodes = new Set(fromCatalog.map((f) => f.code));

            const fallbackFields = [
                {
                    code: "article",
                    name: "Артикул модели от завода-изготовителя",
                    inputType: "text",
                    required: false,
                },
                {
                    code: "model",
                    name: "Модель",
                    inputType: "text",
                    required: true,
                },
            ].filter((f) => !catalogCodes.has(f.code));

            const allFields = [...fromCatalog, ...fallbackFields].map((f) => ({
                ...f,
                required: f.code === "model",
            }));

            return (
                <>
                    {allFields.map((field) => (
                        <CharacteristicRow
                            key={field.code}
                            field={field}
                            value={specs[field.code]}
                            unitGroups={catalog?.unitGroups}
                            onChange={(patch) => updateSpec(field.code, patch)}
                            checkbox={
                                field.code === "model"
                                    ? {
                                        checked: nameFeatureCodes.includes(field.code),
                                        onChange: () => toggleNameFeature(field.code),
                                    }
                                    : undefined
                            }
                        />
                    ))}
                </>
            );
        }

        // 2. Сведения о производителе
        if (key === "manufacturer") {
            const fromCatalog = (manufacturerGroup?.fields || []).filter(
                (field) =>
                    field.code !== "brand" &&
                    field.code !== "warranty" &&
                    field.code !== "warrantyPeriod" &&
                    field.code !== "serviceLife",
            );

            const RENAME = {
                manufacturer: "Наименование производителя",
                manufacturerName: "Наименование производителя",
                country: "Страна производства",
                countryOfOrigin: "Страна производства",
            };

            const catalogNames = new Set(
                fromCatalog.map((f) => RENAME[f.code] || f.name),
            );

            const fallbackFields = [
                {
                    code: "manufacturerName",
                    name: "Наименование производителя",
                    inputType: "text",
                    required: true,
                },
                {
                    code: "countryOfOrigin",
                    name: "Страна производства",
                    inputType: "text",
                    required: true,
                },
            ].filter((f) => !catalogNames.has(f.name));

            const allFields = [...fromCatalog, ...fallbackFields].map((f) => ({
                ...f,
                name: RENAME[f.code] || f.name,
                required: true,
            }));

            return <>{renderFields(allFields)}</>;
        }

        // 3. Гарантийные обязательства
        if (key === "warranty") {
            return (
                <>
                    {WARRANTY_FIELDS.map((wf) => {
                        const spec = specs[wf.code] || {
                            value: "",
                            customValue: "",
                            unit: wf.defaultUnit,
                        };
                        return (
                            <div
                                className={`field-row ${wf.required ? "field-row--required" : ""}`}
                                key={wf.code}
                            >
                                <span className="info-icon" title={wf.hint}>ⓘ</span>
                                <span className="required-mark-slot">
                                    {wf.required && <span className="required-mark">✱</span>}
                                </span>
                                <span className="field-name">{wf.name}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    className="field-input"
                                    placeholder="Введите число"
                                    value={spec.value || ""}
                                    onChange={(event) =>
                                        updateSpec(wf.code, { value: event.target.value })
                                    }
                                />
                                <select
                                    className="field-select"
                                    value={spec.unit || wf.defaultUnit}
                                    onChange={(event) =>
                                        updateSpec(wf.code, { unit: event.target.value })
                                    }
                                >
                                    {TIME_UNITS.map((u) => (
                                        <option key={u.value} value={u.value}>
                                            {u.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}
                </>
            );
        }

        // 4. Функциональные характеристики
        if (key === "functional") {
            const dimFields = (dimensionsGroup?.fields || []).map((f) =>
                REQUIRED_DIM_CODES.includes(f.code) ? { ...f, required: true } : f,
            );

            const markedWeightFields = weightFields.map((f) =>
                REQUIRED_WEIGHT_CODES.includes(f.code) ? { ...f, required: true } : f,
            );

            const catalogCodes = new Set([
                ...(dimensionsGroup?.fields || []).map((f) => f.code),
                ...weightFields.map((f) => f.code),
            ]);

            const extraDimFields = [
                {
                    code: "diameter",
                    name: "Диаметр",
                    inputType: "text",
                    unitOptions: [
                        { value: "millimeters", label: "Миллиметры" },
                        { value: "centimeters", label: "Сантиметры" },
                    ],
                },
                {
                    code: "volume",
                    name: "Объём",
                    inputType: "text",
                    unitOptions: [
                        { value: "milliliters", label: "Миллилитры" },
                        { value: "liters", label: "Литры" },
                        { value: "cm3", label: "Сантиметры³" },
                    ],
                },
            ].filter((f) => !catalogCodes.has(f.code));

            const hasRequiredDims = dimFields.some((f) => f.required);

            return (
                <>
                    <h3 className="qw chars-subsection-title">
                        Габаритные размеры и вес
                    </h3>

                    {dimFields.length > 0 && (
                        <div
                            className={
                                hasRequiredDims ? "dimensions-group--required" : ""
                            }
                        >
                            {dimFields.map((field) => (
                                <CharacteristicRow
                                    key={field.code}
                                    field={{
                                        ...field,
                                        unitOptions: catalog?.unitGroups?.dimension || [],
                                    }}
                                    value={specs[field.code]}
                                    unitGroups={catalog?.unitGroups}
                                    onChange={(patch) => updateSpec(field.code, patch)}
                                    checkbox={{
                                        checked: nameFeatureCodes.includes(field.code),
                                        onChange: () => toggleNameFeature(field.code),
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {extraDimFields.map((field) => (
                        <CharacteristicRow
                            key={field.code}
                            field={field}
                            value={specs[field.code]}
                            unitGroups={catalog?.unitGroups}
                            onChange={(patch) => updateSpec(field.code, patch)}
                            checkbox={{
                                checked: nameFeatureCodes.includes(field.code),
                                onChange: () => toggleNameFeature(field.code),
                            }}
                        />
                    ))}

                    {markedWeightFields.length > 0 && (
                        <>
                            {markedWeightFields.map((field) => (
                                <CharacteristicRow
                                    key={field.code}
                                    field={field}
                                    value={specs[field.code]}
                                    unitGroups={catalog?.unitGroups}
                                    onChange={(patch) => updateSpec(field.code, patch)}
                                    checkbox={
                                        field.code === "weight"
                                            ? {
                                                checked: nameFeatureCodes.includes(field.code),
                                                onChange: () => toggleNameFeature(field.code),
                                            }
                                            : undefined
                                    }
                                />
                            ))}
                        </>
                    )}

                    <h3 className="qw chars-subsection-title">Цвет</h3>

                    <div className="field-row field-row--options">
                        <label className="field-checkbox" title="Отобразить в наименовании модели">
                            <input
                                type="checkbox"
                                checked={nameFeatureCodes.includes("color")}
                                onChange={() => toggleNameFeature("color")}
                            />
                        </label>
                        <span className="info-icon" title="Выберите цвет или введите свой">
                            ⓘ
                        </span>
                        <span className="required-mark-slot" aria-hidden="true" />
                        <span className="field-name">Цвет</span>
                        <div className="option-group">
                            <input
                                type="text"
                                className="field-input option-custom-input"
                                placeholder="Введите значение"
                                value={specs.color?.value || ""}
                                onChange={(event) =>
                                    updateSpec("color", { value: event.target.value, customValue: "" })
                                }
                            />
                            {[
                                { value: "Белый", label: "Белый" },
                                { value: "Черный", label: "Черный" },
                                { value: "Серый", label: "Серый" },
                                { value: "Серебристый", label: "Серебристый" },
                                { value: "Синий", label: "Синий" },
                                { value: "Красный", label: "Красный" },
                                { value: "Бежевый", label: "Бежевый" },
                                { value: "Коричневый", label: "Коричневый" },
                                { value: "Зеленый", label: "Зеленый" },
                                { value: "Желтый", label: "Желтый" },
                                { value: "Оранжевый", label: "Оранжевый" },
                                { value: "Фиолетовый", label: "Фиолетовый" },
                                { value: "Розовый", label: "Розовый" },
                                { value: "Голубой", label: "Голубой" },
                                { value: "Бордовый", label: "Бордовый" },
                            ].map((option) => (
                                <button
                                    type="button"
                                    key={option.value}
                                    className={`option-btn ${specs.color?.value === option.value ? "option-btn--active" : ""}`}
                                    onClick={() =>
                                        updateSpec("color", { value: option.value, customValue: "" })
                                    }
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <h3 className="qw chars-subsection-title">Нагрузка</h3>

                    <CharacteristicRow
                        field={{
                            code: "maxLoad",
                            name: "Максимальная нагрузка на продукт",
                            inputType: "text",
                            unitOptions: [
                                { value: "kg", label: "Килограмм" },
                                { value: "gr", label: "Грамм" },
                            ],
                        }}
                        value={specs.maxLoad}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("maxLoad", patch)}
                        checkbox={{
                            checked: nameFeatureCodes.includes("maxLoad"),
                            onChange: () => toggleNameFeature("maxLoad"),
                        }}
                    />

                    <h3 className="qw chars-subsection-title">
                        Класс энергоэффективности
                    </h3>
                    <CharacteristicRow
                        field={{
                            code: "energyClass",
                            name: "Класс энергоэффективности",
                            inputType: "choice",
                            options: [
                                { value: "A++", label: "A++" },
                                { value: "A+", label: "A+" },
                                { value: "A", label: "A" },
                                { value: "B", label: "B" },
                                { value: "C", label: "C" },
                                { value: "D", label: "D" },
                                { value: "E", label: "E" },
                                { value: "F", label: "F" },
                                { value: "G", label: "G" },
                            ],
                        }}
                        value={specs.energyClass}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("energyClass", patch)}
                        checkbox={{
                            checked: nameFeatureCodes.includes("energyClass"),
                            onChange: () => toggleNameFeature("energyClass"),
                        }}
                    />
                </>
            );
        }

        // 5. Технические характеристики
        if (key === "technical") {
            return (
                <>
                    <h3 className="qw chars-subsection-title">Охлаждение</h3>

                    <CharacteristicRow
                        field={{
                            code: "hasCooling",
                            name: "Охлаждение",
                            inputType: "choice",
                            options: [
                                { value: "yes", label: "Есть" },
                                { value: "no", label: "Нет" },
                            ],
                        }}
                        value={specs.hasCooling}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("hasCooling", patch)}
                        checkbox={{
                            checked: nameFeatureCodes.includes("hasCooling"),
                            onChange: () => toggleNameFeature("hasCooling"),
                        }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "coolingType",
                            name: "Тип охлаждения",
                            inputType: "text",
                        }}
                        value={specs.coolingType}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("coolingType", patch)}
                        checkbox={{
                            checked: nameFeatureCodes.includes("coolingType"),
                            onChange: () => toggleNameFeature("coolingType"),
                        }}
                    />

                    <h3 className="qw chars-subsection-title">Двигатель</h3>

                    <CharacteristicRow
                        field={{ code: "cylinders", name: "Количество цилиндров", inputType: "text", unitLabel: "шт." }}
                        value={specs.cylinders}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("cylinders", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("cylinders"), onChange: () => toggleNameFeature("cylinders") }}
                    />

                    <CharacteristicRow
                        field={{ code: "engineStrokes", name: "Количество тактов двигателя", inputType: "text", unitLabel: "такт" }}
                        value={specs.engineStrokes}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("engineStrokes", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("engineStrokes"), onChange: () => toggleNameFeature("engineStrokes") }}
                    />

                    <CharacteristicRow
                        field={{ code: "engineSpeed", name: "Скорость вращения двигателя", inputType: "text", unitLabel: "об/мин" }}
                        value={specs.engineSpeed}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("engineSpeed", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("engineSpeed"), onChange: () => toggleNameFeature("engineSpeed") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "starterType",
                            name: "Тип стартера",
                            inputType: "choice",
                            options: [
                                { value: "manual", label: "Ручной" },
                                { value: "electric", label: "Электрический" },
                                { value: "auto", label: "Автоматический" },
                            ],
                        }}
                        value={specs.starterType}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("starterType", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("starterType"), onChange: () => toggleNameFeature("starterType") }}
                    />

                    <CharacteristicRow
                        field={{ code: "fuelType", name: "Вид топлива", inputType: "text" }}
                        value={specs.fuelType}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("fuelType", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("fuelType"), onChange: () => toggleNameFeature("fuelType") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "fuelTankVolume",
                            name: "Объём топливного бака",
                            inputType: "text",
                            unitOptions: [
                                { value: "liters", label: "Литры" },
                                { value: "milliliters", label: "Миллилитры" },
                            ],
                        }}
                        value={specs.fuelTankVolume}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("fuelTankVolume", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("fuelTankVolume"), onChange: () => toggleNameFeature("fuelTankVolume") }}
                    />

                    <CharacteristicRow
                        field={{ code: "fuelConsumption", name: "Расход топлива", inputType: "text", unitLabel: "л/ч" }}
                        value={specs.fuelConsumption}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("fuelConsumption", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("fuelConsumption"), onChange: () => toggleNameFeature("fuelConsumption") }}
                    />

                    <h3 className="qw chars-subsection-title">Уровень шума</h3>

                    <CharacteristicRow
                        field={{
                            code: "noiseLevel",
                            name: "Уровень шума",
                            inputType: "text",
                            unitOptions: [{ value: "db", label: "дБ" }],
                        }}
                        value={specs.noiseLevel}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("noiseLevel", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("noiseLevel"), onChange: () => toggleNameFeature("noiseLevel") }}
                    />

                    {techGroups.length > 0 && (
                        <>
                            <h3 className="qw chars-subsection-title">
                                Дополнительные характеристики
                            </h3>
                            {techGroups.map((group) => (
                                <div key={group.name}>
                                    <h4 className="t">{group.name}</h4>
                                    {renderFields(group.fields)}
                                </div>
                            ))}
                        </>
                    )}

                    {techCustomFields.length > 0 &&
                        techCustomFields.map((field) => {
                            const units = allUnitOptions(catalog?.unitGroups);
                            const known = new Set(units.map((item) => item.value));
                            const currentUnit = String(
                                techCustomUnits[field.code] || field.unit || "",
                            ).trim();
                            const unitMode =
                                currentUnit && !known.has(currentUnit) ? "other" : "preset";
                            return (
                                <div className="field-row field-row--tech-custom" key={field.code}>
                                    <span className="info-icon" title="Подсказка">ⓘ</span>
                                    <span className="required-mark-slot" aria-hidden="true" />
                                    <span className="field-name">{field.name}</span>
                                    <div className="tech-custom-control">
                                        <input
                                            type="text"
                                            className="field-input"
                                            placeholder="Значение"
                                            value={techCustomValues[field.code] || ""}
                                            onChange={(event) =>
                                                setTechCustomValues((prev) => ({
                                                    ...prev,
                                                    [field.code]: event.target.value,
                                                }))
                                            }
                                        />
                                        <select
                                            className="field-select"
                                            value={unitMode === "other" ? "other" : currentUnit}
                                            onChange={(event) => {
                                                const next = event.target.value;
                                                if (next === "other") {
                                                    setTechCustomUnits((prev) => ({
                                                        ...prev,
                                                        [field.code]:
                                                            currentUnit && !known.has(currentUnit)
                                                                ? currentUnit
                                                                : "",
                                                    }));
                                                    return;
                                                }
                                                setTechCustomUnits((prev) => ({
                                                    ...prev,
                                                    [field.code]: next,
                                                }));
                                            }}
                                        >
                                            <option value="">Единица измерения</option>
                                            {units.map((unit) => (
                                                <option key={unit.value} value={unit.value}>
                                                    {unit.label}
                                                </option>
                                            ))}
                                            <option value="other">Иное</option>
                                        </select>
                                        {unitMode === "other" && (
                                            <input
                                                type="text"
                                                className="field-input tech-custom-control__unit"
                                                placeholder="Своя единица"
                                                value={currentUnit}
                                                onChange={(event) =>
                                                    setTechCustomUnits((prev) => ({
                                                        ...prev,
                                                        [field.code]: event.target.value,
                                                    }))
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </>
            );
        }

        // 7. Принадлежность
        if (key === "affiliation") {
            return (
                <>
                    <h3 className="qw chars-subsection-title">Принадлежность</h3>

                    <CharacteristicRow
                        field={{
                            code: "gender",
                            name: "Пол",
                            inputType: "choice",
                            options: [
                                { value: "female", label: "Женский" },
                                { value: "male", label: "Мужской" },
                                { value: "girls", label: "Девочки" },
                                { value: "boys", label: "Мальчики" },
                                { value: "unisex", label: "Унисекс" },
                            ],
                        }}
                        value={specs.gender}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("gender", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("gender"), onChange: () => toggleNameFeature("gender") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "ageGroup",
                            name: "Возраст",
                            inputType: "choice",
                            options: [
                                { value: "0-12", label: "Дети 0–12 лет" },
                                { value: "13-18", label: "Подростки 13–18 лет" },
                                { value: "19-59", label: "Взрослые 19–59 лет" },
                                { value: "60+", label: "Пожилые 60+ лет" },
                            ],
                        }}
                        value={specs.ageGroup}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("ageGroup", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("ageGroup"), onChange: () => toggleNameFeature("ageGroup") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "ageLimit",
                            name: "Возрастное ограничение",
                            inputType: "choice",
                            options: [
                                { value: "0+", label: "0+" },
                                { value: "6+", label: "6+" },
                                { value: "12+", label: "12+" },
                                { value: "16+", label: "16+" },
                                { value: "18+", label: "18+" },
                            ],
                        }}
                        value={specs.ageLimit}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("ageLimit", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("ageLimit"), onChange: () => toggleNameFeature("ageLimit") }}
                    />

                    <h3 className="qw chars-subsection-title">Размерная сетка</h3>

                    <CharacteristicRow
                        field={{ code: "shoeSize", name: "Российский размер обуви", inputType: "text", unitLabel: "12–54" }}
                        value={specs.shoeSize}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("shoeSize", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("shoeSize"), onChange: () => toggleNameFeature("shoeSize") }}
                    />

                    <CharacteristicRow
                        field={{ code: "clothesSize", name: "Российский размер одежды", inputType: "text", unitLabel: "20–94" }}
                        value={specs.clothesSize}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("clothesSize", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("clothesSize"), onChange: () => toggleNameFeature("clothesSize") }}
                    />

                    <h3 className="qw chars-subsection-title">Сезон</h3>

                    <CharacteristicRow
                        field={{
                            code: "season",
                            name: "Сезон",
                            inputType: "choice",
                            options: [
                                { value: "summer", label: "Лето" },
                                { value: "autumn", label: "Осень" },
                                { value: "winter", label: "Зима" },
                                { value: "spring", label: "Весна" },
                            ],
                        }}
                        value={specs.season}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("season", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("season"), onChange: () => toggleNameFeature("season") }}
                    />
                </>
            );
        }

        // 8. Энергопотребление
        if (key === "power") {
            return (
                <>
                    <h3 className="qw chars-subsection-title">Электропитание</h3>

                    <CharacteristicRow
                        field={{ code: "powerConsumption", name: "Потребляемая мощность", inputType: "text", unitLabel: "Вт" }}
                        value={specs.powerConsumption}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("powerConsumption", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("powerConsumption"), onChange: () => toggleNameFeature("powerConsumption") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "workingTime",
                            name: "Время непрерывной работы",
                            inputType: "text",
                            unitOptions: [
                                { value: "min", label: "Минут" },
                                { value: "hour", label: "Часов" },
                            ],
                        }}
                        value={specs.workingTime}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("workingTime", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("workingTime"), onChange: () => toggleNameFeature("workingTime") }}
                    />

                    <div className="field-row field-row--options">
                        <label className="field-checkbox" title="Отобразить в наименовании модели">
                            <input
                                type="checkbox"
                                checked={nameFeatureCodes.includes("plugType")}
                                onChange={() => toggleNameFeature("plugType")}
                            />
                        </label>
                        <span className="info-icon" title="Выберите тип вилки или введите свой">ⓘ</span>
                        <span className="required-mark-slot" aria-hidden="true" />
                        <span className="field-name">Тип вилки</span>
                        <div className="option-group">
                            <input
                                type="text"
                                className="field-input option-custom-input"
                                placeholder="Введите значение"
                                value={specs.plugType?.value || ""}
                                onChange={(event) =>
                                    updateSpec("plugType", { value: event.target.value, customValue: "" })
                                }
                            />
                            {[
                                { value: "A", label: "A" },
                                { value: "B", label: "B" },
                                { value: "C", label: "C" },
                                { value: "D", label: "D" },
                                { value: "E", label: "E" },
                            ].map((option) => (
                                <button
                                    type="button"
                                    key={option.value}
                                    className={`option-btn ${specs.plugType?.value === option.value ? "option-btn--active" : ""}`}
                                    onClick={() =>
                                        updateSpec("plugType", { value: option.value, customValue: "" })
                                    }
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <CharacteristicRow
                        field={{
                            code: "voltage",
                            name: "Напряжение",
                            inputType: "choice",
                            options: [
                                { value: "5", label: "5 В" },
                                { value: "12", label: "12 В" },
                                { value: "24", label: "24 В" },
                                { value: "220", label: "220 В" },
                                { value: "380", label: "380 В" },
                            ],
                        }}
                        value={specs.voltage}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("voltage", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("voltage"), onChange: () => toggleNameFeature("voltage") }}
                    />

                    <CharacteristicRow
                        field={{ code: "frequency", name: "Частота", inputType: "text", unitLabel: "Гц" }}
                        value={specs.frequency}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("frequency", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("frequency"), onChange: () => toggleNameFeature("frequency") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "currentType",
                            name: "Род тока",
                            inputType: "choice",
                            options: [
                                { value: "dc", label: "Постоянный" },
                                { value: "ac", label: "Переменный" },
                            ],
                        }}
                        value={specs.currentType}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("currentType", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("currentType"), onChange: () => toggleNameFeature("currentType") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "phases",
                            name: "Число фаз",
                            inputType: "choice",
                            options: [
                                { value: "1", label: "1" },
                                { value: "3", label: "3" },
                            ],
                        }}
                        value={specs.phases}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("phases", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("phases"), onChange: () => toggleNameFeature("phases") }}
                    />

                    <h3 className="qw chars-subsection-title">Аккумулятор</h3>

                    <CharacteristicRow
                        field={{ code: "batteryCapacity", name: "Ёмкость", inputType: "text", unitLabel: "мА·ч" }}
                        value={specs.batteryCapacity}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("batteryCapacity", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("batteryCapacity"), onChange: () => toggleNameFeature("batteryCapacity") }}
                    />

                    <div className="field-row field-row--options">
                        <label className="field-checkbox" title="Отобразить в наименовании модели">
                            <input
                                type="checkbox"
                                checked={nameFeatureCodes.includes("batteryType")}
                                onChange={() => toggleNameFeature("batteryType")}
                            />
                        </label>
                        <span className="info-icon" title="Выберите тип элемента питания или введите свой">ⓘ</span>
                        <span className="required-mark-slot" aria-hidden="true" />
                        <span className="field-name">Тип элемента питания</span>
                        <div className="option-group">
                            <input
                                type="text"
                                className="field-input option-custom-input"
                                placeholder="Введите значение"
                                value={specs.batteryType?.value || ""}
                                onChange={(event) =>
                                    updateSpec("batteryType", { value: event.target.value, customValue: "" })
                                }
                            />
                            {[
                                { value: "AA", label: "AA" },
                                { value: "AAA", label: "AAA" },
                                { value: "PP3", label: "Крона (PP3, 9V)" },
                                { value: "CR2032", label: "CR2032" },
                                { value: "Li-Ion", label: "Li-Ion" },
                            ].map((option) => (
                                <button
                                    type="button"
                                    key={option.value}
                                    className={`option-btn ${specs.batteryType?.value === option.value ? "option-btn--active" : ""}`}
                                    onClick={() =>
                                        updateSpec("batteryType", { value: option.value, customValue: "" })
                                    }
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <CharacteristicRow
                        field={{
                            code: "removableBattery",
                            name: "Съёмный аккумулятор",
                            inputType: "choice",
                            options: [
                                { value: "yes", label: "Да" },
                                { value: "no", label: "Нет" },
                            ],
                        }}
                        value={specs.removableBattery}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("removableBattery", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("removableBattery"), onChange: () => toggleNameFeature("removableBattery") }}
                    />

                    <h3 className="qw chars-subsection-title">Мощность</h3>

                    <CharacteristicRow
                        field={{ code: "nominalPower", name: "Номинальная", inputType: "text", unitLabel: "Вт" }}
                        value={specs.nominalPower}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("nominalPower", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("nominalPower"), onChange: () => toggleNameFeature("nominalPower") }}
                    />

                    <CharacteristicRow
                        field={{ code: "maxPower", name: "Максимальная", inputType: "text", unitLabel: "Вт" }}
                        value={specs.maxPower}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("maxPower", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("maxPower"), onChange: () => toggleNameFeature("maxPower") }}
                    />
                </>
            );
        }

        // 9. Дисплей
        if (key === "display") {
            const displayFields = FALLBACK_SECTIONS.display.filter(
                (f) => f.code !== "resolution",
            );

            return (
                <>
                    {displayFields.map((field) => (
                        <CharacteristicRow
                            key={field.code}
                            field={field}
                            value={specs[field.code]}
                            unitGroups={catalog?.unitGroups}
                            onChange={(patch) => updateSpec(field.code, patch)}
                            checkbox={{ checked: nameFeatureCodes.includes(field.code), onChange: () => toggleNameFeature(field.code) }}
                        />
                    ))}

                    <div className="field-row field-row--options">
                        <label className="field-checkbox" title="Отобразить в наименовании модели">
                            <input
                                type="checkbox"
                                checked={nameFeatureCodes.includes("resolution")}
                                onChange={() => toggleNameFeature("resolution")}
                            />
                        </label>
                        <span className="info-icon" title="Выберите разрешение или введите своё">ⓘ</span>
                        <span className="required-mark-slot" aria-hidden="true" />
                        <span className="field-name">Разрешение</span>
                        <div className="option-group">
                            <input
                                type="text"
                                className="field-input option-custom-input"
                                placeholder="Введите значение"
                                value={specs.resolution?.value || ""}
                                onChange={(event) =>
                                    updateSpec("resolution", { value: event.target.value, customValue: "" })
                                }
                            />
                            {[
                                { value: "1280×720", label: "1280×720" },
                                { value: "1366×768", label: "1366×768" },
                                { value: "1600×900", label: "1600×900" },
                                { value: "1920×1080", label: "1920×1080" },
                                { value: "2560×1440", label: "2560×1440" },
                                { value: "2560×1600", label: "2560×1600" },
                                { value: "3840×2160", label: "3840×2160" },
                                { value: "3440×1440", label: "3440×1440" },
                            ].map((option) => (
                                <button
                                    type="button"
                                    key={option.value}
                                    className={`option-btn ${specs.resolution?.value === option.value ? "option-btn--active" : ""}`}
                                    onClick={() =>
                                        updateSpec("resolution", { value: option.value, customValue: "" })
                                    }
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            );
        }

        // 10. Системные компоненты
        if (key === "system") {
            return (
                <>
                    <h3 className="qw chars-subsection-title">Процессор</h3>

                    <div className="field-row field-row--options">
                        <label className="field-checkbox" title="Отобразить в наименовании модели">
                            <input
                                type="checkbox"
                                checked={nameFeatureCodes.includes("processorType")}
                                onChange={() => toggleNameFeature("processorType")}
                            />
                        </label>
                        <span className="info-icon" title="Выберите тип процессора или введите свой">ⓘ</span>
                        <span className="required-mark-slot" aria-hidden="true" />
                        <span className="field-name">Тип процессора</span>
                        <div className="option-group">
                            <input
                                type="text"
                                className="field-input option-custom-input"
                                placeholder="Введите значение"
                                value={specs.processorType?.value || ""}
                                onChange={(event) =>
                                    updateSpec("processorType", { value: event.target.value, customValue: "" })
                                }
                            />
                            {[
                                { value: "Intel Core i5", label: "Intel Core i5" },
                                { value: "Intel Core i7", label: "Intel Core i7" },
                                { value: "AMD Ryzen 5", label: "AMD Ryzen 5" },
                                { value: "AMD Ryzen 7", label: "AMD Ryzen 7" },
                                { value: "Apple M1", label: "Apple M1" },
                                { value: "Apple M2", label: "Apple M2" },
                                { value: "Qualcomm Snapdragon", label: "Qualcomm Snapdragon" },
                                { value: "MediaTek Dimensity", label: "MediaTek Dimensity" },
                                { value: "Samsung Exynos", label: "Samsung Exynos" },
                            ].map((option) => (
                                <button
                                    type="button"
                                    key={option.value}
                                    className={`option-btn ${specs.processorType?.value === option.value ? "option-btn--active" : ""}`}
                                    onClick={() =>
                                        updateSpec("processorType", { value: option.value, customValue: "" })
                                    }
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <CharacteristicRow
                        field={{
                            code: "cores",
                            name: "Количество ядер",
                            inputType: "choice",
                            options: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32, 64].map(
                                (v) => ({ value: String(v), label: String(v) }),
                            ),
                        }}
                        value={specs.cores}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("cores", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("cores"), onChange: () => toggleNameFeature("cores") }}
                    />

                    <h3 className="qw chars-subsection-title">Память</h3>

                    <CharacteristicRow
                        field={{ code: "ram", name: "Оперативная память", inputType: "text", unitLabel: "ГБ" }}
                        value={specs.ram}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("ram", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("ram"), onChange: () => toggleNameFeature("ram") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "storage",
                            name: "Встроенная память",
                            inputType: "text",
                            unitOptions: [
                                { value: "gb", label: "ГБ" },
                                { value: "tb", label: "ТБ" },
                            ],
                        }}
                        value={specs.storage}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("storage", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("storage"), onChange: () => toggleNameFeature("storage") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "memorySlot",
                            name: "Слот для карты памяти",
                            inputType: "choice",
                            options: [
                                { value: "yes", label: "Есть" },
                                { value: "no", label: "Нет" },
                            ],
                        }}
                        value={specs.memorySlot}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("memorySlot", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("memorySlot"), onChange: () => toggleNameFeature("memorySlot") }}
                    />

                    <h3 className="qw chars-subsection-title">Операционная система</h3>

                    <CharacteristicRow
                        field={{
                            code: "osType",
                            name: "Вид",
                            inputType: "choice",
                            options: [
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
                            ],
                        }}
                        value={specs.osType}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("osType", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("osType"), onChange: () => toggleNameFeature("osType") }}
                    />
                    <CharacteristicRow
                        field={{ code: "osVersion", name: "Версия", inputType: "text" }}
                        value={specs.osVersion}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("osVersion", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("osVersion"), onChange: () => toggleNameFeature("osVersion") }}
                    />

                    <h3 className="qw chars-subsection-title">Сим-карта</h3>

                    <CharacteristicRow
                        field={{
                            code: "simType",
                            name: "Вид",
                            inputType: "choice",
                            options: ["Mini-SIM", "Micro-SIM", "Nano-SIM", "eSIM"].map((v) => ({ value: v, label: v })),
                        }}
                        value={specs.simType}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("simType", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("simType"), onChange: () => toggleNameFeature("simType") }}
                    />

                    <CharacteristicRow
                        field={{
                            code: "simCount",
                            name: "Количество",
                            inputType: "choice",
                            options: [1, 2, 3, 4].map((v) => ({ value: String(v), label: String(v) })),
                        }}
                        value={specs.simCount}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("simCount", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("simCount"), onChange: () => toggleNameFeature("simCount") }}
                    />

                    <h3 className="qw chars-subsection-title">Камера</h3>

                    <h4 className="t t--with-icon" style={{ marginLeft: 0 }}>
                        Основная камера
                    </h4>

                    <CharacteristicRow
                        field={{ code: "mainCameras", name: "Количество основных камер", inputType: "text", unitLabel: "штук" }}
                        value={specs.mainCameras}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("mainCameras", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("mainCameras"), onChange: () => toggleNameFeature("mainCameras") }}
                    />

                    <CharacteristicRow
                        field={{ code: "mainCameraMp", name: "Количество мегапикселей основной камеры", inputType: "text", unitLabel: "Мп" }}
                        value={specs.mainCameraMp}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("mainCameraMp", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("mainCameraMp"), onChange: () => toggleNameFeature("mainCameraMp") }}
                    />

                    <CharacteristicRow
                        field={{ code: "cameraAngle", name: "Угол обзора объектива", inputType: "text", unitLabel: "°" }}
                        value={specs.cameraAngle}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("cameraAngle", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("cameraAngle"), onChange: () => toggleNameFeature("cameraAngle") }}
                    />

                    <CharacteristicRow
                        field={{ code: "digitalZoom", name: "Цифровой зум", inputType: "text", unitLabel: "х" }}
                        value={specs.digitalZoom}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("digitalZoom", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("digitalZoom"), onChange: () => toggleNameFeature("digitalZoom") }}
                    />

                    <h4 className="t t--with-icon" style={{ marginLeft: 0 }}>
                        Фронтальная камера
                    </h4>

                    <CharacteristicRow
                        field={{ code: "frontCameraMp", name: "Количество мегапикселей фронтальной камеры", inputType: "text", unitLabel: "Мп" }}
                        value={specs.frontCameraMp}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("frontCameraMp", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("frontCameraMp"), onChange: () => toggleNameFeature("frontCameraMp") }}
                    />

                    <h3 className="qw chars-subsection-title">Аудио</h3>

                    <CharacteristicRow
                        field={{ code: "speakers", name: "Количество динамиков", inputType: "text", unitLabel: "штук" }}
                        value={specs.speakers}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("speakers", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("speakers"), onChange: () => toggleNameFeature("speakers") }}
                    />

                    <CharacteristicRow
                        field={{ code: "audioPower", name: "Мощность", inputType: "text", unitLabel: "Вт" }}
                        value={specs.audioPower}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("audioPower", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("audioPower"), onChange: () => toggleNameFeature("audioPower") }}
                    />

                    <CharacteristicRow
                        field={{ code: "minFrequency", name: "Минимальная воспроизводимая частота", inputType: "text", unitLabel: "Гц" }}
                        value={specs.minFrequency}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("minFrequency", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("minFrequency"), onChange: () => toggleNameFeature("minFrequency") }}
                    />

                    <CharacteristicRow
                        field={{ code: "maxFrequency", name: "Максимальная воспроизводимая частота", inputType: "text", unitLabel: "Гц" }}
                        value={specs.maxFrequency}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("maxFrequency", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("maxFrequency"), onChange: () => toggleNameFeature("maxFrequency") }}
                    />

                    <h3 className="qw chars-subsection-title">Разъёмы</h3>

                    <CharacteristicRow
                        field={{
                            code: "portType",
                            name: "Тип порта",
                            inputType: "choice",
                            options: [
                                "USB Type-A", "USB Type-C", "Micro-USB", "HDMI",
                                "Jack 3.5 мм", "Lightning", "DisplayPort", "RJ-45",
                            ].map((v) => ({ value: v, label: v })),
                        }}
                        value={specs.portType}
                        unitGroups={catalog?.unitGroups}
                        onChange={(patch) => updateSpec("portType", patch)}
                        checkbox={{ checked: nameFeatureCodes.includes("portType"), onChange: () => toggleNameFeature("portType") }}
                    />
                </>
            );
        }

        // Fallback — разделы, у которых нет явного обработчика (6. Материал и состав)
        const fallback = FALLBACK_SECTIONS[key];
        if (fallback) {
            return (
                <>
                    {fallback.map((field) => (
                        <CharacteristicRow
                            key={field.code}
                            field={field}
                            value={specs[field.code]}
                            unitGroups={catalog?.unitGroups}
                            onChange={(patch) => updateSpec(field.code, patch)}
                            checkbox={{
                                checked: nameFeatureCodes.includes(field.code),
                                onChange: () => toggleNameFeature(field.code),
                            }}
                        />
                    ))}
                </>
            );
        }

        return (
            <p className="paragraph">
                Раздел пока не заполнен.
            </p>
        );
    };

    const visibleDocFields = getVisibleDocumentFields(product, requiredFields);
    const uploadedDocs = visibleDocFields
        .map(([name, label]) => ({ name, label, file: docs[name] }))
        .filter((item) => item.file);

    const requiredDocFields = visibleDocFields.filter(([name]) =>
        requiredFields.has(name),
    );
    const optionalDocFields = visibleDocFields.filter(
        ([name]) => !requiredFields.has(name),
    );

    const renderDocField = ([name, label, placeholder]) => (
        <div className="field" key={name}>
            <label className="label">{label}</label>
            <input
                type="file"
                ref={(element) => {
                    fileInputsRef.current[name] = element;
                }}
                onChange={(event) => handleDocFileChange(name, event)}
                style={{ display: "none" }}
            />
            <div
                className={`field-control${name === "warranty" ? " field-control--warranty" : ""}`}
            >
                {requiredFields.has(name) && (
                    <span className="required-mark">✱</span>
                )}
                <div className="file-input">
                    <input
                        type="text"
                        className="file-input__text"
                        value={docs[name] ? docs[name].name : ""}
                        placeholder={placeholder || label}
                        readOnly
                    />
                    {docs[name] && (
                        <button
                            type="button"
                            className="file-input__clear"
                            onClick={() => handleDocFileRemove(name)}
                            title="Удалить файл"
                        >
                            ✕
                        </button>
                    )}
                    <button
                        type="button"
                        className="file-input__clip"
                        onClick={() => fileInputsRef.current[name]?.click()}
                        title="Прикрепить файл"
                    >
                        📎
                    </button>
                </div>
                {name === "warranty" && (
                    <button type="button" className="template-btn">
                        Шаблон
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div
                className={`container add-page stage7-page stage24-page stage23-page${phase === "review" ? " stage23-page--review" : ""}`}
            >
                <h1 className="title">
                    {variantFillStageHeading(
                        7,
                        "Создание модели (параметра)",
                        product,
                        productId,
                    )}
                </h1>

                {!productId && (
                    <p className="form-error">
                        Откройте создание карточки с главной страницы.
                    </p>
                )}
                {error && <p className="form-error">{error}</p>}

                <h2 className="subtitle">Документы модели</h2>

                <div className="docs-tabs" role="tablist">
                    {requiredDocFields.length > 0 && (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={openDocsGroup === "required"}
                            className={`docs-tab ${openDocsGroup === "required" ? "docs-tab--active" : ""}`}
                            onClick={() => toggleDocsGroup("required")}
                        >
                            Обязательные для заполнения
                        </button>
                    )}

                    {optionalDocFields.length > 0 && (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={openDocsGroup === "optional"}
                            className={`docs-tab ${openDocsGroup === "optional" ? "docs-tab--active" : ""}`}
                            onClick={() => toggleDocsGroup("optional")}
                        >
                            Необязательные для заполнения
                        </button>
                    )}
                </div>

                {openDocsGroup === "required" && requiredDocFields.length > 0 && (
                    <div className="docs-body form">
                        {requiredDocFields.map(renderDocField)}
                    </div>
                )}

                {openDocsGroup === "optional" && optionalDocFields.length > 0 && (
                    <div className="docs-body form">
                        {optionalDocFields.map(renderDocField)}
                    </div>
                )}

                {uploadedDocs.length > 0 && (
                    <div className="uploaded-docs">
                        <h3 className="uploaded-docs__title">Загруженные документы</h3>
                        <div className="uploaded-docs__list">
                            {uploadedDocs.map(({ name, label, file }) => (
                                <div className="file-card-row" key={name}>
                                    <div className="file-card">
                                        <span className="file-card__icon">📄</span>
                                        <span className="file-card__name">{label}</span>
                                        <button
                                            type="button"
                                            className="file-card__remove"
                                            onClick={() => handleDocFileRemove(name)}
                                            title="Удалить"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <a
                                        className="file-card__download"
                                        href={file.url}
                                        download={file.name}
                                    >
                                        Скачать
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="matches-divider stage23-bundle-divider" />

                <h2 className="stage2-section-title">
                    Характеристики модели (параметра)
                </h2>

                {phase === "edit" ? (
                    <>
                        <div className="stage24-tabs" role="tablist">
                            {tabs.map((tab) => {
                                const active = charsPanelOpen && activeTab === tab.key;
                                const visited = visitedTabs.includes(tab.key);
                                const filled = tabFilledState({
                                    key: tab.key,
                                    visited,
                                    contentFilled: isCharacteristicsTabFilled(
                                        tab.key,
                                        charTabContext,
                                    ),
                                    requiresFill: characteristicsTabRequiresFill(
                                        tab.key,
                                        charTabContext,
                                    ),
                                });
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        className={tabClassName({ active, visited, filled })}
                                        onClick={() => selectTab(tab.key)}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            ref={logoInputRef}
                            onChange={handleLogoChange}
                            style={{ display: "none" }}
                        />

                        {charsPanelOpen && activeTab === "main" && (
                            <div className="form">
                                <h2 className="stage24-section-title">
                                    Технические, физические и функциональные характеристики модели
                                </h2>
                                <p className="stage23-subtitle-line">
                                    Ознакомьтесь с разделами и заполните значения характеристик, которые
                                    соответствуют модели (параметру).<br />
                                    Во время заполнения выберите 2 характеристики, которые будут
                                    отображаться в наименовании модели (параметра).
                                </p>

                                <p className="stage23-subtitle-line">
                                    Пример наименования модели (параметра):<br />
                                    Наименование линейки (Логотип + Тип продукта + Бренд + Линейка) + Модель
                                    + 1-я характеристика + 2-я характеристика.
                                </p>

                                <p className="stage23-subtitle-line stage23-namehint">
                                    <span className="field-checkbox field-checkbox--hint" aria-hidden="true">
                                        <input type="checkbox" checked readOnly tabIndex={-1} />
                                    </span>
                                    Отметьте галочкой характеристики — они попадут в
                                    наименование модели (параметра).
                                </p>

                                {CHARACTERISTIC_SECTIONS.map((section) => (
                                    <section className="chars-section" key={section.key}>
                                        <h3 className="chars-section__title">{section.label}</h3>
                                        <div className="chars-section__body">
                                            {renderSection(section.key)}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}

                        {charsPanelOpen && activeTab === "dimensions" && (
                            <div className="form">
                                <h2 className="stage24-section-title">Наименование модели</h2>
                                <p className="stage23-subtitle-line">
                                    Посмотрите наименование модели (параметра).
                                </p>

                                <div className="field-row">
                                    <span className="info-icon" title="Наименование модели">
                                        ⓘ
                                    </span>
                                    <span className="required-mark-slot" aria-hidden="true" />
                                    <span className="field-name">Наименование модели</span>
                                    <input
                                        type="text"
                                        className="field-input"
                                        value="Наименование линейки + Модель + 1 характеристика + 2 характеристика"
                                        readOnly
                                    />
                                </div>

                                <div className="field-row">
                                    <button
                                        type="button"
                                        title="Удалить"
                                        style={{
                                            width: 28,
                                            height: 28,
                                            border: "none",
                                            background: "transparent",
                                            color: "red",
                                            fontSize: 18,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: "50%",
                                            flexShrink: 0,
                                        }}
                                    >
                                        ✕
                                    </button>
                                    <span className="required-mark-slot" aria-hidden="true" />
                                    <span className="field-name">1 характеристика</span>
                                    <input
                                        type="text"
                                        className="field-input"
                                        placeholder="Введите значение"
                                        readOnly
                                    />
                                </div>

                                <div className="field-row">
                                    <button
                                        type="button"
                                        title="Удалить"
                                        style={{
                                            width: 28,
                                            height: 28,
                                            border: "none",
                                            background: "transparent",
                                            color: "red",
                                            fontSize: 18,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: "50%",
                                            flexShrink: 0,
                                        }}
                                    >
                                        ✕
                                    </button>
                                    <span className="required-mark-slot" aria-hidden="true" />
                                    <span className="field-name">2 характеристика</span>
                                    <input
                                        type="text"
                                        className="field-input"
                                        placeholder="Введите значение"
                                        readOnly
                                    />
                                </div>
                            </div>
                        )}

                        {charsPanelOpen && activeTab === "manufacturer" && (
                            <div className="form">
                                <h2 className="stage24-section-title">Фотографии модели</h2>
                                <p className="stage23-subtitle-line">
                                    Загрузите фотографии, которые соответствуют характеристикам модели
                                    (параметра) продукта.
                                </p>

                                <p>Требования к фотографиям:</p>
                                <p className="pBold standartOne">
                                    Фон: продукт на фотографии должен быть на белом фоне.
                                    <br /> Ракурс: продукт должен занимать 2/3 изображения.
                                    <br />
                                    Формат: JPG, PNG. <br /> Размер фотографий: <br /> минимальный - 1000
                                    X 1000 px <br />
                                    рекомендуемый - 1600 X 1600 px <br /> максимальный - 2560 X 1440 px
                                </p>
                                <p className="pBold">Пример правильного заполнения:</p>

                                <div className="presentation-images">
                                    <img
                                        src="/images/product-single-example1.png"
                                        alt="Пример: одно изделие — смартфон с двух ракурсов"
                                    />
                                    <img
                                        src="/images/product-single-example2.png"
                                        alt="Пример: одно изделие — стоматологический наконечник"
                                    />
                                </div>

                                {productId && !variationId && (
                                    <div className="stage14-gallery">
                                        <PhotoGallery productId={productId} role="product" />
                                    </div>
                                )}

                                {productId && variationId && (
                                    <>
                                        <h2
                                            className="subtitle"
                                            style={{ marginTop: 24, textAlign: "left" }}
                                        >
                                            Фотографии текущего варианта
                                        </h2>
                                        <div className="stage14-gallery">
                                            <PhotoGallery
                                                key={variationId}
                                                productId={productId}
                                                role="product"
                                                variationId={variationId}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {charsPanelOpen && activeTab === "garant" && (
                            <div className="form">
                                <h2 className="stage24-section-title">
                                    Гарантийные обязательства
                                </h2>
                                <p className="stage23-subtitle-line">
                                    Укажите гарантийный срок эксплуатации и срок службы продукта:
                                </p>

                                {WARRANTY_FIELDS.map((wf) => {
                                    const spec = specs[wf.code] || {
                                        value: "",
                                        customValue: "",
                                        unit: wf.defaultUnit,
                                    };
                                    return (
                                        <div
                                            className={`field-row ${wf.required ? "field-row--required" : ""}`}
                                            key={wf.code}
                                        >
                                            <span className="info-icon" title={wf.hint}>
                                                ⓘ
                                            </span>
                                            <span className="required-mark-slot">
                                                {wf.required && (
                                                    <span className="required-mark">✱</span>
                                                )}
                                            </span>
                                            <span className="field-name">{wf.name}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                className="field-input"
                                                placeholder="Введите число"
                                                value={spec.value || ""}
                                                onChange={(event) =>
                                                    updateSpec(wf.code, { value: event.target.value })
                                                }
                                            />
                                            <select
                                                className="field-select"
                                                value={spec.unit || wf.defaultUnit}
                                                onChange={(event) =>
                                                    updateSpec(wf.code, { unit: event.target.value })
                                                }
                                            >
                                                {TIME_UNITS.map((u) => (
                                                    <option key={u.value} value={u.value}>
                                                        {u.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {charsPanelOpen && activeTab === "tech" && (
                            <div className="form">
                                <h2 className="stage24-section-title">
                                    Технические характеристики
                                </h2>
                                <p className="stage23-subtitle-line">
                                    Заполните технические характеристики продукта:
                                </p>

                                {techGroups.length === 0 && techCustomFields.length === 0 && (
                                    <p className="paragraph">
                                        Для выбранной категории технические характеристики не
                                        заданы.
                                    </p>
                                )}
                                {techGroups.map((group) => (
                                    <div key={group.name}>
                                        <h3 className="subtitle subtitle--spaced">{group.name}</h3>
                                        {renderFields(group.fields)}
                                    </div>
                                ))}
                                {techCustomFields.length > 0 && (
                                    <div>
                                        {techGroups.length > 0 && (
                                            <h3 className="subtitle subtitle--spaced">
                                                Добавленные характеристики
                                            </h3>
                                        )}
                                        {techCustomFields.map((field) => {
                                            const units = allUnitOptions(catalog?.unitGroups);
                                            const known = new Set(units.map((item) => item.value));
                                            const currentUnit = String(
                                                techCustomUnits[field.code] || field.unit || "",
                                            ).trim();
                                            const unitMode =
                                                currentUnit && !known.has(currentUnit)
                                                    ? "other"
                                                    : "preset";
                                            return (
                                                <div
                                                    className="field-row field-row--tech-custom"
                                                    key={field.code}
                                                >
                                                    <span className="info-icon" title="Подсказка">
                                                        ⓘ
                                                    </span>
                                                    <span className="required-mark-slot" aria-hidden="true" />
                                                    <span className="field-name">{field.name}</span>
                                                    <div className="tech-custom-control">
                                                        <input
                                                            type="text"
                                                            className="field-input"
                                                            placeholder="Значение"
                                                            value={techCustomValues[field.code] || ""}
                                                            onChange={(event) =>
                                                                setTechCustomValues((prev) => ({
                                                                    ...prev,
                                                                    [field.code]: event.target.value,
                                                                }))
                                                            }
                                                        />
                                                        <select
                                                            className="field-select"
                                                            value={unitMode === "other" ? "other" : currentUnit}
                                                            onChange={(event) => {
                                                                const next = event.target.value;
                                                                if (next === "other") {
                                                                    setTechCustomUnits((prev) => ({
                                                                        ...prev,
                                                                        [field.code]:
                                                                            currentUnit && !known.has(currentUnit)
                                                                                ? currentUnit
                                                                                : "",
                                                                    }));
                                                                    return;
                                                                }
                                                                setTechCustomUnits((prev) => ({
                                                                    ...prev,
                                                                    [field.code]: next,
                                                                }));
                                                            }}
                                                        >
                                                            <option value="">Единица измерения</option>
                                                            {units.map((unit) => (
                                                                <option key={unit.value} value={unit.value}>
                                                                    {unit.label}
                                                                </option>
                                                            ))}
                                                            <option value="other">Иное</option>
                                                        </select>
                                                        {unitMode === "other" && (
                                                            <input
                                                                type="text"
                                                                className="field-input tech-custom-control__unit"
                                                                placeholder="Своя единица"
                                                                value={currentUnit}
                                                                onChange={(event) =>
                                                                    setTechCustomUnits((prev) => ({
                                                                        ...prev,
                                                                        [field.code]: event.target.value,
                                                                    }))
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {charsPanelOpen && activeTab === "custom" && (
                            <div className="form">
                                <h2 className="stage24-section-title">
                                    Добавьте характеристики
                                </h2>
                                <p className="stage23-subtitle-line">
                                    Заполните наименование характеристики, ее значение и
                                    выберите единицу измерения:
                                </p>

                                <CustomCharacteristicsBlock
                                    rows={customRows}
                                    unitGroups={catalog?.unitGroups}
                                    onChange={setCustomRows}
                                />
                            </div>
                        )}

                        {charsPanelOpen && activeTab === "review" && (
                            <div className="form">
                                <h2 className="stage24-section-title">
                                    Просмотр заполненных характеристик
                                </h2>
                                <p className="stage23-subtitle-line">
                                    Проверьте значения перед отправкой:
                                </p>

                                {(() => {
                                    const rows = [];
                                    const brandField = mainFields.find((f) => f.code === "brand");
                                    if (brandField) {
                                        const text = formatSpecValue(
                                            brandField,
                                            specs[brandField.code],
                                            catalog?.unitGroups,
                                        );
                                        if (text) {
                                            rows.push({
                                                label: FIELD_LABELS[brandField.code] || brandField.name,
                                                value: text,
                                            });
                                        }
                                    }
                                    if (logo) {
                                        rows.push({
                                            label: "Логотип",
                                            value: logo.name,
                                            isImage: true,
                                            imageUrl: logo.url,
                                        });
                                    }
                                    if (productLine?.trim()) {
                                        rows.push({
                                            label: "Линейка продукции",
                                            value: productLine.trim(),
                                        });
                                    }
                                    for (const field of mainFieldsOrder(mainFields)) {
                                        if (field.code === "brand") continue;
                                        const text = formatSpecValue(
                                            field,
                                            specs[field.code],
                                            catalog?.unitGroups,
                                        );
                                        if (text) {
                                            rows.push({
                                                label: FIELD_LABELS[field.code] || field.name,
                                                value: text,
                                            });
                                        }
                                    }
                                    for (const field of weightFields) {
                                        const text = formatSpecValue(
                                            field,
                                            specs[field.code],
                                            catalog?.unitGroups,
                                        );
                                        if (text) {
                                            rows.push({
                                                label: FIELD_LABELS[field.code] || field.name,
                                                value: text,
                                            });
                                        }
                                    }
                                    if (rows.length === 0) return null;
                                    return (
                                        <div className="review-block">
                                            <h3 className="subtitle subtitle--spaced">Основные</h3>
                                            <div className="review-list">
                                                {rows.map((row, i) => (
                                                    <div className="review-row" key={i}>
                                                        <span className="review-row__label">
                                                            {row.label}
                                                        </span>
                                                        <span className="review-row__value">
                                                            {row.isImage ? (
                                                                <img
                                                                    src={row.imageUrl}
                                                                    alt={row.value}
                                                                    className="review-row__img"
                                                                />
                                                            ) : (
                                                                row.value
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {(() => {
                                    const rows = [];
                                    for (const field of dimensionsGroup?.fields || []) {
                                        const text = formatSpecValue(
                                            field,
                                            specs[field.code],
                                            catalog?.unitGroups,
                                        );
                                        if (text) {
                                            rows.push({
                                                label: FIELD_LABELS[field.code] || field.name,
                                                value: text,
                                            });
                                        }
                                    }
                                    for (const field of weightFields) {
                                        const text = formatSpecValue(
                                            field,
                                            specs[field.code],
                                            catalog?.unitGroups,
                                        );
                                        if (text) {
                                            rows.push({
                                                label: FIELD_LABELS[field.code] || field.name,
                                                value: text,
                                            });
                                        }
                                    }
                                    if (rows.length === 0) return null;
                                    return (
                                        <div className="review-block">
                                            <h3 className="subtitle subtitle--spaced">
                                                Габаритные размеры и вес
                                            </h3>
                                            <div className="review-list">
                                                {rows.map((row, i) => (
                                                    <div className="review-row" key={i}>
                                                        <span className="review-row__label">
                                                            {row.label}
                                                        </span>
                                                        <span className="review-row__value">
                                                            {row.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {(() => {
                                    const rows = [];
                                    for (const field of (manufacturerGroup?.fields || []).filter(
                                        (f) =>
                                            f.code !== "brand" &&
                                            f.code !== "warranty" &&
                                            f.code !== "warrantyPeriod" &&
                                            f.code !== "serviceLife",
                                    )) {
                                        const text = formatSpecValue(
                                            field,
                                            specs[field.code],
                                            catalog?.unitGroups,
                                        );
                                        if (text) {
                                            rows.push({
                                                label: FIELD_LABELS[field.code] || field.name,
                                                value: text,
                                            });
                                        }
                                    }
                                    if (rows.length === 0) return null;
                                    return (
                                        <div className="review-block">
                                            <h3 className="subtitle subtitle--spaced">
                                                Производитель
                                            </h3>
                                            <div className="review-list">
                                                {rows.map((row, i) => (
                                                    <div className="review-row" key={i}>
                                                        <span className="review-row__label">
                                                            {row.label}
                                                        </span>
                                                        <span className="review-row__value">
                                                            {row.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {(() => {
                                    const rows = [];
                                    for (const wf of WARRANTY_FIELDS) {
                                        const spec = specs[wf.code];
                                        if (!spec || !String(spec.value || "").trim()) continue;
                                        const unitLabel =
                                            TIME_UNITS.find(
                                                (u) => u.value === (spec.unit || wf.defaultUnit),
                                            )?.label || "";
                                        rows.push({
                                            label: wf.name,
                                            value: `${String(spec.value).trim()} ${unitLabel}`.trim(),
                                        });
                                    }
                                    if (rows.length === 0) return null;
                                    return (
                                        <div className="review-block">
                                            <h3 className="subtitle subtitle--spaced">
                                                Гарантийные обязательства
                                            </h3>
                                            <div className="review-list">
                                                {rows.map((row, i) => (
                                                    <div className="review-row" key={i}>
                                                        <span className="review-row__label">
                                                            {row.label}
                                                        </span>
                                                        <span className="review-row__value">
                                                            {row.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {(() => {
                                    const rows = [];
                                    for (const group of techGroups) {
                                        for (const field of group.fields) {
                                            const text = formatSpecValue(
                                                field,
                                                specs[field.code],
                                                catalog?.unitGroups,
                                            );
                                            if (text) {
                                                rows.push({
                                                    label: FIELD_LABELS[field.code] || field.name,
                                                    value: text,
                                                    group: group.name,
                                                });
                                            }
                                        }
                                    }
                                    for (const field of techCustomFields) {
                                        const text = displayCustomCharacteristic(
                                            {
                                                customValue: String(
                                                    techCustomValues[field.code] || "",
                                                ).trim(),
                                                unit: String(
                                                    techCustomUnits[field.code] || field.unit || "",
                                                ).trim(),
                                            },
                                            catalog?.unitGroups,
                                        );
                                        if (text) {
                                            rows.push({
                                                label: field.name,
                                                value: text,
                                            });
                                        }
                                    }
                                    if (rows.length === 0) return null;
                                    return (
                                        <div className="review-block">
                                            <h3 className="subtitle subtitle--spaced">
                                                Технические характеристики
                                            </h3>
                                            <div className="review-list">
                                                {rows.map((row, i) => (
                                                    <div className="review-row" key={i}>
                                                        <span className="review-row__label">
                                                            {row.label}
                                                        </span>
                                                        <span className="review-row__value">
                                                            {row.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {(() => {
                                    const filled = (customRows || []).filter((row) => {
                                        const name = (row.name || "").trim();
                                        const value = (row.value || "").trim();
                                        return name && value;
                                    });
                                    if (filled.length === 0) return null;
                                    return (
                                        <div className="review-block">
                                            <h3 className="subtitle subtitle--spaced">
                                                Дополнительные характеристики
                                            </h3>
                                            <div className="review-list">
                                                {filled.map((row, i) => {
                                                    const valueText = formatCustomRowDisplay(
                                                        row,
                                                        catalog?.unitGroups,
                                                    );
                                                    return (
                                                        <div className="review-row" key={i}>
                                                            <span className="review-row__label">
                                                                {row.name}
                                                            </span>
                                                            <span className="review-row__value">
                                                                {valueText}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {specs &&
                                    Object.values(specs).every(
                                        (v) => !v?.value?.trim() && !v?.customValue?.trim(),
                                    ) &&
                                    (!customRows || customRows.length === 0) &&
                                    !logo &&
                                    !productLine?.trim() && (
                                        <p className="paragraph">
                                            Пока ничего не заполнено. Вернитесь на предыдущие вкладки
                                            и заполните характеристики.
                                        </p>
                                    )}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <h2 className="subtitleOne subtitle--spaced">
                            Заполните характеристики продукта:
                        </h2>
                        <p className="stage24-hint">
                            Проверьте заполненные характеристики перед переходом к описанию.
                        </p>
                        <div className="form descriptionM">
                            <input
                                type="file"
                                accept="image/*"
                                ref={logoInputRef}
                                onChange={handleLogoChange}
                                style={{ display: "none" }}
                            />
                            {groups.map((group) => (
                                <div key={group.name}>
                                    <h3 className="subtitle subtitle--spaced group-title">
                                        {group.name}
                                    </h3>
                                    {group.name === "Габариты" && (
                                        <DimensionsGroup
                                            fields={group.fields}
                                            specs={specs}
                                            unitOptions={catalog?.unitGroups?.dimension || []}
                                            onChange={updateSpec}
                                        />
                                    )}
                                    {group.name === "Основные" && (
                                        <>
                                            {mainFields
                                                .filter((field) => field.code === "brand")
                                                .map((field) => (
                                                    <CharacteristicRow
                                                        key={field.code}
                                                        field={field}
                                                        value={specs[field.code]}
                                                        unitGroups={catalog?.unitGroups}
                                                        onChange={(patch) => updateSpec(field.code, patch)}
                                                    />
                                                ))}
                                            <div className="field-row field-row--logo">
                                                <span className="info-icon" title="Подсказка">
                                                    ⓘ
                                                </span>
                                                <span className="required-mark-slot" aria-hidden="true" />
                                                <span className="field-name">Логотип</span>
                                                {logo ? (
                                                    <div className="field-input field-input--file field-input--has-file">
                                                        <img
                                                            src={logo.url}
                                                            alt="Логотип"
                                                            className="file-preview"
                                                        />
                                                        <span className="file-text">{logo.name}</span>
                                                        <button
                                                            type="button"
                                                            className="file-remove"
                                                            onClick={handleLogoRemove}
                                                            title="Удалить"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="field-input field-input--file"
                                                        onClick={() => logoInputRef.current?.click()}
                                                    >
                                                        <span className="file-icon">📎</span>
                                                        <span className="file-text">
                                                            Загрузить фотографию
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="field-row product-line-row">
                                                <span className="info-icon" title="Подсказка">
                                                    ⓘ
                                                </span>
                                                <span className="required-mark-slot" aria-hidden="true" />
                                                <span className="field-name">Линейка продукции</span>
                                                <div className="product-line-control">
                                                    <input
                                                        type="text"
                                                        className="field-input"
                                                        placeholder="Линейка продукции"
                                                        value={productLine}
                                                        onChange={(event) => setProductLine(event.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            {renderFields(
                                                mainFieldsOrder(
                                                    mainFields.filter((field) => field.code !== "brand"),
                                                ),
                                            )}
                                            {renderFields(weightFields)}
                                        </>
                                    )}
                                    {group.name !== "Основные" &&
                                        renderFields(
                                            group.fields.filter(
                                                (field) =>
                                                    group.name !== "Габаритные размеры" ||
                                                    !DIMENSION_CODES.includes(field.code),
                                            ),
                                        )}
                                </div>
                            ))}
                            <CustomCharacteristicsBlock
                                rows={customRows}
                                unitGroups={catalog?.unitGroups}
                                onChange={setCustomRows}
                            />
                        </div>
                    </>
                )}

                <p className="modal-sheet__subhint nm"></p>

                {showCustomVariantSetup && (
                    <>
                        <div className="matches-divider stage23-bundle-divider" />
                        <Stage25
                            ref={axisRef}
                            embedded
                            refreshKey={charsRefreshKey}
                            onSelectionChange={handleAxisSelectionChange}
                            onNameOptionsChange={handleNameOptionsChange}
                        />
                        <div className="matches-divider stage23-bundle-divider" />
                        <Stage26 ref={nameRef} embedded previewOptions={nameOptions} />
                    </>
                )}

                <div className="matches-divider stage23-bundle-divider" />
                <Stage24
                    ref={descriptionRef}
                    embedded
                    contentOpen={panelFocus === "description" || panelFocus === "both"}
                    openDescriptionTick={openDescriptionTick}
                    onContentOpenChange={handleDescriptionOpenChange}
                    onDescriptionInteract={closeCharacteristicsForDescription}
                />
            </div>

            <BottomBar
                current={fillProgressStep(7, product, productId)}
                total={fillProgressTotal(product, productId) || VARIANT_FILL_STAGE_COUNT}
                prevPath="/stage22"
                nextPath="/stage22"
                onSave={async () => {
                    await persist();
                    setCharsRefreshKey((prev) => prev + 1);
                    let savedVariationId = variationId;
                    if (showCustomVariantSetup && axisPreview.length > 0) {
                        savedVariationId =
                            (await axisRef.current?.save?.()) || savedVariationId;
                        if (savedVariationId && productId) {
                            const next = new URLSearchParams(location.search);
                            next.set("id", productId);
                            next.set("variationId", savedVariationId);
                            navigate(
                                { pathname: location.pathname, search: `?${next.toString()}` },
                                { replace: true },
                            );
                        }
                        await nameRef.current?.save?.(savedVariationId);
                    }
                    await descriptionRef.current?.save?.();
                }}
            />
        </>
    );
});

export default Add;