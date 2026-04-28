const fs = require('fs');
const path = require('path');
const http = require('http');

const rawDataPath = path.join(__dirname, '../data/raw_data.json');
const publicProductsDir = path.join(__dirname, '../public/products');

if (!fs.existsSync(publicProductsDir)) {
  fs.mkdirSync(publicProductsDir, { recursive: true });
}

let rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
let targetImages = [];

for (let i = 0; i < rawData.length; i++) {
  const product = rawData[i];
  if (product.Images && product.Images.length > 0) {
    const imageUrl = product.Images[0];
    if (imageUrl.startsWith('http') && imageUrl.includes('bauportal')) {
      const match = imageUrl.match(/products\/(\d+)\//) || imageUrl.match(/_(\d+)-image-/);
      const id = match ? match[1] : `img_${i}`;
      const ext = imageUrl.includes('.webp') ? '.webp' : '.jpg';
      const filename = `${id}${ext}`;
      const destPath = path.join(publicProductsDir, filename);

      if (!fs.existsSync(destPath)) {
        targetImages.push({
          url: imageUrl,
          filename: filename,
          index: i
        });
      } else {
        // If it exists, update json and save
        rawData[i].Images[0] = `/products/${filename}`;
      }
    }
  }
}
// Save any paths we just marked as existing
fs.writeFileSync(rawDataPath, JSON.stringify(rawData, null, 2));

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename, x-index');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/targets') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(targetImages));
  } else if (req.url === '/upload' && req.method === 'POST') {
    let body = '';
    req.setEncoding('base64');
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      const filename = req.headers['x-filename'];
      const indexStr = req.headers['x-index'];
      if (filename && indexStr) {
        const destPath = path.join(publicProductsDir, filename);
        fs.writeFileSync(destPath, Buffer.from(body, 'base64'));
        
        const i = parseInt(indexStr, 10);
        rawData[i].Images[0] = `/products/${filename}`;
        fs.writeFileSync(rawDataPath, JSON.stringify(rawData, null, 2));
        
        console.log(`[SAVED] ${filename}`);
      }
      res.writeHead(200);
      res.end('ok');
    });
  } else if (req.url === '/' || req.url === '/ui') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <h1>Downloader Running...</h1>
          <div id="status">Starting...</div>
          <script>
            async function run() {
              const status = document.getElementById('status');
              try {
                const res = await fetch('/targets');
                const targets = await res.json();
                status.innerText = 'Found ' + targets.length + ' images to download.';
                
                for (const t of targets) {
                  status.innerText = 'Fetching ' + t.url + '...';
                  try {
                    const imgRes = await fetch(t.url, { 
                      referrerPolicy: 'no-referrer-when-downgrade' 
                    });
                    if (!imgRes.ok) throw new Error(imgRes.statusText);
                    const blob = await imgRes.blob();
                    
                    const reader = new FileReader();
                    const b64Promise = new Promise(resolve => {
                      reader.onloadend = () => {
                        resolve(reader.result.split(',')[1]);
                      }
                    });
                    reader.readAsDataURL(blob);
                    const base64data = await b64Promise;

                    await fetch('/upload', {
                      method: 'POST',
                      headers: {
                        'x-filename': t.filename,
                        'x-index': t.index.toString()
                      },
                      body: base64data
                    });
                    status.innerText = 'Saved ' + t.filename;
                    
                    // Wait 100ms
                    await new Promise(r => setTimeout(r, 100));
                  } catch (e) {
                    console.error('Failed to download', t.url, e);
                  }
                }
                status.innerText = 'All done! You can close this page.';
              } catch (e) {
                status.innerText = 'Error: ' + e.message;
              }
            }
            run();
          </script>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('Download server running on http://localhost:3000');
  if (targetImages.length === 0) {
    console.log('No images need downloading.');
    process.exit(0);
  } else {
    console.log(`Waiting for browser to visit http://localhost:3000 to process ${targetImages.length} images...`);
  }
});
