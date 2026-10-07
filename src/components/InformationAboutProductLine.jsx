import { useEffect, useState } from "react";
import { productsApi } from "../api";
import "./InformationAboutProductLine.css";

export function lineProductDisplayName(product) {
  if (!product) return "";
  const stored = String(product.fullName || "").trim();
  if (stored) return stored;
  return [product.productName, product.brandName, product.productLine]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
}

function logoUrlFromProduct(product) {
  if (!product) return "";
  const logo = (product.files || []).find(
    (file) => file.role === "logo" && !file.variationId,
  );
  return logo?.url || "";
}

export default function VariantFlowHeader({ product, productId }) {
  const [fetched, setFetched] = useState(null);

  useEffect(() => {
    if (product || !productId) {
      setFetched(null);
      return;
    }
    let cancelled = false;
    productsApi
      .get(productId)
      .then((data) => {
        if (!cancelled) setFetched(data);
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      });
    return () => {
      cancelled = true;
    };
  }, [product, productId]);

  const resolved = product || fetched;
  const name = lineProductDisplayName(resolved);
  const logoUrl = logoUrlFromProduct(resolved);

  return (
    <div className="divOne">
      <h1 className="hOne">
        Информация о линейке продукта
      </h1>
    </div>
  );
}
