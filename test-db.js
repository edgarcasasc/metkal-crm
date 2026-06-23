import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  if (error) {
    console.error("Error perfiles:", error)
  } else {
    console.log("Profiles data:", data)
  }
}

testProfiles();
