const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('products').select('name, specs');
  console.log("TOTAL PRODUCTS:", data.length);
  const empty = data.filter(p => !p.specs || Object.keys(p.specs).length === 0);
  console.log("EMPTY PRODUCTS:", empty.length);
  console.log("EMPTY LIST:", empty.map(p => p.name));
}
run();
