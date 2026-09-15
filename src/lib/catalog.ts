export type CatalogCategory = { id: string; name: string; color: string; parentId?: string | null };

export const UNITS = [
  "pcs",
  "pack",
  "box",
  "dozen",
  "kg",
  "g",
  "L",
  "ml",
  "bottle",
  "can",
  "plate",
  "bowl",
  "cup",
  "glass",
  "skewer",
  "karahi",
];

export function parentCategories(cats: CatalogCategory[]) {
  return cats.filter((c) => !c.parentId);
}

export function childCategories(cats: CatalogCategory[], parentId: string) {
  return cats.filter((c) => c.parentId === parentId);
}

export function categoryBranchIds(cats: CatalogCategory[], id: string) {
  return [id, ...cats.filter((c) => c.parentId === id).map((c) => c.id)];
}

export function inCategoryBranch(cats: CatalogCategory[], categoryId: string | null | undefined, selected: string) {
  if (!categoryId) return false;
  return categoryBranchIds(cats, selected).includes(categoryId);
}

export function splitCategory(cats: CatalogCategory[], categoryId: string | null | undefined) {
  const row = cats.find((c) => c.id === categoryId);
  if (!row) return { parentId: "", childId: "" };
  if (row.parentId) return { parentId: row.parentId, childId: row.id };
  return { parentId: row.id, childId: "" };
}

export function categoryLabel(cats: CatalogCategory[], categoryId: string | null | undefined) {
  const row = cats.find((c) => c.id === categoryId);
  if (!row) return "";
  if (!row.parentId) return row.name;
  const parent = cats.find((c) => c.id === row.parentId);
  return parent ? `${parent.name} / ${row.name}` : row.name;
}
