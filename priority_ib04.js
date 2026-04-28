const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const url = 'https://bauportal.bg/novi-mashini/12555/toaletna-furgon-bautrax-b04';
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const specs = {};
  $('.prop-row').each((i, el) => {
    const key = $(el).find('.prop-name').text().replace(':', '').trim();
    const value = $(el).find('.prop-value').text().trim();
    if (key && value) specs[key] = value;
  });

  let description = "";
  // Collect title + body text from description area
  $("h2, p, ul").each((i, el) => {
    const text = $(el).text().trim();
    if (text.includes("İB04") || text.includes("Модулен") || text.includes("Предимства") || text.includes("Приложение") || text.length > 50) {
       if ($(el).is('ul')) {
          $(el).find('li').each((j, li) => {
            description += "• " + $(li).text().trim() + "\n";
          });
          description += "\n";
       } else if (!text.includes("Мнение") && !text.includes("Често")) {
          description += text + "\n\n";
       }
    }
  });

  await supabase.from('products')
    .update({ description: description.trim(), specs: specs })
    .ilike('name', '%İB04%');

  console.log('İB04 Priority Update Completed!');
}
run();
