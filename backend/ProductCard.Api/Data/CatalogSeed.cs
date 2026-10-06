using Microsoft.EntityFrameworkCore;
using ProductCard.Api.Models;

namespace ProductCard.Api.Data;

public static class CatalogSeed
{
    private sealed record FieldSpec(
        string Code,
        string InputType,
        bool AllowCustom,
        string? UnitGroup,
        (string Value, string Label)[] Options);

    public static void Seed(AppDbContext db)
    {
        DropIncreasing(db);
        ImportWarehouses(db);

        if (db.ProductKinds.Any())
        {
            EnsureAerosolFields(db);
            EnsureHandpieceSubtypes(db);
            EnsureOtherKind(db);
            return;
        }

        var handpieces = new ProductCategory
        {
            Id = Guid.NewGuid(),
            Code = "handpieces",
            Name = "Стоматологические наконечники",
            SortOrder = 1
        };
        var aerosols = new ProductCategory
        {
            Id = Guid.NewGuid(),
            Code = "aerosols",
            Name = "Аэрозольная продукция",
            SortOrder = 2
        };
        db.ProductCategories.AddRange(handpieces, aerosols);

        var kinds = new Dictionary<string, ProductKind>
        {
            ["contra_angle_increasing"] = Kind(handpieces, "contra_angle_increasing", "Повышающий", 1),
            ["contra_angle_decreasing"] = Kind(handpieces, "contra_angle_decreasing", "Понижающий", 2),
            ["contra_angle_1_1"] = Kind(handpieces, "contra_angle_1_1", "1:1", 3),
            ["straight_increasing"] = Kind(handpieces, "straight_increasing", "Повышающий", 4),
            ["straight_1_1"] = Kind(handpieces, "straight_1_1", "1:1", 5),
            ["turbine"] = Kind(handpieces, "turbine", "Турбинный наконечник", 6),
            ["other"] = Kind(handpieces, "other", "Иное", 7),
            ["lubricant"] = Kind(aerosols, "lubricant", "Масло для смазки", 1),
            ["cleaner"] = Kind(aerosols, "cleaner", "Очиститель", 2)
        };
        db.ProductKinds.AddRange(kinds.Values);

        var definitions = Definitions();
        db.CharacteristicDefinitions.AddRange(definitions.Values);
        db.SaveChanges();

        var links = new List<ProductKindCharacteristic>();
        links.AddRange(Links(kinds["contra_angle_increasing"], definitions, ContraIncreasingFields()));
        links.AddRange(Links(kinds["contra_angle_decreasing"], definitions, ContraDecreasingFields()));
        links.AddRange(Links(kinds["contra_angle_1_1"], definitions, Contra11Fields()));
        links.AddRange(Links(kinds["straight_increasing"], definitions, StraightIncreasingFields()));
        links.AddRange(Links(kinds["straight_1_1"], definitions, Straight11Fields()));
        links.AddRange(Links(kinds["turbine"], definitions, TurbineFields()));
        links.AddRange(Links(kinds["other"], definitions, CommonFields()));
        links.AddRange(Links(kinds["lubricant"], definitions, AerosolFields()));
        links.AddRange(Links(kinds["cleaner"], definitions, AerosolFields()));

        db.ProductKindCharacteristics.AddRange(links);
        db.SaveChanges();
    }

    private static void DropIncreasing(AppDbContext db)
    {
        var kind = db.ProductKinds.FirstOrDefault(item => item.Code == "increasing");
        if (kind == null)
            return;

        var products = db.Products.Where(product => product.ProductKindId == kind.Id).ToList();
        foreach (var product in products)
        {
            product.ProductKindId = null;
            if (product.CategoryPath != null && product.CategoryPath.Contains("Повышающий"))
                product.CategoryPath = null;
        }

        db.SaveChanges();
        db.ProductKinds.Remove(kind);
        db.SaveChanges();
    }

    private static ProductKind Kind(ProductCategory category, string code, string name, int sort) => new()
    {
        Id = Guid.NewGuid(),
        CategoryId = category.Id,
        Code = code,
        Name = name,
        SortOrder = sort
    };

