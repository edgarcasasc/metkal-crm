const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

// Use ANON key to check if we can read test profile with RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testRLS() {
  const email = 'ovidio@acclaroflow.com'
  
  // Try to read profile
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', email)
    .single()
    
  console.log("Result with ANON KEY:", { data, error })
}
testRLS();
