import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const item_id = 1892;

    const mockData = {
        pruebas: [
            { nominal: 10.0, promedio: 10.3, error: -0.3, incertidumbre: 0.45 },
            { nominal: 30.0, promedio: 29.6, error: 0.4, incertidumbre: 0.45 },
            { nominal: 50.0, promedio: 51.1, error: -1.1, incertidumbre: 0.45 },
            { nominal: 70.0, promedio: 68.8, error: 1.2, incertidumbre: 0.45 },
            { nominal: 80.0, promedio: 80.1, error: -0.1, incertidumbre: 0.45 }
        ]
    };
    
    await supabase.from('service_order_items').update({ magnitud: 'DUREZA', estatus_tecnico: 'Terminado' }).eq('id', item_id);
    
    // We don't use upsert to avoid specifying an id or unique constraint if there is none
    const { data: existing } = await supabase.from('calibration_results').select('id').eq('item_id', item_id).maybeSingle();
    
    if (existing) {
        await supabase.from('calibration_results').update({
            datos_calibracion: mockData,
            puntos_calibrados: 5,
            temp_inicial: 19.8,
            temp_final: 19.8,
            humedad_inicial: 45.9,
            humedad_final: 45.9
        }).eq('id', existing.id);
    } else {
        await supabase.from('calibration_results').insert({
            item_id: item_id,
            datos_calibracion: mockData,
            puntos_calibrados: 5,
            temp_inicial: 19.8,
            temp_final: 19.8,
            humedad_inicial: 45.9,
            humedad_final: 45.9
        });
    }

    console.log(`URL_READY: /resultados/${item_id}`);
}

run();