    private static Dictionary<string, CharacteristicDefinition> Definitions()
    {
        (string Code, string Name, string Group, int GroupOrder, int Sort)[] rows =
        [
            ("model", "Модель", "Основные", 1, 1),
            ("article", "Артикул", "Основные", 1, 2),
            ("weight", "Вес", "Основные", 1, 3),
            ("weightTolerance", "Погрешность веса", "Основные", 1, 4),
            ("length", "Длина", "Габариты", 2, 1),
            ("width", "Ширина", "Габариты", 2, 2),
            ("height", "Высота", "Габариты", 2, 3),
            ("brand", "Бренд", "Производитель", 3, 1),
            ("manufacturer", "Производитель", "Производитель", 3, 2),
            ("country", "Страна производства", "Производитель", 3, 3),
            ("gearRatio", "Передаточное отношение", "Технические характеристики", 4, 1),
            ("quickConnect", "Тип подключения к быстросъемному соединению", "Технические характеристики", 4, 1),
            ("headAngle", "Угол наклона головки", "Технические характеристики", 4, 2),
            ("maxSpeed", "Максимальная скорость (об/мин)", "Технические характеристики", 4, 3),
            ("light", "Свет", "Освещение", 5, 1),
            ("lightSource", "Источник света", "Освещение", 5, 2),
            ("coolingType", "Тип охлаждения", "Система охлаждения", 6, 1),
            ("sprayPoints", "Количество точек спрея", "Система охлаждения", 6, 2),
            ("burLock", "Механизм фиксации бора", "Механические характеристики", 7, 1),
            ("motorConnection", "Тип соединения с микромотором", "Механические характеристики", 7, 2),
            ("headSize", "Размер головки", "Головка", 8, 1),
            ("bodyMaterial", "Материал корпуса", "Материал", 9, 1),
            ("bodyCoating", "Покрытие корпуса", "Материал", 9, 2),
            // ("warranty", "Гарантия производителя", "Гарантия", 10, 1),
            ("agentType", "Тип средства", "Средство", 4, 1),
            ("connectionType", "Тип соединения", "Средство", 4, 2),
            ("volume", "Объём", "Средство", 4, 3)
        ];

        return rows.ToDictionary(
            row => row.Code,
            row => new CharacteristicDefinition
            {
                Id = Guid.NewGuid(),
                Code = row.Code,
                Name = row.Name,
                GroupName = row.Group,
                GroupOrder = row.GroupOrder,
                SortOrder = row.Sort
            });
    }

    private static FieldSpec Text(string code) =>
        new(code, "text", false, null, Array.Empty<(string, string)>());

    private static FieldSpec Measure(string code, string unitGroup) =>
        new(code, "text", false, unitGroup, Array.Empty<(string, string)>());

    private static FieldSpec Choice(string code, bool allowCustom, params (string Value, string Label)[] options) =>
        new(code, "choice", allowCustom, null, options);

    private static FieldSpec[] AerosolOnlyFields() =>
    [
        Choice("agentType", false, ("oil", "Масло"), ("cleaner", "Очиститель")),
        Choice("connectionType", true, ("thread", "Резьба")),
        Choice("volume", true, ("650", "650 мл"), ("800", "800 мл"))
    ];

    private static FieldSpec[] AerosolFields() =>
    [
        ..CommonFields(),
        ..AerosolOnlyFields()
    ];

    private static void EnsureAerosolFields(AppDbContext db)
    {
        (string Code, string Name, int Sort)[] rows =
        [
            ("agentType", "Тип средства", 1),
            ("connectionType", "Тип соединения", 2),
            ("volume", "Объём", 3)
        ];
        foreach (var row in rows)
        {
            if (db.CharacteristicDefinitions.Any(item => item.Code == row.Code))
                continue;
            db.CharacteristicDefinitions.Add(new CharacteristicDefinition
            {
                Id = Guid.NewGuid(),
                Code = row.Code,
                Name = row.Name,
                GroupName = "Средство",
                GroupOrder = 4,
                SortOrder = row.Sort
            });
        }

        db.SaveChanges();
        var definitions = db.CharacteristicDefinitions
            .Where(item => rows.Select(row => row.Code).Contains(item.Code))
            .ToDictionary(item => item.Code);

        foreach (var kindCode in new[] { "lubricant", "cleaner" })
        {
            var kind = db.ProductKinds.FirstOrDefault(item => item.Code == kindCode);
            if (kind == null || definitions.Count < rows.Length)
                continue;
            var linked = db.ProductKindCharacteristics
                .Where(item => item.ProductKindId == kind.Id)
                .Select(item => item.CharacteristicDefinitionId)
                .ToHashSet();
            var order = db.ProductKindCharacteristics.Count(item => item.ProductKindId == kind.Id);
            foreach (var spec in AerosolOnlyFields())
            {
                var definition = definitions[spec.Code];
                if (linked.Contains(definition.Id))
                    continue;
                order++;
                var links = Links(kind, definitions, [spec]).ToList();
                foreach (var link in links)
                    link.SortOrder = order;
                db.ProductKindCharacteristics.AddRange(links);
            }
        }

        EnsureVolumeAllowCustom(db);
        db.SaveChanges();
    }

