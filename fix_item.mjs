import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    const { data: orders } = await supabase.from('service_orders').select('id').limit(1);
    if (!orders || orders.length === 0) {
        console.log("No orders found");
        return;
    }
    const orderId = orders[0].id;

    await supabase.from('service_order_items').update({ orden_id: orderId }).eq('id', 1892);
    console.log("Fixed item 1892 with orderId:", orderId);
}

fix();
