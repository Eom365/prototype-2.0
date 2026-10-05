using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductCard.Api.Data;
using ProductCard.Api.Dtos;
using ProductCard.Api.Models;
using ProductCard.Api.Services;

namespace ProductCard.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private static readonly string[] PhotoRoles = ["presentation", "product", "package"];
    private static readonly string[] Roles = ["presentation", "product", "package", "logo", "document"];
    private static readonly string[] DocumentTypes =
    [
        "warranty", "brand", "certificate", "declaration",
        "stateRegistration", "registration", "manual", "other"
    ];

    private readonly AppDbContext _db;
    private readonly FileStorage _files;

    public ProductsController(AppDbContext db, FileStorage files)
    {
        _db = db;
        _files = files;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProductListItemDto>>> List()
    {
        var products = await LoadProducts().OrderByDescending(product => product.UpdatedAt).ToListAsync();
        return products.Select(ToListItem).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDetailDto>> Get(Guid id)
    {
        var product = await LoadProducts().FirstOrDefaultAsync(item => item.Id == id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });
        var detail = ToDetail(product);
        await FillCommercial(detail);
        return detail;
    }

    [HttpPost]
    public async Task<ActionResult<ProductDetailDto>> Create()
    {
        var now = DateTime.UtcNow;
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Status = "draft",
            CurrentStage = 1,
            Purpose = null,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = product.Id }, ToDetail(product));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await _db.Products.Include(item => item.Files).FirstOrDefaultAsync(item => item.Id == id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        foreach (var file in product.Files)
            _files.Delete(file.StoredName);

        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/review")]
    public async Task<ActionResult<ProductDetailDto>> ReviewProduct(Guid id, ReviewDecisionDto dto)
    {
        var product = await _db.Products.FirstOrDefaultAsync(item => item.Id == id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        var decision = (dto.Decision ?? "").Trim().ToLowerInvariant();
        if (decision == "approve")
            product.ReviewStatus = "approved";
        else if (decision == "submit")
            product.ReviewStatus = "pending";
        else
            return BadRequest(new { message = "Неизвестное решение" });

        Touch(product, product.CurrentStage);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<ProductDetailDto>> Complete(Guid id)
    {
        var product = await _db.Products.FirstOrDefaultAsync(item => item.Id == id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        product.Status = "ready";
        Touch(product, 8);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpGet("matches")]
    public async Task<ActionResult<List<MatchDto>>> Matches(
        [FromQuery] string? tradeName,
        [FromQuery] string? brandName,
        [FromQuery] string? manufacturerName,
        [FromQuery] string? manufacturerCountry,
        [FromQuery] string? productIdentifier,
        [FromQuery] string? internalArticle,
        [FromQuery] Guid? excludeId)
    {
        var probes = new (string Label, string? Probe, Func<Product, string?> Read)[]
        {
            ("фирменное наименование", tradeName, product => product.TradeName),
            ("бренд", brandName, product => product.BrandName),
            ("производитель", manufacturerName, product => product.ManufacturerName),
            ("страна", manufacturerCountry, product => product.ManufacturerCountry),
            ("идентификатор", productIdentifier, product => product.ProductIdentifier),
            ("артикул", internalArticle, product => product.InternalArticle)
        }.Where(item => !string.IsNullOrWhiteSpace(item.Probe) && item.Probe!.Trim().Length >= 2)
         .ToArray();

        if (probes.Length == 0)
            return new List<MatchDto>();

        var products = await _db.Products.AsNoTracking()
            .Where(product => excludeId == null || product.Id != excludeId)
            .ToListAsync();

        var matches = new List<MatchDto>();
        foreach (var product in products)
        {
            var reasons = probes
                .Where(probe => Contains(probe.Read(product), probe.Probe))
                .Select(probe => probe.Label)
                .ToList();
            if (reasons.Count == 0)
                continue;

            matches.Add(new MatchDto
            {
                Id = product.Id,
                Title = Title(product),
                Status = product.Status,
                Reasons = reasons
            });
        }

        return matches
            .OrderByDescending(match => match.Reasons.Count)
            .Take(10)
            .ToList();
    }

    [HttpPut("{id:guid}/identity")]
    public async Task<ActionResult<ProductDetailDto>> SaveIdentity(Guid id, IdentityDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        product.AuthorLastName = dto.AuthorLastName;
        product.AuthorFirstName = dto.AuthorFirstName;
        product.AuthorMiddleName = dto.AuthorMiddleName;
        product.TradeName = dto.TradeName;
        product.BrandName = dto.BrandName;
        product.ManufacturerName = dto.ManufacturerName;
        product.ManufacturerCountry = dto.ManufacturerCountry;
        product.ProductIdentifier = dto.ProductIdentifier;
        product.InternalArticle = dto.InternalArticle;
        Touch(product, 1);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/category")]
    public async Task<ActionResult<ProductDetailDto>> SaveCategory(Guid id, CategoryDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        ProductKind? kind = null;
        if (!string.IsNullOrWhiteSpace(dto.KindCode))
        {
            kind = await _db.ProductKinds.Include(item => item.Category)
                .FirstOrDefaultAsync(item => item.Code == dto.KindCode);
            if (kind == null)
                return BadRequest(new { message = "Неизвестный вид продукта" });
        }

        var kindChanged = product.ProductKindId != kind?.Id;
        product.Purpose = string.IsNullOrWhiteSpace(dto.Purpose) ? null : dto.Purpose;
        product.ProductKindId = kind?.Id;
        product.ProductName = dto.ProductName;
        product.CategoryPath = string.IsNullOrWhiteSpace(dto.CategoryPath) && kind != null
            ? BuildCategoryPath(kind, dto.Purpose)
            : dto.CategoryPath;
        product.ProductLine = dto.ProductLine;
        Touch(product, 2);

        if (kindChanged && kind != null)
        {
            var allowed = await _db.ProductKindCharacteristics
                .Where(link => link.ProductKindId == kind.Id)
                .Select(link => link.Definition.Code)
                .ToListAsync();
            var stale = await _db.CharacteristicValues
                .Where(value => value.ProductId == id && !allowed.Contains(value.Code))
                .ToListAsync();
            _db.CharacteristicValues.RemoveRange(stale);
        }

        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/description")]
    public async Task<ActionResult<ProductDetailDto>> SaveDescription(Guid id, DescriptionDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        product.Description = dto.Description;
        product.Complectation = dto.Complectation;
        product.ApplicationArea = dto.ApplicationArea;
        product.StorageConditions = dto.StorageConditions;
        product.Precautions = dto.Precautions;
        Touch(product, 5);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/characteristics")]
    public async Task<ActionResult<ProductDetailDto>> SaveCharacteristics(Guid id, CharacteristicsDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        var existing = await _db.CharacteristicValues
            .Where(value => value.ProductId == id && value.VariationId == null)
            .ToListAsync();
        _db.CharacteristicValues.RemoveRange(existing);

        foreach (var value in dto.Values.Where(item => !string.IsNullOrWhiteSpace(item.Code)))
        {
            _db.CharacteristicValues.Add(new CharacteristicValue
            {
                Id = Guid.NewGuid(),
                ProductId = id,
                Code = value.Code.Trim(),
                Value = value.Value,
                CustomValue = value.CustomValue,
                Unit = value.Unit
            });
        }

        var brandValue = dto.Values.FirstOrDefault(item =>
            string.Equals(item.Code?.Trim(), "brand", StringComparison.OrdinalIgnoreCase));
        if (brandValue != null)
        {
            var brandText = string.Equals(brandValue.Value, "other", StringComparison.OrdinalIgnoreCase)
                ? brandValue.CustomValue
                : brandValue.Value;
            if (!string.IsNullOrWhiteSpace(brandText))
                product.BrandName = brandText.Trim();
        }

        Touch(product, 5);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/name")]
    public async Task<ActionResult<ProductDetailDto>> SaveName(Guid id, NameDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        product.FullName = dto.FullName;
        product.NameIncludesLogo = dto.NameIncludesLogo;
        product.NameIncludesType = dto.NameIncludesType;
        product.NameIncludesBrand = dto.NameIncludesBrand;
        product.NameIncludesLine = dto.NameIncludesLine;
        product.NameIncludesModel = dto.NameIncludesModel;
        Touch(product, 6);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/packaging")]
    public async Task<ActionResult<ProductDetailDto>> SavePackaging(Guid id, PackagingDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        product.PackType = dto.PackType;
        product.PackMaterial = dto.PackMaterial;
        product.PackMaterialCustom = dto.PackMaterialCustom;
        product.PackBoxNote = dto.PackBoxNote;
        product.PackCaseNote = dto.PackCaseNote;
        product.PackBlisterNote = dto.PackBlisterNote;
        product.PackSizeUnit = string.IsNullOrWhiteSpace(dto.PackSizeUnit) ? "sm" : dto.PackSizeUnit;
        product.PackLength = dto.PackLength;
        product.PackWidth = dto.PackWidth;
        product.PackHeight = dto.PackHeight;
        Touch(product, 8);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/price")]
    public async Task<ActionResult<ProductDetailDto>> SavePrice(Guid id, PriceDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        if (dto.VariationId == null)
        {
            product.Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "RUB" : dto.Currency;
            product.Price = dto.Price;
            Touch(product, 9);
        }
        else
        {
            var variation = await FindVariation(id, dto.VariationId.Value);
            if (variation == null)
                return NotFound(new { message = "Вариация не найдена" });
            variation.Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "RUB" : dto.Currency;
            variation.Price = dto.Price;
            Touch(product, 19);
        }

        var existing = await _db.LoyaltyTiers
            .Where(item => item.ProductId == id && item.VariationId == dto.VariationId)
            .ToListAsync();
        _db.LoyaltyTiers.RemoveRange(existing);
        var order = 0;
        foreach (var discount in dto.Discounts)
        {
            order++;
            _db.LoyaltyTiers.Add(new LoyaltyTier
            {
                Id = Guid.NewGuid(),
                ProductId = id,
                VariationId = dto.VariationId,
                Enabled = discount.Enabled,
                FromQuantity = discount.From,
                ToQuantity = discount.To,
                Value = discount.Value,
                SortOrder = order
            });
        }

        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/shipments")]
    public async Task<ActionResult<ProductDetailDto>> SaveShipments(Guid id, ShipmentListDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });
        if (dto.VariationId != null && await FindVariation(id, dto.VariationId.Value) == null)
            return NotFound(new { message = "Вариация не найдена" });

        var warehouses = await _db.Warehouses.ToListAsync();
        var order = 0;
        var saved = new List<(Warehouse Warehouse, ShipmentPointDto Item)>();
        foreach (var item in dto.Items)
        {
            order++;
            var warehouse = item.Id == null ? null : warehouses.FirstOrDefault(entry => entry.Id == item.Id);
            if (warehouse == null)
            {
                warehouse = new Warehouse { Id = Guid.NewGuid() };
                _db.Warehouses.Add(warehouse);
                warehouses.Add(warehouse);
            }

            warehouse.Name = item.Name;
            warehouse.PostalCode = item.PostalCode;
            warehouse.Region = item.Region;
            warehouse.City = item.City;
            warehouse.Street = item.Street;
            warehouse.House = item.House;
            warehouse.Office = item.Office;
            warehouse.AddressLine = item.AddressLine ?? "";
            warehouse.SortOrder = order;
            saved.Add((warehouse, item));
        }

        var stockQuery = _db.ShipmentPoints.Where(item => item.ProductId == id);
        stockQuery = dto.VariationId == null
            ? stockQuery.Where(item => item.VariationId == null)
            : stockQuery.Where(item => item.VariationId == dto.VariationId);
        var existing = await stockQuery.ToListAsync();
        _db.ShipmentPoints.RemoveRange(existing);
        foreach (var (warehouse, item) in saved)
        {
            _db.ShipmentPoints.Add(new ShipmentPoint
            {
                Id = Guid.NewGuid(),
                ProductId = id,
                VariationId = dto.VariationId,
                WarehouseId = warehouse.Id,
                Name = warehouse.Name,
                PostalCode = warehouse.PostalCode,
                Region = warehouse.Region,
                City = warehouse.City,
                Street = warehouse.Street,
                House = warehouse.House,
                Office = warehouse.Office,
                AddressLine = warehouse.AddressLine,
                Active = item.Active,
                Quantity = item.Quantity,
                SortOrder = warehouse.SortOrder
            });
        }

        Touch(product, dto.VariationId == null ? 10 : 20);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/variant-axes")]
    public async Task<ActionResult<ProductDetailDto>> SaveVariantAxes(Guid id, VariantAxesDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        var existing = await _db.VariantAxes.Where(item => item.ProductId == id).ToListAsync();
        _db.VariantAxes.RemoveRange(existing);
        foreach (var code in dto.Codes.Where(code => !string.IsNullOrWhiteSpace(code)).Distinct())
        {
            _db.VariantAxes.Add(new VariantAxis
            {
                Id = Guid.NewGuid(),
                ProductId = id,
                Code = code.Trim()
            });
        }

        Touch(product, 13);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/wants-variants")]
    public async Task<ActionResult<ProductDetailDto>> SaveWantsVariants(Guid id, WantsVariantsDto dto)
    {
        var product = await Find(id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });
        product.WantsVariants = dto.WantsVariants;
        Touch(product, 12);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/variations/{variationId:guid}/description")]
    public async Task<ActionResult<ProductDetailDto>> SaveVariationDescription(Guid id, Guid variationId, DescriptionDto dto)
    {
        var variation = await FindVariation(id, variationId);
        if (variation == null)
            return NotFound(new { message = "Вариация не найдена" });
        variation.Description = dto.Description;
        variation.Complectation = dto.Complectation;
        variation.ApplicationArea = dto.ApplicationArea;
        variation.StorageConditions = dto.StorageConditions;
        variation.Precautions = dto.Precautions;
        await TouchProduct(id, 15);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/variations/{variationId:guid}/characteristics")]
    public async Task<ActionResult<ProductDetailDto>> SaveVariationCharacteristics(Guid id, Guid variationId, CharacteristicsDto dto)
    {
        if (await FindVariation(id, variationId) == null)
            return NotFound(new { message = "Вариация не найдена" });

        var existing = await _db.CharacteristicValues.Where(item => item.VariationId == variationId).ToListAsync();
        _db.CharacteristicValues.RemoveRange(existing);
        foreach (var value in dto.Values.Where(item => !string.IsNullOrWhiteSpace(item.Code)))
        {
            _db.CharacteristicValues.Add(new CharacteristicValue
            {
                Id = Guid.NewGuid(),
                ProductId = id,
                VariationId = variationId,
                Code = value.Code.Trim(),
                Value = value.Value,
                CustomValue = value.CustomValue,
                Unit = value.Unit
            });
        }

        await TouchProduct(id, 15);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/variations/{variationId:guid}/name")]
    public async Task<ActionResult<ProductDetailDto>> SaveVariationName(Guid id, Guid variationId, NameDto dto)
    {
        var variation = await FindVariation(id, variationId);
        if (variation == null)
            return NotFound(new { message = "Вариация не найдена" });
        variation.FullName = dto.FullName;
        variation.NameIncludesLogo = dto.NameIncludesLogo;
        variation.NameIncludesType = dto.NameIncludesType;
        variation.NameIncludesBrand = dto.NameIncludesBrand;
        variation.NameIncludesLine = dto.NameIncludesLine;
        variation.NameIncludesModel = dto.NameIncludesModel;
        await TouchProduct(id, 16);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/variations/{variationId:guid}/packaging")]
    public async Task<ActionResult<ProductDetailDto>> SaveVariationPackaging(Guid id, Guid variationId, VariationPackagingDto dto)
    {
        var variation = await FindVariation(id, variationId);
        if (variation == null)
            return NotFound(new { message = "Вариация не найдена" });
        variation.PackType = dto.PackType;
        variation.PackMaterial = dto.PackMaterial;
        variation.PackMaterialCustom = dto.PackMaterialCustom;
        variation.PackSizeUnit = string.IsNullOrWhiteSpace(dto.PackSizeUnit) ? "sm" : dto.PackSizeUnit;
        variation.PackLength = dto.PackLength;
        variation.PackWidth = dto.PackWidth;
        variation.PackHeight = dto.PackHeight;
        await TouchProduct(id, 18);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPost("{id:guid}/files")]
    [RequestSizeLimit(52_428_800)]
    public async Task<ActionResult<FileDto>> Upload(
        Guid id,
        IFormFile? file,
        [FromForm] string? role,
        [FromForm] string? documentType,
        [FromForm] string? variationId,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Файл не выбран" });
        if (string.IsNullOrWhiteSpace(role) || !Roles.Contains(role))
            return BadRequest(new { message = "Неизвестная роль файла" });
        if (role == "document" && (string.IsNullOrWhiteSpace(documentType) || !DocumentTypes.Contains(documentType)))
            return BadRequest(new { message = "Неизвестный тип документа" });

        var product = await _db.Products.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        Guid? parsedVariationId = Guid.TryParse(variationId, out var parsedVariation) ? parsedVariation : null;

        if (PhotoRoles.Contains(role))
        {
            var count = await _db.ProductFiles.CountAsync(
                item => item.ProductId == id && item.Role == role && item.VariationId == parsedVariationId,
                cancellationToken);
            if (count >= 5)
                return BadRequest(new { message = "Можно прикрепить не больше 5 фотографий" });
        }

        if (role == "logo")
            await RemoveFiles(id, item => item.Role == "logo" && item.VariationId == parsedVariationId, cancellationToken);
        if (role == "document")
            await RemoveFiles(id, item => item.Role == "document" && item.DocumentType == documentType && item.VariationId == parsedVariationId, cancellationToken);

        var sort = await _db.ProductFiles.CountAsync(
            item => item.ProductId == id && item.Role == role && item.VariationId == parsedVariationId,
            cancellationToken);
        var storedName = await _files.SaveAsync(file, cancellationToken);
        var entity = new ProductFile
        {
            Id = Guid.NewGuid(),
            ProductId = id,
            VariationId = parsedVariationId,
            Role = role,
            DocumentType = role == "document" ? documentType : null,
            OriginalName = Path.GetFileName(file.FileName),
            StoredName = storedName,
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            Size = file.Length,
            SortOrder = sort,
            CreatedAt = DateTime.UtcNow
        };
        _db.ProductFiles.Add(entity);
        Touch(product, role switch
        {
            "presentation" => 3,
            "product" => 4,
            "package" => 8,
            _ => product.CurrentStage
        });
        await _db.SaveChangesAsync(cancellationToken);
        return ToFile(entity);
    }

    [HttpPost("{id:guid}/variations")]
    public async Task<ActionResult<VariationDto>> CreateVariation(Guid id, VariationWriteDto dto)
    {
        var product = await _db.Products.Include(item => item.Values).FirstOrDefaultAsync(item => item.Id == id);
        if (product == null)
            return NotFound(new { message = "Карточка не найдена" });

        var sort = await _db.ProductVariations.CountAsync(item => item.ProductId == id);
        var variation = new ProductVariation
        {
            Id = Guid.NewGuid(),
            ProductId = id,
            Article = dto.Article,
            Model = dto.Model,
            SortOrder = sort,
            CreatedAt = DateTime.UtcNow
        };
        _db.ProductVariations.Add(variation);

        var savedCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (dto.Values != null)
        {
            foreach (var incoming in dto.Values.Where(item => !string.IsNullOrWhiteSpace(item.Code)))
            {
                var code = incoming.Code.Trim();
                savedCodes.Add(code);
                _db.CharacteristicValues.Add(new CharacteristicValue
                {
                    Id = Guid.NewGuid(),
                    ProductId = id,
                    VariationId = variation.Id,
                    Code = code,
                    Value = incoming.Value,
                    CustomValue = incoming.CustomValue,
                    Unit = incoming.Unit
                });
                if (code == "model")
                    variation.Model = incoming.Value == "other" ? incoming.CustomValue : incoming.Value;
                if (code == "article")
                    variation.Article = incoming.Value == "other" ? incoming.CustomValue : incoming.Value;
            }
        }

        if (!savedCodes.Contains("article") && !string.IsNullOrWhiteSpace(dto.Article))
            AddCode(id, variation.Id, "article", dto.Article);
        if (!savedCodes.Contains("model") && !string.IsNullOrWhiteSpace(dto.Model))
            AddCode(id, variation.Id, "model", dto.Model);

        var axes = await _db.VariantAxes.AsNoTracking()
            .Where(item => item.ProductId == id)
            .Select(item => item.Code)
            .ToListAsync();
        if (axes.Count > 0)
        {
            var staged = _db.ChangeTracker.Entries<CharacteristicValue>()
                .Select(entry => entry.Entity)
                .Where(item => item.VariationId == variation.Id)
                .ToList();
            if (await HasSameAxes(id, variation.Id, axes, staged))
                return BadRequest(new { message = "Вариант с такими значениями характеристик уже есть" });
        }

        Touch(product, product.CurrentStage);
        await _db.SaveChangesAsync();

        var values = await _db.CharacteristicValues.Where(item => item.VariationId == variation.Id).ToListAsync();
        return ToVariation(variation, values);
    }

    [HttpGet("/api/reviews")]
    public async Task<ActionResult<List<ReviewItemDto>>> PendingReviews()
    {
        var items = new List<ReviewItemDto>();

        var pendingProducts = await _db.Products.AsNoTracking()
            .Where(item => item.ReviewStatus == "pending")
            .OrderBy(item => item.UpdatedAt)
            .ToListAsync();
        var pendingProductIds = pendingProducts.Select(item => item.Id).ToList();
        var baseShipmentPoints = pendingProductIds.Count == 0
            ? new List<ShipmentPoint>()
            : await _db.ShipmentPoints.AsNoTracking()
                .Where(item => pendingProductIds.Contains(item.ProductId) && item.VariationId == null && item.Active)
                .ToListAsync();
        foreach (var product in pendingProducts)
        {
            var point = baseShipmentPoints.FirstOrDefault(item => item.ProductId == product.Id);
            items.Add(new ReviewItemDto
            {
                ProductId = product.Id,
                VariationId = null,
                Title = Title(product),
                Price = product.Price,
                Currency = product.Currency,
                Address = point?.AddressLine,
                Chips = new List<string>()
            });
        }

        var variations = await _db.ProductVariations.AsNoTracking()
            .Where(item => item.ReviewStatus == "pending")
            .OrderBy(item => item.CreatedAt)
            .ToListAsync();
        if (variations.Count == 0)
            return items;

        var productIds = variations.Select(item => item.ProductId).Distinct().ToList();
        var variationIds = variations.Select(item => item.Id).ToList();
        var products = await _db.Products.AsNoTracking().Where(item => productIds.Contains(item.Id)).ToListAsync();
        var values = await _db.CharacteristicValues.AsNoTracking()
            .Where(item => item.VariationId != null && variationIds.Contains(item.VariationId.Value))
            .ToListAsync();
        var axes = await _db.VariantAxes.AsNoTracking()
            .Where(item => productIds.Contains(item.ProductId))
            .ToListAsync();
        var points = await _db.ShipmentPoints.AsNoTracking()
            .Where(item => productIds.Contains(item.ProductId))
            .ToListAsync();

        items.AddRange(variations.Select(variation =>
        {
            var product = products.FirstOrDefault(item => item.Id == variation.ProductId);
            var codes = axes.Where(item => item.ProductId == variation.ProductId).Select(item => item.Code).ToHashSet();
            var chips = values
                .Where(item => item.VariationId == variation.Id && (codes.Count == 0 || codes.Contains(item.Code)))
                .Select(item => item.Value == "other" ? item.CustomValue : item.Value)
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Cast<string>()
                .ToList();
            var point = points.FirstOrDefault(item => item.VariationId == variation.Id && item.Active)
                ?? points.FirstOrDefault(item => item.ProductId == variation.ProductId && item.VariationId == null && item.Active);
            return new ReviewItemDto
            {
                ProductId = variation.ProductId,
                VariationId = variation.Id,
                Title = variation.FullName ?? product?.TradeName ?? product?.ProductName ?? "Без названия",
                Price = variation.Price,
                Currency = variation.Currency,
                Address = point?.AddressLine,
                Chips = chips
            };
        }));
        return items;
    }

    [HttpPost("{id:guid}/variations/{variationId:guid}/review")]
    public async Task<ActionResult<ProductDetailDto>> ReviewVariation(Guid id, Guid variationId, ReviewDecisionDto dto)
    {
        var variation = await FindVariation(id, variationId);
        if (variation == null)
            return NotFound(new { message = "Вариация не найдена" });

        var decision = (dto.Decision ?? "").Trim().ToLowerInvariant();
        if (decision == "approve")
        {
            var values = await _db.CharacteristicValues.Where(item => item.VariationId == variationId).ToListAsync();
            var files = await _db.ProductFiles.Where(item => item.VariationId == variationId).ToListAsync();
            variation.ReviewStatus = "approved";
            variation.ApprovedSignature = BuildSignature(variation, values, files);
        }
        else if (decision == "submit")
        {
            variation.ReviewStatus = "pending";
        }
        else
        {
            return BadRequest(new { message = "Неизвестное решение" });
        }

        await TouchProduct(id, 13);
        await _db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPut("{id:guid}/variations/{variationId:guid}")]
    public async Task<ActionResult<VariationDto>> UpdateVariation(Guid id, Guid variationId, VariationWriteDto dto)
    {
        var variation = await _db.ProductVariations
            .FirstOrDefaultAsync(item => item.Id == variationId && item.ProductId == id);
        if (variation == null)
            return NotFound(new { message = "Вариация не найдена" });

        variation.Article = dto.Article;
        variation.Model = dto.Model;

        if (dto.Values != null)
        {
            var existing = await _db.CharacteristicValues.Where(item => item.VariationId == variationId).ToListAsync();
            _db.CharacteristicValues.RemoveRange(existing);
            foreach (var value in dto.Values.Where(item => !string.IsNullOrWhiteSpace(item.Code)))
            {
                _db.CharacteristicValues.Add(new CharacteristicValue
                {
                    Id = Guid.NewGuid(),
                    ProductId = id,
                    VariationId = variationId,
                    Code = value.Code.Trim(),
                    Value = value.Value,
                    CustomValue = value.CustomValue,
                    Unit = value.Unit
                });
            }
        }
        else
        {
            await SetCode(id, variationId, "article", dto.Article);
            await SetCode(id, variationId, "model", dto.Model);
        }

        var product = await Find(id);
        if (product != null)
            Touch(product, product.CurrentStage);
        await _db.SaveChangesAsync();

        var values = await _db.CharacteristicValues.Where(item => item.VariationId == variationId).ToListAsync();
        return ToVariation(variation, values);
    }

    [HttpDelete("{id:guid}/variations/{variationId:guid}")]
    public async Task<IActionResult> DeleteVariation(Guid id, Guid variationId)
    {
        var variation = await _db.ProductVariations
            .FirstOrDefaultAsync(item => item.Id == variationId && item.ProductId == id);
        if (variation == null)
            return NotFound(new { message = "Вариация не найдена" });

        var values = await _db.CharacteristicValues.Where(item => item.VariationId == variationId).ToListAsync();
        var tiers = await _db.LoyaltyTiers.Where(item => item.VariationId == variationId).ToListAsync();
        var points = await _db.ShipmentPoints.Where(item => item.VariationId == variationId).ToListAsync();
        var files = await _db.ProductFiles.Where(item => item.VariationId == variationId).ToListAsync();
        foreach (var file in files)
            _files.Delete(file.StoredName);
        _db.CharacteristicValues.RemoveRange(values);
        _db.LoyaltyTiers.RemoveRange(tiers);
        _db.ShipmentPoints.RemoveRange(points);
        _db.ProductFiles.RemoveRange(files);
        _db.ProductVariations.Remove(variation);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private IQueryable<Product> LoadProducts() =>
        _db.Products
            .AsNoTracking()
            .Include(product => product.ProductKind)!.ThenInclude(kind => kind!.Category)
            .Include(product => product.Values)
            .Include(product => product.Files)
            .Include(product => product.Variations);

    private Task<Product?> Find(Guid id) => _db.Products.FirstOrDefaultAsync(product => product.Id == id);

    private Task<ProductVariation?> FindVariation(Guid productId, Guid variationId) =>
        _db.ProductVariations.FirstOrDefaultAsync(item => item.ProductId == productId && item.Id == variationId);

    private async Task TouchProduct(Guid id, int stage)
    {
        var product = await Find(id);
        if (product != null)
            Touch(product, stage);
    }

    private async Task FillCommercial(ProductDetailDto detail)
    {
        detail.VariantAxes = await _db.VariantAxes.AsNoTracking()
            .Where(item => item.ProductId == detail.Id)
            .Select(item => item.Code)
            .ToListAsync();
        detail.LoyaltyTiers = await _db.LoyaltyTiers.AsNoTracking()
            .Where(item => item.ProductId == detail.Id)
            .OrderBy(item => item.SortOrder)
            .Select(item => new LoyaltyTierDto
            {
                Id = item.Id,
                VariationId = item.VariationId,
                Enabled = item.Enabled,
                From = item.FromQuantity,
                To = item.ToQuantity,
                Value = item.Value
            })
            .ToListAsync();
        var warehouses = await _db.Warehouses.AsNoTracking()
            .OrderBy(item => item.SortOrder)
            .ToListAsync();
        var stocks = await _db.ShipmentPoints.AsNoTracking()
            .Where(item => item.ProductId == detail.Id && item.VariationId == null)
            .ToListAsync();
        detail.ShipmentPoints = warehouses.Select(warehouse =>
        {
            var stock = stocks.FirstOrDefault(item => item.WarehouseId == warehouse.Id);
            return new ShipmentPointDto
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                PostalCode = warehouse.PostalCode,
                Region = warehouse.Region,
                City = warehouse.City,
                Street = warehouse.Street,
                House = warehouse.House,
                Office = warehouse.Office,
                AddressLine = warehouse.AddressLine,
                Active = stock?.Active ?? true,
                Quantity = stock?.Quantity
            };
        }).ToList();
        var variationStocks = await _db.ShipmentPoints.AsNoTracking()
            .Where(item => item.ProductId == detail.Id && item.VariationId != null)
            .ToListAsync();
        foreach (var stock in variationStocks)
        {
            var warehouse = warehouses.FirstOrDefault(item => item.Id == stock.WarehouseId);
            detail.ShipmentPoints.Add(new ShipmentPointDto
            {
                Id = warehouse?.Id ?? stock.WarehouseId ?? stock.Id,
                VariationId = stock.VariationId,
                Name = warehouse?.Name ?? stock.Name,
                PostalCode = warehouse?.PostalCode ?? stock.PostalCode,
                Region = warehouse?.Region ?? stock.Region,
                City = warehouse?.City ?? stock.City,
                Street = warehouse?.Street ?? stock.Street,
                House = warehouse?.House ?? stock.House,
                Office = warehouse?.Office ?? stock.Office,
                AddressLine = warehouse?.AddressLine ?? stock.AddressLine,
                Active = stock.Active,
                Quantity = stock.Quantity
            });
        }
    }

    private async Task RemoveFiles(Guid productId, Func<ProductFile, bool> predicate, CancellationToken cancellationToken)
    {
        var files = await _db.ProductFiles.Where(file => file.ProductId == productId).ToListAsync(cancellationToken);
        foreach (var file in files.Where(predicate))
        {
            _files.Delete(file.StoredName);
            _db.ProductFiles.Remove(file);
        }
    }

    private static void Touch(Product product, int stage)
    {
        if (product.CurrentStage < stage)
            product.CurrentStage = stage;
        product.UpdatedAt = DateTime.UtcNow;
    }

    private static bool Contains(string? source, string? probe)
    {
        if (string.IsNullOrWhiteSpace(source) || string.IsNullOrWhiteSpace(probe))
            return false;
        return source.Contains(probe.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    private static string Title(Product product) =>
        First(product.FullName, product.ProductName, product.TradeName, product.InternalArticle) ?? "Без названия";

    private static string? First(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

    private static string? BaseValue(Product product, string code) =>
        product.Values.FirstOrDefault(value => value.VariationId == null && value.Code == code)?.Value;

    private static CharacteristicValueDto ToValue(CharacteristicValue value) => new()
    {
        Code = value.Code,
        Value = value.Value,
        CustomValue = value.CustomValue,
        Unit = value.Unit
    };

    private static FileDto ToFile(ProductFile file) => new()
    {
        Id = file.Id,
        VariationId = file.VariationId,
        Role = file.Role,
        DocumentType = file.DocumentType,
        Name = file.OriginalName,
        ContentType = file.ContentType,
        Size = file.Size,
        SortOrder = file.SortOrder,
        Url = $"/api/files/{file.Id}"
    };

    private static VariationDto ToVariation(
        ProductVariation variation,
        IEnumerable<CharacteristicValue> values,
        IEnumerable<ProductFile>? files = null) => new()
    {
        Id = variation.Id,
        Article = variation.Article,
        Model = variation.Model,
        Currency = variation.Currency,
        Price = variation.Price,
        Description = variation.Description,
        Complectation = variation.Complectation,
        ApplicationArea = variation.ApplicationArea,
        StorageConditions = variation.StorageConditions,
        Precautions = variation.Precautions,
        FullName = variation.FullName,
        NameIncludesLogo = variation.NameIncludesLogo,
        NameIncludesType = variation.NameIncludesType,
        NameIncludesBrand = variation.NameIncludesBrand,
        NameIncludesLine = variation.NameIncludesLine,
        NameIncludesModel = variation.NameIncludesModel,
        PackType = variation.PackType,
        PackMaterial = variation.PackMaterial,
        PackMaterialCustom = variation.PackMaterialCustom,
        PackSizeUnit = variation.PackSizeUnit,
        PackLength = variation.PackLength,
        PackWidth = variation.PackWidth,
        PackHeight = variation.PackHeight,
        SortOrder = variation.SortOrder,
        ReviewStatus = string.IsNullOrWhiteSpace(variation.ReviewStatus) ? "filling" : variation.ReviewStatus,
        ApprovedSignature = variation.ApprovedSignature,
        Signature = BuildSignature(variation, values, files ?? Array.Empty<ProductFile>()),
        Values = values.Select(ToValue).ToList()
    };

    private static string BuildSignature(
        ProductVariation variation,
        IEnumerable<CharacteristicValue> values,
        IEnumerable<ProductFile> files)
    {
        var parts = new List<string>
        {
            variation.FullName ?? "",
            variation.Price ?? "",
            variation.Currency ?? "",
            variation.Description ?? "",
            variation.Complectation ?? "",
            variation.PackType ?? "",
            variation.PackMaterial ?? "",
            variation.PackMaterialCustom ?? "",
            variation.PackLength ?? "",
            variation.PackWidth ?? "",
            variation.PackHeight ?? ""
        };
        foreach (var value in values.OrderBy(item => item.Code))
            parts.Add($"{value.Code}={(value.Value == "other" ? value.CustomValue : value.Value)}");
        foreach (var file in files.OrderBy(item => item.Id))
            parts.Add(file.Id.ToString());
        return string.Join("\n", parts);
    }

    private async Task<bool> HasSameAxes(
        Guid productId,
        Guid variationId,
        List<string> axes,
        List<CharacteristicValue> staged)
    {
        var candidate = AxisKey(axes, staged);
        var existing = await _db.CharacteristicValues.AsNoTracking()
            .Where(item => item.ProductId == productId && item.VariationId != variationId)
            .ToListAsync();
        if (AxisKey(axes, existing.Where(item => item.VariationId == null)) == candidate)
            return true;
        foreach (var group in existing.Where(item => item.VariationId != null).GroupBy(item => item.VariationId))
        {
            if (AxisKey(axes, group) == candidate)
                return true;
        }
        return false;
    }

    private static string AxisKey(IEnumerable<string> axes, IEnumerable<CharacteristicValue> values)
    {
        var list = values.ToList();
        return string.Join("|", axes.OrderBy(code => code).Select(code =>
        {
            var value = list.FirstOrDefault(item => item.Code == code);
            if (value == null)
                return "";
            var text = code.StartsWith("custom:", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value.Value, "other", StringComparison.OrdinalIgnoreCase)
                ? value.CustomValue
                : value.Value;
            return (text ?? "").Trim().ToLower();
        }));
    }

    private static ProductListItemDto ToListItem(Product product) => new()
    {
        Id = product.Id,
        Status = product.Status,
        ReviewStatus = string.IsNullOrWhiteSpace(product.ReviewStatus) ? "filling" : product.ReviewStatus,
        CurrentStage = product.CurrentStage,
        Title = Title(product),
        KindName = product.ProductKind?.Name,
        CategoryPath = product.CategoryPath,
        Article = BaseValue(product, "article") ?? product.InternalArticle,
        Model = BaseValue(product, "model"),
        AuthorLastName = product.AuthorLastName,
        AuthorFirstName = product.AuthorFirstName,
        AuthorMiddleName = product.AuthorMiddleName,
        UpdatedAt = product.UpdatedAt,
        Variations = product.Variations
            .OrderBy(variation => variation.SortOrder)
            .Select(variation => ToVariation(variation, product.Values.Where(value => value.VariationId == variation.Id)))
            .ToList()
    };

    private static ProductDetailDto ToDetail(Product product) => new()
    {
        Id = product.Id,
        Status = product.Status,
        ReviewStatus = string.IsNullOrWhiteSpace(product.ReviewStatus) ? "filling" : product.ReviewStatus,
        CurrentStage = product.CurrentStage,
        AuthorLastName = product.AuthorLastName,
        AuthorFirstName = product.AuthorFirstName,
        AuthorMiddleName = product.AuthorMiddleName,
        Currency = product.Currency,
        Price = product.Price,
        WantsVariants = product.WantsVariants,
        TradeName = product.TradeName,
        BrandName = product.BrandName,
        ManufacturerName = product.ManufacturerName,
        ManufacturerCountry = product.ManufacturerCountry,
        ProductIdentifier = product.ProductIdentifier,
        InternalArticle = product.InternalArticle,
        Purpose = product.Purpose,
        KindCode = product.ProductKind?.Code,
        KindName = product.ProductKind?.Name,
        CategoryCode = product.ProductKind?.Category?.Code,
        CategoryName = product.ProductKind?.Category?.Name,
        ProductName = product.ProductName,
        CategoryPath = product.CategoryPath,
        ProductLine = product.ProductLine,
        Description = product.Description,
        Complectation = product.Complectation,
        ApplicationArea = product.ApplicationArea,
        StorageConditions = product.StorageConditions,
        Precautions = product.Precautions,
        FullName = product.FullName,
        NameIncludesLogo = product.NameIncludesLogo,
        NameIncludesType = product.NameIncludesType,
        NameIncludesBrand = product.NameIncludesBrand,
        NameIncludesLine = product.NameIncludesLine,
        NameIncludesModel = product.NameIncludesModel,
        PackType = product.PackType,
        PackMaterial = product.PackMaterial,
        PackMaterialCustom = product.PackMaterialCustom,
        PackBoxNote = product.PackBoxNote,
        PackCaseNote = product.PackCaseNote,
        PackBlisterNote = product.PackBlisterNote,
        PackSizeUnit = product.PackSizeUnit,
        PackLength = product.PackLength,
        PackWidth = product.PackWidth,
        PackHeight = product.PackHeight,
        CreatedAt = product.CreatedAt,
        UpdatedAt = product.UpdatedAt,
        Values = product.Values.Where(value => value.VariationId == null).Select(ToValue).ToList(),
        Files = product.Files.OrderBy(file => file.SortOrder).Select(ToFile).ToList(),
        Variations = product.Variations
            .OrderBy(variation => variation.SortOrder)
            .Select(variation => ToVariation(
                variation,
                product.Values.Where(value => value.VariationId == variation.Id),
                product.Files.Where(file => file.VariationId == variation.Id)))
            .ToList()
    };

    private CharacteristicValue CopyValue(Guid productId, Guid variationId, CharacteristicValue source, VariationWriteDto dto)
    {
        var value = source.Code switch
        {
            "article" => dto.Article,
            "model" => dto.Model,
            _ => source.Value
        };

        return new CharacteristicValue
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            VariationId = variationId,
            Code = source.Code,
            Value = value,
            CustomValue = source.Code is "article" or "model" ? null : source.CustomValue,
            Unit = source.Unit
        };
    }

    private void AddCode(Guid productId, Guid variationId, string code, string? value)
    {
        _db.CharacteristicValues.Add(new CharacteristicValue
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            VariationId = variationId,
            Code = code,
            Value = value
        });
    }

    private async Task SetCode(Guid productId, Guid variationId, string code, string? value)
    {
        var existing = await _db.CharacteristicValues
            .FirstOrDefaultAsync(item => item.VariationId == variationId && item.Code == code);
        if (existing == null)
            AddCode(productId, variationId, code, value);
        else
            existing.Value = value;
    }

    private static string BuildCategoryPath(ProductKind kind, string? purpose)
    {
        var root = purpose == "Стоматология" ? "Профессиональная стоматология" : "Стоматология";
        return $"{root} > {kind.Category.Name} > {kind.Name}";
    }
}
