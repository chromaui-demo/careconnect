import type { ManualChunksOption } from 'rollup';

/** Split heavy chart vendors into separate cached chunks (EHR/Billing). */
export const chartManualChunks: ManualChunksOption = (id) => {
  if (!id.includes('node_modules')) return;
  if (id.includes('/recharts/') || id.includes('/d3-')) return 'recharts';
  if (id.includes('/echarts-for-react/') || id.includes('/echarts/')) return 'echarts';
};
