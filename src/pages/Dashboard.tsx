import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { StatusChart } from '@/components/dashboard/StatusChart';
import { GroupDistribution } from '@/components/dashboard/GroupDistribution';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Phone, PhoneCall, Globe, TrendingUp } from 'lucide-react';
import { CALL1_STATUS_LABELS, CALL2_STATUS_LABELS } from '@/types/database';

const STATUS_COLORS = {
  confirmara: 'hsl(38, 92%, 50%)',
  no_contesta: 'hsl(215, 16%, 47%)',
  asistira: 'hsl(199, 89%, 48%)',
  no_asistira: 'hsl(0, 84%, 60%)',
  se_unio: 'hsl(142, 76%, 36%)',
  no_se_une: 'hsl(0, 63%, 31%)',
  matriculado: 'hsl(142, 76%, 36%)',
  no_matriculado: 'hsl(0, 84%, 60%)',
  siguiente_mes: 'hsl(199, 89%, 48%)',
};

export default function Dashboard() {
  const { isAdmin, profile } = useAuth();
  const { stats, isLoading } = useDashboardData();

  const call1ChartData = stats?.call1ByStatus.map((item) => ({
    name: CALL1_STATUS_LABELS[item.status],
    value: item.count,
    color: STATUS_COLORS[item.status] || 'hsl(215, 16%, 47%)',
  })) || [];

  const call2ChartData = stats?.call2ByStatus.map((item) => ({
    name: CALL2_STATUS_LABELS[item.status],
    value: item.count,
    color: STATUS_COLORS[item.status] || 'hsl(215, 16%, 47%)',
  })) || [];

  const totalCall1 = stats?.call1ByStatus.reduce((acc, item) => acc + item.count, 0) || 0;
  const totalCall2 = stats?.call2ByStatus.reduce((acc, item) => acc + item.count, 0) || 0;

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            ¡Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Resumen general del sistema de llamadas'
              : 'Resumen de tus llamadas asignadas'}
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-card animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isAdmin && (
              <StatsCard
                title="Total Contactos"
                value={stats?.totalContacts || 0}
                icon={<Users className="h-4 w-4" />}
                description="Números registrados"
              />
            )}
            <StatsCard
              title="Llamadas 1"
              value={totalCall1}
              icon={<Phone className="h-4 w-4" />}
              description={isAdmin ? 'Total del sistema' : 'Tus llamadas asignadas'}
            />
            <StatsCard
              title="Llamadas 2"
              value={totalCall2}
              icon={<PhoneCall className="h-4 w-4" />}
              description={isAdmin ? 'Total del sistema' : 'Tus llamadas asignadas'}
            />
            {isAdmin && (
              <StatsCard
                title="Países"
                value={stats?.contactsByCountry.length || 0}
                icon={<Globe className="h-4 w-4" />}
                description="Países con contactos"
              />
            )}
            <StatsCard
              title="Tasa de Unión"
              value={`${totalCall1 > 0 ? (((stats?.call1ByStatus.find(s => s.status === 'se_unio')?.count || 0) / totalCall1) * 100).toFixed(1) : 0}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              description="Se unieron vs llamados"
            />
          </div>
        )}

        {/* Charts Grid */}
        {!isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatusChart title="Estados Llamada 1" data={call1ChartData} />
            <StatusChart title="Estados Llamada 2" data={call2ChartData} />
            {isAdmin && <GroupDistribution data={stats?.contactsByGroup || []} />}
          </div>
        )}

        {/* Country distribution for admins */}
        {isAdmin && !isLoading && stats && stats.contactsByCountry.length > 0 && (
          <div className="bg-card rounded-lg p-6 border">
            <h3 className="font-semibold mb-4">Contactos por País</h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {stats.contactsByCountry
                .sort((a, b) => b.count - a.count)
                .map((item) => (
                  <div
                    key={item.country}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="font-medium">{item.country}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
