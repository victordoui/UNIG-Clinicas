import React from "react";
import { OptionBadge } from "@/components/ui/select";
import { PRODUCT_CATEGORY_OPTIONS, getOptionMeta, getOptions } from "@/lib/optionCatalog";

export const categoryLabels: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORY_OPTIONS.map((category) => [category.value, category.label])
);

export const categories = getOptions("productCategory");

export const getCategoryBadge = (category: string) => {
  const meta = getOptionMeta("productCategory", category, category || "N/A");
  return React.createElement(OptionBadge, {
    domain: "productCategory",
    value: meta.value,
    label: meta.label,
  });
};
