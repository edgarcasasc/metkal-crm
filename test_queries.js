require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function runTests() {
  console.log('Testing specific dashboard queries...');
  try {
    let start = Date.now();
    console.log('1. Quotes count...');
    const q1 = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('estatus', 'En Revisión');
    console.log('Quotes done in', Date.now() - start, 'ms', q1.error || `Count: ${q1.count}`);

    start = Date.now();
    console.log('2. Service orders count...');
    const q2 = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).neq('estatus', 'Terminado');
    console.log('Orders done in', Date.now() - start, 'ms', q2.error || `Count: ${q2.count}`);

    start = Date.now();
    console.log('3. Profiles query...');
    const q3 = await supabase.from('profiles').select('role').limit(1);
    console.log('Profiles done in', Date.now() - start, 'ms', q3.error || `Rows: ${q3.data.length}`);

  } catch (err) {
    console.error('Exception during tests:', err);
  }
}

runTests();
