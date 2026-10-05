namespace ProductCard.Api.Dtos;

public class CharacteristicValueDto
{
    public string Code { get; set; } = "";
    public string? Value { get; set; }
    public string? CustomValue { get; set; }
    public string? Unit { get; set; }
}

public class FileDto
{
    public Guid Id { get; set; }
    public Guid? VariationId { get; set; }
    public string Role { get; set; } = "";
    public string? DocumentType { get; set; }
    public string Name { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long Size { get; set; }
    public int SortOrder { get; set; }
    public string Url { get; set; } = "";
}

public class VariationDto
{
    public Guid Id { get; set; }
    public string? Article { get; set; }
    public string? Model { get; set; }
    public string? Currency { get; set; }
    public string? Price { get; set; }
    public string? Description { get; set; }
    public string? Complectation { get; set; }
    public string? ApplicationArea { get; set; }
    public string? StorageConditions { get; set; }
    public string? Precautions { get; set; }
    public string? FullName { get; set; }
    public bool NameIncludesLogo { get; set; }
    public bool NameIncludesType { get; set; }
    public bool NameIncludesBrand { get; set; }
    public bool NameIncludesLine { get; set; }
    public bool NameIncludesModel { get; set; }
    public string? PackType { get; set; }
    public string? PackMaterial { get; set; }
    public string? PackMaterialCustom { get; set; }
    public string? PackSizeUnit { get; set; }
    public string? PackLength { get; set; }
    public string? PackWidth { get; set; }
    public string? PackHeight { get; set; }
    public int SortOrder { get; set; }
    public string ReviewStatus { get; set; } = "filling";
    public string? Signature { get; set; }
    public string? ApprovedSignature { get; set; }
    public List<CharacteristicValueDto> Values { get; set; } = new();
}

public class ReviewDecisionDto
{
    public string Decision { get; set; } = "";
}

public class ReviewItemDto
{
    public Guid ProductId { get; set; }
    public Guid? VariationId { get; set; }
    public string Title { get; set; } = "";
    public string? Price { get; set; }
    public string? Currency { get; set; }
    public string? Address { get; set; }
    public List<string> Chips { get; set; } = new();
}

public class LoyaltyTierDto
{
    public Guid? Id { get; set; }
    public Guid? VariationId { get; set; }
    public bool Enabled { get; set; } = true;
    public string? From { get; set; }
    public string? To { get; set; }
    public string? Value { get; set; }
}

public class ShipmentPointDto
{
    public Guid? Id { get; set; }
    public Guid? VariationId { get; set; }
    public string? Name { get; set; }
    public string? PostalCode { get; set; }
    public string? Region { get; set; }
    public string? City { get; set; }
    public string? Street { get; set; }
    public string? House { get; set; }
    public string? Office { get; set; }
    public string AddressLine { get; set; } = "";
    public bool Active { get; set; } = true;
    public string? Quantity { get; set; }
}

public class ProductDetailDto
{
    public Guid Id { get; set; }
    public string Status { get; set; } = "draft";
    public string ReviewStatus { get; set; } = "filling";
    public int CurrentStage { get; set; }

    public string? AuthorLastName { get; set; }
    public string? AuthorFirstName { get; set; }
    public string? AuthorMiddleName { get; set; }
    public string? Currency { get; set; }
    public string? Price { get; set; }
    public bool WantsVariants { get; set; }
    public List<string> VariantAxes { get; set; } = new();
    public List<LoyaltyTierDto> LoyaltyTiers { get; set; } = new();
    public List<ShipmentPointDto> ShipmentPoints { get; set; } = new();

    public string? TradeName { get; set; }
    public string? BrandName { get; set; }
    public string? ManufacturerName { get; set; }
    public string? ManufacturerCountry { get; set; }
    public string? ProductIdentifier { get; set; }
    public string? InternalArticle { get; set; }

    public string? Purpose { get; set; }
    public string? KindCode { get; set; }
    public string? KindName { get; set; }
    public string? CategoryCode { get; set; }
    public string? CategoryName { get; set; }
    public string? ProductName { get; set; }
    public string? CategoryPath { get; set; }
    public string? ProductLine { get; set; }

    public string? Description { get; set; }
    public string? Complectation { get; set; }
    public string? ApplicationArea { get; set; }
    public string? StorageConditions { get; set; }
    public string? Precautions { get; set; }

