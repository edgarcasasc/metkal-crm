'use client';

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area
} from 'recharts';

export default function CertificateChart({ data }: { data: any[] }) {
  return (
    <div className="h-64 w-full border border-slate-100 rounded p-2 print:border-none print:h-[5cm]">
      <h4 className="text-center text-xs font-bold text-slate-500 mb-2 print:text-black">Gráfica de Error e Incertidumbre</h4>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
          <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
          <XAxis 
            dataKey="target" 
            label={{ value: 'Patrón', position: 'insideBottom', offset: -10, fontSize: 10 }} 
            tick={{fontSize: 10}}
          />
          <YAxis 
            label={{ value: 'Error', angle: -90, position: 'insideLeft', fontSize: 10 }} 
            tick={{fontSize: 10}}
          />
          <Tooltip contentStyle={{ fontSize: '12px' }} />
          <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
          
          {/* Banda de Incertidumbre (Visual) */}
          <Area type="monotone" dataKey="uncertaintyHigh" fill="#e0e7ff" stroke="none" />
          <Area type="monotone" dataKey="uncertaintyLow" fill="#fff" stroke="none" />
          
          {/* Línea de Error */}
          <Line type="monotone" dataKey="error" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}