const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
};

const CATEGORIES = [
  {
    category: "container",
    url: "https://bauportal.bg/novi-mashini/cat-509/furgoni-i-konteyneri",
  },
  {
    category: "prefab",
    url: "https://bauportal.bg/cat-2879/sglobyaemi-kashti",
  },
  {
    category: "modular",
    url: "https://bauportal.bg/cat-2885/modulni-kashti",
  },
];

const DRY_RUN = process.env.DRY_RUN === "1";

function cleanText(value) {
  return (value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMultiline(value) {
  return (value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function absoluteUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `https://bauportal.bg${url}`;
}

function canonicalName(listingTitle) {
  return cleanText((listingTitle || "").split(",")[0] || "");
}

function normalizeKey(value) {
  return cleanText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")
    .replace(/²/g, "2")
    .replace(/[^A-Za-z0-9А-Яа-я]+/g, "")
    .toUpperCase();
}

function modelKeyFromName(name) {
  const match = cleanText(name).match(/bautrax\s+(.+)$/i);
  const tail = match ? match[1] : name;
  return normalizeKey(tail);
}

function modelKeyFromSpecs(specs) {
  const model = specs["Модел"] || specs.Model || specs["модел"] || "";
  return model ? normalizeKey(model) : "";
}

function normalizePrice(priceText) {
  const price = cleanText(priceText);
  if (!price) return "Цена по заявка";
  if (/по договаряне/i.test(price)) return "Цена по заявка";
  return cleanText(
    price
      .split("/")[0]
      .replace(/Посочената цена.*$/i, "")
      .trim()
  );
}

function formatDescriptionBlock($, root) {
  const blocks = [];

  root.contents().each((_, node) => {
    if (node.type === "text") {
      const text = cleanText($(node).text());
      if (text) blocks.push(text);
      return;
    }

    if (node.type !== "tag") return;

    const tag = node.tagName.toLowerCase();
    const el = $(node);

    if (/^h[1-6]$/.test(tag) || tag === "p") {
      const text = cleanText(el.text());
      if (text) blocks.push(text);
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items = el
        .find("li")
        .map((__, li) => `• ${cleanText($(li).text())}`)
        .get()
        .filter(Boolean);
      if (items.length) blocks.push(items.join("\n"));
      return;
    }

    const nested = formatDescriptionBlock($, el);
    if (nested) blocks.push(nested);
  });

  return cleanMultiline(blocks.join("\n\n"));
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} for ${url}`);
  }
  return response.text();
}

async function collectListings(category, baseUrl) {
  const items = [];

  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const pageItems = $(".listing-products .product-row")
      .map((_, el) => {
        const title = cleanText($(el).find(".info-title_v").text());
        const href = $(el).find(".info-title_v").attr("href");
        return {
          category,
          listingTitle: title,
          name: canonicalName(title),
          url: absoluteUrl(href),
        };
      })
      .get()
      .filter((item) => item.name && item.url);

    if (!pageItems.length) break;

    items.push(...pageItems);

    if (pageItems.length < 24) break;
  }

  const deduped = [];
  const seen = new Set();

  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    deduped.push(item);
  }

  return deduped;
}

async function parseProductDetail(listing) {
  const html = await fetchHtml(listing.url);
  const $ = cheerio.load(html);

  const title = cleanText($("h1").first().text()) || listing.name;
  const descriptionRoot = $(".description-txt .column .row").first();
  const description = descriptionRoot.length
    ? formatDescriptionBlock($, descriptionRoot)
    : "";

  const specs = {};
  $(".primary-products-car .row, .middle-product-part .column > .row").each((_, el) => {
    const spans = $(el).children("span");
    if (spans.length < 2) return;

    const key = cleanText($(spans[0]).text()).replace(/:$/, "");
    const value = cleanText($(spans[spans.length - 1]).text());

    if (!key || !value) return;
    specs[key] = value;
  });

  const images = $(".product-images-slider .swiper-slide")
    .map((_, el) => {
      const large = $(el).attr("data-img");
      const fallback = $(el).find("img").attr("src");
      return absoluteUrl(large || fallback || "");
    })
    .get()
    .filter(Boolean)
    .filter((url, index, arr) => arr.indexOf(url) === index);

  const priceText = cleanText($(".end-product-part .price span").first().text());

  return {
    category: listing.category,
    url: listing.url,
    name: listing.name,
    sourceTitle: title,
    price: normalizePrice(priceText),
    images,
    specs,
    description,
    isPromo: images.some((image) => image.toLowerCase().includes("sale")),
    modelKey: modelKeyFromSpecs(specs) || modelKeyFromName(listing.name),
  };
}

function rankMatch(row, source) {
  const nameKey = normalizeKey(row.name);
  const sourceNameKey = normalizeKey(source.name);
  const rowModelKey = modelKeyFromSpecs(row.specs || {}) || modelKeyFromName(row.name);

  if (row.category !== source.category) return -1;
  if (nameKey === sourceNameKey) return 100;
  if (rowModelKey && source.modelKey && rowModelKey === source.modelKey) return 80;
  if (rowModelKey && source.modelKey && nameKey.includes(source.modelKey)) return 60;
  return -1;
}

function findBestMatch(rows, source, matchedIds) {
  const candidates = rows
    .filter((row) => !matchedIds.has(row.id))
    .map((row) => ({ row, score: rankMatch(row, source) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.row || null;
}

async function main() {
  console.log("Collecting live Bauportal listings...");
  console.log(`Dry run: ${DRY_RUN ? "yes" : "no"}`);

  const liveListings = (
    await Promise.all(CATEGORIES.map(({ category, url }) => collectListings(category, url)))
  ).flat();

  console.log(`Found ${liveListings.length} live listings.`);

  const { data: existingRows, error: existingError } = await supabase
    .from("products")
    .select("id, name, category, specs, is_promo, status");

  if (existingError) {
    throw existingError;
  }

  const matchedIds = new Set();
  let inserted = 0;
  let updated = 0;

  for (const listing of liveListings) {
    console.log(`Syncing ${listing.category}: ${listing.name}`);
    const parsed = await parseProductDetail(listing);
    const bestMatch = findBestMatch(existingRows, parsed, matchedIds);

    if (bestMatch) {
      matchedIds.add(bestMatch.id);

      if (!DRY_RUN) {
        const { error } = await supabase
          .from("products")
          .update({
            name: parsed.name,
            category: parsed.category,
          price: parsed.price,
          images: parsed.images,
          specs: parsed.specs,
          description: parsed.description || null,
          is_promo: parsed.isPromo,
          status: "published",
        })
        .eq("id", bestMatch.id);

        if (error) throw error;
      }
      updated++;
      continue;
    }

    if (!DRY_RUN) {
      const { error } = await supabase.from("products").insert([
        {
          name: parsed.name,
          category: parsed.category,
        price: parsed.price,
        images: parsed.images,
        specs: parsed.specs,
        description: parsed.description || null,
        status: "published",
        is_promo: parsed.isPromo,
      },
    ]);

      if (error) throw error;
    }
    inserted++;
  }

  const rowsToDraft = existingRows.filter(
    (row) =>
      (row.category === "container" || row.category === "prefab" || row.category === "modular") &&
      !matchedIds.has(row.id) &&
      row.status !== "draft"
  );

  for (const row of rowsToDraft) {
    if (!DRY_RUN) {
      const { error } = await supabase
        .from("products")
        .update({ status: "draft" })
        .eq("id", row.id);

      if (error) throw error;
    }
  }

  console.log(
    JSON.stringify(
      {
        liveListings: liveListings.length,
        updated,
        inserted,
        drafted: rowsToDraft.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
