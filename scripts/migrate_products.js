const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function classify(p) {
  const text = (p.Name + " " + (p.Description || "")).toLowerCase();
  if (text.includes("модулн")) return "modular";
  if (text.includes("сглобяем")) return "prefab";
  return "container";
}

async function migrate() {
  const dataPath = path.join(__dirname, '../data/raw_data.json');
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  console.log(`Found ${rawData.length} products to migrate...`);

  const productsToInsert = rawData.map(p => ({
    name: p.Name,
    description: p.Description || null,
    price: p.Price || 'Цена по заявка',
    category: classify(p),
    images: p.Images || [],
    specs: p.Specs || {}
  }));

  const { data, error } = await supabase
    .from('products')
    .insert(productsToInsert);

  if (error) {
    console.error("Error migrating products:", error);
  } else {
    console.log("Successfully migrated all products to Supabase!");
  }
}

migrate();
