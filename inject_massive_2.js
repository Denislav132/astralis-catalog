const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const batch2Data = [
  {
    "name": "Сглобяема къща Bautrax 70-2 M2 STEEL",
    "specs": { "Марка": "BAUTRAX", "Модел": "70-2 M2 STEEL", "Произход": "ТУРЦИЯ", "Площ, м2": "70", "Дължина, мм": "9670", "Ширина, мм": "7170", "Брой етажи": "1", "Гаранция": "12 МЕСЕЦА" },
    "description": "70-2 M2 STEEL: Устойчиво и икономично решение за жилище. Изработена от висококачествена стомана, тази къща предлага съвременен дизайн и бърз монтаж."
  },
  {
    "name": "Сглобяема къща Bautrax 86 M2 STEEL",
    "specs": { "Марка": "BAUTRAX", "Модел": "86 M2 STEEL", "Произход": "Турция", "Площ, м2": "87", "Дължина, мм": "9660", "Ширина, мм": "8950", "Брой етажи": "1", "Гаранция": "12 месеца" },
    "description": "86 M2 STEEL: Модерна стоманена къща с повече пространство. Идеална за семейства, търсещи енергийна ефективност и здравина."
  },
  {
    "name": "Сглобяема къща Bautrax B100",
    "specs": { "Марка": "BAUTRAX", "Модел": "B100", "Произход": "ТУРЦИЯ", "Площ, м2": "100", "Дължина, мм": "12680", "Ширина, мм": "7910", "Гаранция": "12 МЕСЕЦА" },
    "description": "B100: Проектирана за семейства с големи изисквания. Предлага три спални и голяма всекидневна."
  },
  {
    "name": "Сглобяема къща Bautrax B105",
    "specs": { "Марка": "BAUTRAX", "Модел": "B105", "Произход": "ТУРЦИЯ", "Площ, м2": "105", "Дължина, мм": "11425", "Ширина, мм": "8915", "Гаранция": "12 МЕСЕЦА" },
    "description": "B105: Простор и уют в едно. Къщата е проектирана да издържа на екстремни климатични условия."
  },
  {
    "name": "Сглобяема къща Bautrax B142",
    "specs": { "Марка": "BAUTRAX", "Модел": "B142", "Произход": "Турция", "Площ, м2": "142", "Брой етажи": "2", "Гаранция": "12 месеца" },
    "description": "B142: Двуетажна луксозна къща с 4 спални. Предлага комфорт и сигурност за голямо семейство."
  },
  {
    "name": "Модулна къща Bautrax 21 M²",
    "specs": { "Марка": "BAUTRAX", "Модел": "21 M²", "Произход": "Турция", "Площ, м2": "21", "Гаранция": "12 месеца" },
    "description": "21 M²: Модулно решение за малък офис или жилище. Преносима и лесна за инсталиране."
  },
  {
    "name": "Модулна къща Bautrax Composite Coating",
    "specs": { "Марка": "BAUTRAX", "Модел": "Composite Coating", "Произход": "Турция", "Гаранция": "12 месеца" },
    "description": "Composite Coating: Луксозна визия с композитни панели. Устойчива на външни влияния и много красива."
  },
  {
    "name": "Zhilishten konteyner Bautrax MB01",
    "specs": { "Марка": "BAUTRAX", "Модел": "MB01", "Произход": "Турция", "Размери": "2.40 x 6.00 x 2.60 м", "Гаранция": "12 месеца" },
    "description": "MB01: Стандартен жилищен контейнер с PVC дограма и ел. инсталация."
  }
];

async function updateDB() {
  console.log("Injecting Massive Scrape Batch 2...");
  for (const item of batch2Data) {
    const model = item.specs['Модел'] || item.name;
    const { error } = await supabase
      .from('products')
      .update({
        name: item.name,
        specs: item.specs,
        description: item.description
      })
      .ilike('name', `%${model}%`);
    
    if (error) console.error(`Error updating ${item.name}:`, error.message);
    else console.log(`SUCCESS: ${item.name}`);
  }
}
updateDB();
