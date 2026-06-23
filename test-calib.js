import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function test() {
  const { data, error } = await supabase.from('calibration_results').select('*').limit(5)
  if (error) {
    console.error("Error:", error)
  } else {
    console.log("Results:", JSON.stringify(data, null, 2))
  }
}

test();
