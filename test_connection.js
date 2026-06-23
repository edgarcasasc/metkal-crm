require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function testConnection() {
  console.log('Testing connection to Supabase...');
  try {
    const start = Date.now();
    const { data, error } = await supabase.from('service_orders').select('id').limit(1);
    
    if (error) {
      console.error('Error in query:', error);
    } else {
      console.log('Query successful! Rows:', data.length, 'Time:', Date.now() - start, 'ms');
    }
  } catch (err) {
    console.error('Exception during query:', err);
  }
}

testConnection();