    public string? FullName { get; set; }
    public bool NameIncludesLogo { get; set; }
    public bool NameIncludesType { get; set; }
    public bool NameIncludesBrand { get; set; }
    public bool NameIncludesLine { get; set; }
    public bool NameIncludesModel { get; set; }

    public string? PackType { get; set; }
    public string? PackMaterial { get; set; }
    public string? PackMaterialCustom { get; set; }
    public string? PackBoxNote { get; set; }
    public string? PackCaseNote { get; set; }
    public string? PackBlisterNote { get; set; }
    public string? PackSizeUnit { get; set; }
    public string? PackLength { get; set; }
    public string? PackWidth { get; set; }
    public string? PackHeight { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<CharacteristicValueDto> Values { get; set; } = new();
    public List<FileDto> Files { get; set; } = new();
    public List<VariationDto> Variations { get; set; } = new();
}

public class ProductListItemDto
{
    public Guid Id { get; set; }
    public string Status { get; set; } = "draft";
    public string ReviewStatus { get; set; } = "filling";
    public int CurrentStage { get; set; }
    public string Title { get; set; } = "";
    public string? KindName { get; set; }
    public string? CategoryPath { get; set; }
    public string? Article { get; set; }
    public string? Model { get; set; }
    public string? AuthorLastName { get; set; }
    public string? AuthorFirstName { get; set; }
    public string? AuthorMiddleName { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<VariationDto> Variations { get; set; } = new();
}

public class IdentityDto
{
    public string? AuthorLastName { get; set; }
    public string? AuthorFirstName { get; set; }
    public string? AuthorMiddleName { get; set; }
    public string? TradeName { get; set; }
    public string? BrandName { get; set; }
    public string? ManufacturerName { get; set; }
    public string? ManufacturerCountry { get; set; }
    public string? ProductIdentifier { get; set; }
    public string? InternalArticle { get; set; }
}

public class CategoryDto
{
    public string? Purpose { get; set; }
    public string? KindCode { get; set; }
    public string? ProductName { get; set; }
    public string? CategoryPath { get; set; }
    public string? ProductLine { get; set; }
}

public class DescriptionDto
{
    public string? Description { get; set; }
    public string? Complectation { get; set; }
    public string? ApplicationArea { get; set; }
    public string? StorageConditions { get; set; }
    public string? Precautions { get; set; }
}

public class CharacteristicsDto
{
    public List<CharacteristicValueDto> Values { get; set; } = new();
}

public class NameDto
{
    public string? FullName { get; set; }
    public bool NameIncludesLogo { get; set; }
    public bool NameIncludesType { get; set; }
    public bool NameIncludesBrand { get; set; }
    public bool NameIncludesLine { get; set; }
    public bool NameIncludesModel { get; set; }
}

public class PriceDto
{
    public Guid? VariationId { get; set; }
    public string? Currency { get; set; }
    public string? Price { get; set; }
    public List<LoyaltyTierDto> Discounts { get; set; } = new();
}

public class ShipmentListDto
{
    public Guid? VariationId { get; set; }
    public List<ShipmentPointDto> Items { get; set; } = new();
}

public class VariantAxesDto
{
    public List<string> Codes { get; set; } = new();
}

public class WantsVariantsDto
{
    public bool WantsVariants { get; set; }
}

public class VariationPackagingDto
{
    public string? PackType { get; set; }
    public string? PackMaterial { get; set; }
    public string? PackMaterialCustom { get; set; }
    public string? PackSizeUnit { get; set; }
    public string? PackLength { get; set; }
    public string? PackWidth { get; set; }
    public string? PackHeight { get; set; }
}

public class PackagingDto
{
    public string? PackType { get; set; }
    public string? PackMaterial { get; set; }
    public string? PackMaterialCustom { get; set; }
    public string? PackBoxNote { get; set; }
    public string? PackCaseNote { get; set; }
    public string? PackBlisterNote { get; set; }
    public string? PackSizeUnit { get; set; }
    public string? PackLength { get; set; }
    public string? PackWidth { get; set; }
    public string? PackHeight { get; set; }
}

public class VariationWriteDto
{
    public string? Article { get; set; }
    public string? Model { get; set; }
    public List<CharacteristicValueDto>? Values { get; set; }
}

public class MatchDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Status { get; set; } = "";
    public List<string> Reasons { get; set; } = new();
}
