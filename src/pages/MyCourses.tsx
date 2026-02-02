import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Phone, PhoneCall, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDateString } from '@/lib/dateUtils';

interface CourseWithStats {
  id: string;
  code: string;
  name: string;
  description: string | null;
  campaign_start_date: string | null;
  call1Count: number;
  call2Count: number;
}

export default function MyCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyCourses();
    }
  }, [user]);

  const fetchMyCourses = async () => {
    try {
      setIsLoading(true);

      // Get call1 records assigned to this caller with course info
      const { data: call1Data } = await supabase
        .from('call1_records')
        .select('contact:contacts(course_id)')
        .eq('caller_id', user?.id);

      // Get call2 records assigned to this caller with course info
      const { data: call2Data } = await supabase
        .from('call2_records')
        .select('contact:contacts(course_id)')
        .eq('caller_id', user?.id);

      // Count calls by course
      const call1ByCourse: Record<string, number> = {};
      const call2ByCourse: Record<string, number> = {};

      call1Data?.forEach((record) => {
        const courseId = record.contact?.course_id;
        if (courseId) {
          call1ByCourse[courseId] = (call1ByCourse[courseId] || 0) + 1;
        }
      });

      call2Data?.forEach((record) => {
        const courseId = record.contact?.course_id;
        if (courseId) {
          call2ByCourse[courseId] = (call2ByCourse[courseId] || 0) + 1;
        }
      });

      // Get ALL active courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('campaign_start_date', { ascending: true, nullsFirst: false });

      const coursesWithStats: CourseWithStats[] = (coursesData || []).map((course) => ({
        id: course.id,
        code: course.code,
        name: course.name,
        description: course.description,
        campaign_start_date: course.campaign_start_date,
        call1Count: call1ByCourse[course.id] || 0,
        call2Count: call2ByCourse[course.id] || 0,
      }));

      // Ordenar: primero cursos con fecha de inicio más próxima
      coursesWithStats.sort((a, b) => {
        if (!a.campaign_start_date && !b.campaign_start_date) return 0;
        if (!a.campaign_start_date) return 1;
        if (!b.campaign_start_date) return -1;
        return new Date(a.campaign_start_date).getTime() - new Date(b.campaign_start_date).getTime();
      });

      setCourses(coursesWithStats);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout title="Mis Cursos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Cursos Activos
            </h1>
            <p className="text-muted-foreground">
              Todos los cursos activos y tus llamadas asignadas
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {courses.length} cursos
          </Badge>
        </div>

        {/* Courses Grid */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">
            Cargando cursos...
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay cursos activos actualmente
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="mb-2">
                      {course.code}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.campaign_start_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Inicio:{' '}
                        {format(parseDateString(course.campaign_start_date), "d 'de' MMMM, yyyy", {
                          locale: es,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-info" />
                      <span className="text-sm font-medium">
                        {course.call1Count} Llamada 1
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">
                        {course.call2Count} Llamada 2
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