    private static void EnsureVolumeAllowCustom(AppDbContext db)
    {
        var volumeDef = db.CharacteristicDefinitions.FirstOrDefault(item => item.Code == "volume");
        if (volumeDef == null)
            return;

        var links = db.ProductKindCharacteristics
            .Where(item => item.CharacteristicDefinitionId == volumeDef.Id && !item.AllowCustom)
            .ToList();
        foreach (var link in links)
            link.AllowCustom = true;
    }

    private static void ImportWarehouses(AppDbContext db)
    {
        var warehouses = db.Warehouses.ToList();
        var points = db.ShipmentPoints.Where(item => item.VariationId == null).OrderBy(item => item.SortOrder).ToList();
        foreach (var point in points)
        {
            if (point.WarehouseId != null && warehouses.Any(item => item.Id == point.WarehouseId))
                continue;
            var key = (point.AddressLine ?? "").Trim();
            var warehouse = warehouses.FirstOrDefault(item => item.AddressLine == key);
            if (warehouse == null && !string.IsNullOrWhiteSpace(key))
            {
                warehouse = new Warehouse
                {
                    Id = Guid.NewGuid(),
                    Name = point.Name,
                    PostalCode = point.PostalCode,
                    Region = point.Region,
                    City = point.City,
                    Street = point.Street,
                    House = point.House,
                    Office = point.Office,
                    AddressLine = point.AddressLine ?? "",
                    SortOrder = warehouses.Count + 1
                };
                db.Warehouses.Add(warehouse);
                warehouses.Add(warehouse);
            }

            if (warehouse != null)
                point.WarehouseId = warehouse.Id;
        }

        db.SaveChanges();
    }

    private static FieldSpec[] CommonFields() =>
    [
        Text("model"),
        Text("article"),
        Measure("weight", "weight"),
        Measure("weightTolerance", "tolerance"),
        Measure("length", "dimension"),
        Measure("width", "dimension"),
        Measure("height", "dimension"),
        Text("brand"),
        Text("manufacturer"),
        Text("country")
    ];

    private static FieldSpec[] ContraBodyFields() =>
    [
        ..CommonFields(),
        Choice("maxSpeed", true, ("40000", "40 000"), ("200000", "200 000"), ("10000", "10 000")),
        Choice("light", false, ("yes", "Есть"), ("no", "Нет")),
        Choice("lightSource", false, ("fiber", "Световод"), ("led", "Светодиод")),
        Choice("coolingType", false, ("inner", "Внутренний"), ("outer", "Внешний"), ("combined", "Комбинированный")),
        Choice("sprayPoints", false,
            ("1", "1-точечный"),
            ("2", "2-точечный"),
            ("3", "3-точечный"),
            ("4", "4-точечный"),
            ("5", "5-точечный")),
        Choice("burLock", false, ("button", "Кнопочный зажим"), ("collet", "Цанговый зажим")),
        Choice("motorConnection", true, ("e-type", "Е-тип")),
        Choice("headSize", true, ("standard", "Стандартная"), ("mini", "Мини")),
        Choice("bodyMaterial", true,
            ("steel", "Нержавеющая сталь"),
            ("brass", "Латунь"),
            ("titanium", "Титан")),
        Choice("bodyCoating", true, ("chrome", "Хром")),
        // Choice("warranty", true, ("6", "6 месяцев"), ("12", "12 месяцев"))
    ];

    private static FieldSpec[] ContraIncreasingFields() =>
    [
        ..ContraBodyFields(),
        Choice("gearRatio", true,
            ("1:2", "1:2"),
            ("1:4", "1:4"),
            ("1:4.5", "1:4,5"),
            ("1:5", "1:5"),
            ("1:10", "1:10"))
    ];

    private static FieldSpec[] ContraDecreasingFields() =>
    [
        ..ContraBodyFields(),
        Choice("gearRatio", true,
            ("4:1", "4:1"),
            ("5:1", "5:1"),
            ("6:1", "6:1"),
            ("10:1", "10:1"),
            ("16:1", "16:1"),
            ("20:1", "20:1"))
    ];

    private static FieldSpec[] Contra11Fields() =>
    [
        ..ContraBodyFields(),
        Choice("gearRatio", true, ("1:1", "1:1"))
    ];

    private static FieldSpec[] StraightIncreasingFields() =>
    [
        ..ContraBodyFields(),
        Choice("gearRatio", true, ("1:2", "1:2"))
    ];

