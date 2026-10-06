using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductCard.Api.Data;

namespace ProductCard.Api.Controllers;

[ApiController]
[Route("api/catalog")]
public class CatalogController : ControllerBase
{
    private static readonly Dictionary<string, (string Value, string Label)[]> UnitGroups = new()
    {
        ["weight"] = [("gram", "Грамм"), ("kilogram", "Килограмм")],
        ["tolerance"] = [("gram", "Грамм"), ("percent", "%")],
        ["dimension"] = [("millimeters", "Миллиметры"), ("centimeters", "Сантиметры")],
        ["duration"] = [("days", "дней"), ("months", "месяцев"), ("years", "лет")]
    };

    private readonly AppDbContext _db;

    public CatalogController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var kinds = await _db.ProductKinds
            .AsNoTracking()
            .Include(kind => kind.Category)
            .Include(kind => kind.Characteristics)
                .ThenInclude(link => link.Definition)
            .Include(kind => kind.Characteristics)
                .ThenInclude(link => link.Options)
            .OrderBy(kind => kind.Category.SortOrder)
            .ThenBy(kind => kind.SortOrder)
            .ToListAsync();

        var categories = kinds
            .GroupBy(kind => kind.Category.Code)
            .Select(group =>
            {
                var category = group.First().Category;
                return new
                {
                    code = category.Code,
                    name = category.Name,
                    kinds = group.Select(kind => new
                    {
                        code = kind.Code,
                        name = kind.Name,
                        categoryCode = category.Code,
                        categoryName = category.Name,
                        categoryPath = $"Стоматология > {category.Name} > {kind.Name}",
                        characteristics = kind.Characteristics
                            .OrderBy(link => link.Definition.GroupOrder)
                            .ThenBy(link => link.SortOrder)
                            .Select(link => new
                            {
                                code = link.Definition.Code,
                                name = link.Definition.Name,
                                group = link.Definition.GroupName,
                                groupOrder = link.Definition.GroupOrder,
                                inputType = link.InputType,
                                allowCustom = link.AllowCustom,
                                unitGroup = link.UnitGroup,
                                required = link.IsRequired,
                                options = link.Options
                                    .OrderBy(option => option.SortOrder)
                                    .Select(option => new { value = option.Value, label = option.Label })
                            })
                    })
                };
            });

        return Ok(new
        {
            categories,
            unitGroups = UnitGroups.ToDictionary(
                pair => pair.Key,
                pair => pair.Value.Select(option => new { value = option.Value, label = option.Label }))
        });
    }
}
