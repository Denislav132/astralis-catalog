const fs = require('fs');
const path = require('path');

const rawDataPath = path.join(__dirname, '../data/raw_data.json');
const publicProductsDir = path.join(__dirname, '../public/products');

if (!fs.existsSync(publicProductsDir)) {
  fs.mkdirSync(publicProductsDir, { recursive: true });
}

let rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));

async function fetchHtml(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function main() {
  let updatedCount = 0;
  for (let i = 0; i < rawData.length; i++) {
    const product = rawData[i];
    if (product.Images && product.Images.length > 0) {
      let imageUrl = product.Images[0];
      
      if (imageUrl.startsWith('/products/')) {
        continue;
      }
      
      const idMatch = imageUrl.match(/products\/(\d+)\//);
      const id = idMatch ? idMatch[1] : null;

      if (!id) continue;

      try {
        console.log(`[${i}/${rawData.length}] Processing product ID ${id}...`);
        
        // Use the old ID to let the site redirect us to the current product page
        const html = await fetchHtml(`https://bauportal.bg/novi-mashini/${id}/x`);
        
        // Find the thumbnail image in the HTML
        const imgMatch = html.match(/https:\/\/static\.bauportal\.bg\/images\/products\/(\d+)\/320_([^\"]+)/);
        
        if (!imgMatch) {
          console.log(`  -> No image found in HTML for product ${id}`);
          continue;
        }

        const prefix = imgMatch[1];
        const basename = imgMatch[2];
        const highResUrl = `https://static.bauportal.bg/images/products/${prefix}/800_${basename}`;
        
        const ext = basename.includes('.webp') ? '' : '.webp'; // ensure webp extension or keep it
        const filename = `${id}_${basename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const destPath = path.join(publicProductsDir, filename);
        const localUrl = `/products/${filename}`;

        if (fs.existsSync(destPath)) {
          console.log(`  -> [SKIP] Already downloaded: ${filename}`);
          product.Images[0] = localUrl;
          updatedCount++;
          continue;
        }

        console.log(`  -> Downloading ${highResUrl}...`);
        const response = await fetch(highResUrl, {
          headers: {
            'Referer': 'https://bauportal.bg/',
            'User-Agent': 'Mozilla/5.0'
          }
        });

        if (!response.ok) {
           throw new Error(`Failed to download image HTTP ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
        
        product.Images[0] = localUrl;
        updatedCount++;

        // Save progress occasionally
        if (updatedCount % 5 === 0) {
          fs.writeFileSync(rawDataPath, JSON.stringify(rawData, null, 2));
        }

      } catch (error) {
        console.error(`  -> [ERROR] ${error.message}`);
      }
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(rawDataPath, JSON.stringify(rawData, null, 2));
    console.log(`\nDone. Successfully downloaded and mapped ${updatedCount} images.`);
  } else {
    console.log(`\nDone. No new images downloaded.`);
  }
}

main();
