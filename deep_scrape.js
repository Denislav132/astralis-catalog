const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const categories = [
  "https://bauportal.bg/cat-509/furgoni-i-konteyneri",
  "https://bauportal.bg/cat-2879/sglobyaemi-kashti",
  "https://bauportal.bg/cat-2885/modulni-kashti"
];

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function deepScrape() {
  console.log("Starting FINAL DEEP SCRAPE with Name Updates...");

  const { data: dbProducts } = await supabase.from('products').select('id, name, specs');
  const matchedIds = new Set();

  for (const catUrl of categories) {
    for (let page = 1; page <= 4; page++) {
      const pageUrl = page === 1 ? catUrl : `${catUrl}?page=${page}`;
      console.log(`Deep crawling: ${pageUrl}`);
      
      try {
        const res = await fetch(pageUrl, { headers });
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const links = [];
        $("a[href*='/novi-mashini/']").each((i, el) => {
          const href = $(el).attr('href');
          if (href && !href.includes('/cat-') && href.match(/\/\d+\//)) {
            links.push(href.startsWith('http') ? href : `https://bauportal.bg${href}`);
          }
        });

        for (const url of [...new Set(links)]) {
          const pRes = await fetch(url, { headers });
          const pHtml = await pRes.text();
          const p$ = cheerio.load(pHtml);
          
          const rawTitle = p$("h1").first().text().trim();
          const sourceName = rawTitle.split(',')[0].trim();
          
          // Match logic
          const parts = sourceName.split(' ');
          const modelCode = parts.find(p => p.match(/[A-Z]\d+/) || (p.match(/^\d+$/) && p.length > 1));
          
          // Find an UNMATCHED product that matches this model code or name
          const target = dbProducts.find(p => 
            !matchedIds.has(p.id) && (
              p.name === sourceName || 
              (modelCode && p.name.includes(modelCode)) ||
              (p.name === 'Контейнер Bautrax' && sourceName.includes('Bautrax')) ||
              (p.name.includes('Жилищен контейнер') && sourceName.includes('Bautrax'))
            )
          );

          if (target) {
            console.log(`MATCH & RENAME: ${target.name} -> ${sourceName}`);
            matchedIds.add(target.id);
            
            const specs = {};
            p$(".prop-row").each((i, el) => {
              const k = p$(el).find(".prop-name").text().replace(":","").trim();
              const v = p$(el).find(".prop-value").text().trim();
              if (k && v) specs[k] = v;
            });

            let description = p$(".product-description").text().trim();
            if (!description) {
              p$("p, ul").each((i, el) => {
                const t = p$(el).text().trim();
                if (t.length > 50 && !t.includes("Мнение")) description += t + "\n\n";
              });
            }
            description = description.replace(/\t/g, '').replace(/\n\s*\n/g, '\n\n').trim();

            await supabase.from('products').update({
              name: sourceName,
              specs: specs,
              description: description,
              status: 'published'
            }).eq('id', target.id);
          }
        }
      } catch (e) {
        console.error(`Error on ${pageUrl}: ${e.message}`);
      }
    }
  }
  console.log("Deep Scrape & Rename Finished!");
}

deepScrape();
