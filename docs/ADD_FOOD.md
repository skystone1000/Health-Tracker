# How to add one food (or one dish) to Nourish

Self-contained guide — you should not need to read the rest of the project to
use it. Pair with [ADD_EXERCISE.md](ADD_EXERCISE.md) and
[ADD_YOGA_ASANA.md](ADD_YOGA_ASANA.md), which follow the same shape.

**File to edit:** `public/data/foods.default.json` (an array of food objects).
Recipes live in `public/data/recipes.default.json`.

---

## 1. Ingredient or dish?

| | `itemType: "ingredient"` | `itemType: "dish"` |
|---|---|---|
| What it is | A raw or single-component food — onion, rava, ghee, masoor dal | A composed preparation — upma, bhindi sabji, idli |
| Needs a recipe? | No | **Yes** — a recipe with the **same `id`** |
| `mealTypes` | Optional | **Required** (at least one) |

A dish exists twice on purpose: as a food with its own nutrient panel (so it can
be logged in one tap) and as a recipe (so you can cook it). They are linked by
convention: **the recipe's `id` equals the dish food's `id`.**

---

## 2. The data shape

```jsonc
{
  "id": "bhindi-sabji",                  // kebab-case, unique, never reused
  "name": "Bhindi Sabji",
  "aliases": ["Bhendichi bhaji", "Bhindi ki sabzi", "Okra sabzi"],
  "category": "Vegetables",              // must be one of FOOD_CATEGORIES below
  "dietTypes": ["veg", "vegan"],         // vegan implies veg; see §4
  "allergens": ["milk"],                 // free strings: milk, gluten, wheat, peanut, tree nut, soy
  "servingUnit": "g",                    // "ml" for liquids
  "referenceQuantity": 100,
  "nutrients": { "energy_kcal": 0, "macros": {…}, "vitamins": {…}, "minerals": {…} },
  "evidences": [ { "source": "", "ref": "", "value_seen": "", "url": "" } ],
  "verification": { "status": "verified", "confidence": "high", "lastReviewed": "2026-09-18" },
  "source": "default",
  "editable": true,

  "mealTypes": ["lunch", "dinner", "side"],
  "region": "Pan-Indian",
  "prep": "sauteed",
  "itemType": "dish"
}
```

**All 24 nutrient keys must be present**, even when zero — the engine reads them
positionally and a missing key fails schema validation. Use `0` only for a
genuine zero (vitamin B12 in any plant food), never for "I don't know".

- `macros` (5): `protein_g` `carbs_g` `fiber_g` `fat_g` `sugar_g`
- `vitamins` (10): `vit_a_ug` `vit_c_mg` `vit_d_ug` `thiamin_b1_mg`
  `riboflavin_b2_mg` `niacin_b3_mg` `folate_b9_ug` `vit_b12_ug` `vit_e_mg` `vit_k_ug`
- `minerals` (8): `calcium_mg` `iron_mg` `magnesium_mg` `potassium_mg`
  `sodium_mg` `zinc_mg` `phosphorus_mg` `selenium_ug`

---

## 3. The enums

Defined in `src/core/schema.ts`. Seed data must use these exact values
(`core/data.test.ts` enforces `category`).

- **`FOOD_CATEGORIES`** — Grains & Cereals · Legumes & Pulses · Vegetables ·
  Fruits · Dairy · Eggs · Meat & Seafood · Nuts, Seeds & Dry Fruits ·
  Fats & Oils · Spices & Condiments · Sweets & Desserts · Beverages
- **`MEAL_TYPES`** — breakfast · lunch · dinner · snack · dessert · side
- **`FOOD_REGIONS`** — Maharashtrian · South Indian · North Indian · Gujarati ·
  Bengali · Punjabi · Pan-Indian · Global
- **`PREP_STYLES`** — raw · boiled · steamed · sauteed · fried · deepFried ·
  fermented · roasted · baked · dried
- **`ITEM_TYPES`** — ingredient · dish

To add a value, edit the list in `schema.ts` — grouping, filters and the UI all
read from it, so nothing else needs touching.

### Regional names

Put them in `aliases` as **plain ASCII transliterations** — `"Bhoplyachi bhaji"`,
not `"भोपळ्याची भाजी"`. No native scripts: they need fonts the app does not ship.
`aliases` is already searchable, so this makes the food findable by any local name.

---

## 4. Diet tags

`vegan ⊂ veg ⊂ nonveg` in terms of who sees what:

- Contains dairy (ghee, curd, paneer, milk) → `["veg"]`
- Purely plant → `["veg", "vegan"]`
- Meat, fish or egg → `["nonveg"]`

A **veg or vegan recipe may not contain an ingredient that breaks that claim** —
enforced by `data.test.ts`. (A `nonveg` recipe may contain anything; `nonveg`
means "shown to everyone", not "must contain meat".)

---

## 5. Sourcing rules

| Verification status | Minimum evidences |
|---|---|
| `verified` | **3** |
| `needsReview` / `unverified` | **2** |

Priority of sources: **IFCT 2017 (ICMR-NIN)** → **USDA FoodData Central** →
**INDB** → Open Food Facts / Nutritionix (corroboration only, never the sole source).

**URL policy** — every evidence needs a URL that lands on *the item*:

- Known record id → link the record:
  `https://fdc.nal.usda.gov/food-details/169756/nutrients`
- No verified id → an item-specific search URL:
  `https://fdc.nal.usda.gov/food-search?query=okra%2C%20raw`
- **Never** invent a record id to make a link look more precise than the
  evidence behind it. Bare homepages are rejected by `data.test.ts`.

If you cannot find three independent sources, ship it as `needsReview` with two.
Do not invent a third — the "⚠ Needs review" badge is there for exactly this.

---

## 6. If it's a dish, add the recipe too

Same `id` as the dish food. In `public/data/recipes.default.json`:

```jsonc
{
  "id": "bhindi-sabji",                  // === the dish food's id
  "name": "Bhindi Sabji",
  "cuisine": "Indian",
  "dietTypes": ["veg", "vegan"],
  "baseFoodIds": ["okra-raw", "onion-raw"],
  "servings": 3,
  "ingredients": [ { "foodId": "okra-raw", "quantity": 250 } ],
  "steps": ["…"],
  "notes": "Never cover the pan — trapped steam is what makes bhindi slimy.",
  "yieldGrams": 220,                     // COOKED weight of the whole recipe
  "references": [
    { "title": "…", "source": "…", "url": "https://…", "kind": "recipe" }
  ],
  "mealTypes": ["lunch", "dinner", "side"],
  "region": "Pan-Indian",
  "source": "default"
}
```

**`yieldGrams` matters.** It is the cooked weight, which is *not* the sum of the
ingredients: khichdi and upma absorb water and weigh more; sabjis and deep-fried
items lose water and weigh less. `data.test.ts` uses it to check the dish food's
energy against its recipe within **±25 %**, so a wrong yield fails the build.

Every recipe needs **at least one `reference`** with a usable URL.

---

## 7. Verify

```bash
npm run typecheck && npm test && npm run build
```

`src/core/data.test.ts` will tell you specifically if: a nutrient key is missing,
the category is not in the enum, evidence count is below the threshold for the
status, a URL is a bare homepage, a dish has no `mealTypes`, a recipe references
a food id that does not exist, a veg/vegan claim is broken by an ingredient, or a
dish disagrees with its recipe by more than 25 %.

Then open the Food database in the browser and confirm the new item appears under
the right group when you switch **Group by** to Category, Meal type and Region.
