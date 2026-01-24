import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import type { GroupType } from '@/types/database';

interface GroupDistributionProps {
  data: { group: GroupType; count: number }[];
}

const GROUP_COLORS: Record<GroupType, string> = {
  G1: 'hsl(231, 48%, 48%)',
  G2: 'hsl(199, 89%, 48%)',
  G3: 'hsl(142, 76%, 36%)',
  G4: 'hsl(38, 92%, 50%)',
  M1: 'hsl(16, 85%, 57%)',
};

export function GroupDistribution({ data }: GroupDistributionProps) {
  const chartData = data.map((d) => ({
    name: d.group,
    value: d.count,
    fill: GROUP_COLORS[d.group],
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Distribución por Grupo</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          Sin datos disponibles
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Distribución por Grupo</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={40} />
            <Tooltip formatter={(value: number) => [`${value} contactos`, 'Cantidad']} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