    private static FieldSpec[] Straight11Fields() =>
    [
        ..ContraBodyFields(),
        Choice("gearRatio", true, ("1:1", "1:1"))
    ];

    private static FieldSpec[] TurbineFields() =>
    [
        ..CommonFields(),
        Choice("quickConnect", false,
            ("nsk", "NSK"),
            ("kavo", "KaVo MULTIflex"),
            ("midwest", "Midwest M4")),
        Choice("headAngle", false, ("90", "90"), ("45", "45")),
        Choice("light", false, ("yes", "Есть"), ("no", "Нет")),
        Choice("lightSource", false, ("fiber", "Световод"), ("led", "Светодиод")),
        Choice("coolingType", false, ("inner", "Внутренний"), ("outer", "Внешний"), ("combined", "Комбинированный")),
        Choice("sprayPoints", false,
            ("1", "1-точечный"),
            ("2", "2-точечный"),
            ("3", "3-точечный"),
            ("4", "4-точечный"),
            ("5", "5-точечный")),
        Text("maxSpeed"),
        Choice("burLock", false, ("button", "Кнопочный зажим"), ("collet", "Цанговый зажим")),
        Choice("headSize", true, ("standard", "Стандартная"), ("mini", "Мини")),
        Choice("bodyMaterial", true,
            ("steel", "Нержавеющая сталь"),
            ("brass", "Латунь"),
            ("titanium", "Титан")),
        Choice("bodyCoating", true, ("chrome", "Хром")),
        // Choice("warranty", true, ("6", "6 месяцев"), ("12", "12 месяцев"))
    ];

    private static void EnsureHandpieceSubtypes(AppDbContext db)
    {
        var handpieces = db.ProductCategories.FirstOrDefault(item => item.Code == "handpieces");
        if (handpieces == null)
            return;

        var definitions = db.CharacteristicDefinitions.ToDictionary(item => item.Code);
        if (!definitions.ContainsKey("gearRatio"))
            return;

        (string Code, string Name, int Sort, FieldSpec[] Fields)[] subtypes =
        [
            ("contra_angle_increasing", "Повышающий", 1, ContraIncreasingFields()),
            ("contra_angle_decreasing", "Понижающий", 2, ContraDecreasingFields()),
            ("contra_angle_1_1", "1:1", 3, Contra11Fields()),
            ("straight_increasing", "Повышающий", 4, StraightIncreasingFields()),
            ("straight_1_1", "1:1", 5, Straight11Fields())
        ];

        foreach (var subtype in subtypes)
        {
            var kind = db.ProductKinds.FirstOrDefault(item => item.Code == subtype.Code);
            if (kind == null)
            {
                kind = Kind(handpieces, subtype.Code, subtype.Name, subtype.Sort);
                db.ProductKinds.Add(kind);
                db.SaveChanges();
            }
            else if (kind.SortOrder != subtype.Sort)
            {
                kind.SortOrder = subtype.Sort;
            }

            EnsureKindCharacteristics(db, kind, definitions, subtype.Fields);
        }

        MigrateHandpieceProducts(db);
        db.SaveChanges();
        RemoveLegacyHandpieceKinds(db);
        db.SaveChanges();
    }

    private static void EnsureOtherKind(AppDbContext db)
    {
        var handpieces = db.ProductCategories.FirstOrDefault(item => item.Code == "handpieces");
        if (handpieces == null)
            return;

        var definitions = db.CharacteristicDefinitions.ToDictionary(item => item.Code);
        if (!definitions.ContainsKey("model"))
            return;

        var kind = db.ProductKinds.FirstOrDefault(item => item.Code == "other");
        if (kind == null)
        {
            kind = Kind(handpieces, "other", "Иное", 7);
            db.ProductKinds.Add(kind);
            db.SaveChanges();
        }

        if (!db.ProductKindCharacteristics.Any(item => item.ProductKindId == kind.Id))
            db.ProductKindCharacteristics.AddRange(Links(kind, definitions, CommonFields()));

        db.SaveChanges();
    }

    private static void EnsureKindCharacteristics(
        AppDbContext db,
        ProductKind kind,
        Dictionary<string, CharacteristicDefinition> definitions,
        FieldSpec[] specs)
    {
        var hasLinks = db.ProductKindCharacteristics.Any(item => item.ProductKindId == kind.Id);
        if (!hasLinks)
        {
            db.ProductKindCharacteristics.AddRange(Links(kind, definitions, specs));
            return;
        }

        var gearSpec = specs.FirstOrDefault(item => item.Code == "gearRatio");
        if (gearSpec == null || !definitions.TryGetValue("gearRatio", out var gearDefinition))
            return;

        var gearLink = db.ProductKindCharacteristics
            .FirstOrDefault(item =>
                item.ProductKindId == kind.Id &&
                item.CharacteristicDefinitionId == gearDefinition.Id);
        if (gearLink == null)
            return;

        gearLink.InputType = gearSpec.InputType;
        gearLink.AllowCustom = gearSpec.AllowCustom;

        var oldOptions = db.CharacteristicOptions
            .Where(item => item.ProductKindCharacteristicId == gearLink.Id)
            .ToList();
        if (oldOptions.Count > 0)
            db.CharacteristicOptions.RemoveRange(oldOptions);

        var optionOrder = 0;
        foreach (var option in gearSpec.Options)
        {
            optionOrder++;
            db.CharacteristicOptions.Add(new CharacteristicOption
            {
                Id = Guid.NewGuid(),
                ProductKindCharacteristicId = gearLink.Id,
                Value = option.Value,
                Label = option.Label,
                SortOrder = optionOrder
            });
        }
    }

    private static void MigrateHandpieceProducts(AppDbContext db)
    {
        var kindsByCode = db.ProductKinds.ToDictionary(item => item.Code);
        kindsByCode.TryGetValue("contra_angle", out var contraOld);
        kindsByCode.TryGetValue("straight", out var straightOld);
        if (contraOld == null && straightOld == null)
            return;

        var products = db.Products
            .Include(item => item.Values)
            .Where(item =>
                (contraOld != null && item.ProductKindId == contraOld.Id) ||
                (straightOld != null && item.ProductKindId == straightOld.Id))
            .ToList();

        foreach (var product in products)
        {
            var isContra = contraOld != null && product.ProductKindId == contraOld.Id;
            var targetCode = isContra
                ? InferContraSubtype(product)
                : InferStraightSubtype(product);

            if (kindsByCode.TryGetValue(targetCode, out var targetKind))
                product.ProductKindId = targetKind.Id;
        }
    }

    private static string InferContraSubtype(Product product)
    {
        var gear = product.Values.FirstOrDefault(item => item.Code == "gearRatio" && item.VariationId == null)?.Value;
        if (string.IsNullOrWhiteSpace(gear) || gear == "1:1")
            return "contra_angle_1_1";
        if (IsDecreasingRatio(gear))
            return "contra_angle_decreasing";
        return "contra_angle_increasing";
    }

    private static string InferStraightSubtype(Product product)
    {
        var gear = product.Values.FirstOrDefault(item => item.Code == "gearRatio" && item.VariationId == null)?.Value;
        if (gear == "1:2")
            return "straight_increasing";
        return "straight_1_1";
    }

    private static bool IsDecreasingRatio(string gear)
    {
        var parts = gear.Split(':');
        if (parts.Length != 2)
            return false;
        if (!int.TryParse(parts[0], out var left) || !int.TryParse(parts[1], out var right))
            return false;
        return left > right;
    }

    private static void RemoveLegacyHandpieceKinds(AppDbContext db)
    {
        foreach (var (code, fallbackCode) in new[] { ("contra_angle", "contra_angle_1_1"), ("straight", "straight_1_1") })
        {
            var kind = db.ProductKinds.FirstOrDefault(item => item.Code == code);
            if (kind == null)
                continue;

            var fallback = db.ProductKinds.FirstOrDefault(item => item.Code == fallbackCode);
            if (fallback != null)
            {
                var products = db.Products.Where(item => item.ProductKindId == kind.Id).ToList();
                foreach (var product in products)
                    product.ProductKindId = fallback.Id;
            }

            db.ProductKinds.Remove(kind);
        }
    }

    private static IEnumerable<ProductKindCharacteristic> Links(
        ProductKind kind,
        Dictionary<string, CharacteristicDefinition> definitions,
        FieldSpec[] specs)
    {
        var order = 0;
        foreach (var spec in specs)
        {
            order++;
            var link = new ProductKindCharacteristic
            {
                Id = Guid.NewGuid(),
                ProductKindId = kind.Id,
                CharacteristicDefinitionId = definitions[spec.Code].Id,
                InputType = spec.InputType,
                AllowCustom = spec.AllowCustom,
                UnitGroup = spec.UnitGroup,
                IsRequired = true,
                SortOrder = order
            };

            var optionOrder = 0;
            foreach (var option in spec.Options)
            {
                optionOrder++;
                link.Options.Add(new CharacteristicOption
                {
                    Id = Guid.NewGuid(),
                    Value = option.Value,
                    Label = option.Label,
                    SortOrder = optionOrder
                });
            }

            yield return link;
        }
    }
}
