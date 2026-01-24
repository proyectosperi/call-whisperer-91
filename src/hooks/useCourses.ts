import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Course } from '@/types/database';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCourses((data as Course[]) || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const createCourse = async (course: Omit<Course, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('courses').insert(course);
    if (error) throw error;
    await fetchCourses();
  };

  const updateCourse = async (id: string, updates: Partial<Course>) => {
    const { error } = await supabase.from('courses').update(updates).eq('id', id);
    if (error) throw error;
    await fetchCourses();
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) throw error;
    await fetchCourses();
  };

  return { courses, isLoading, error, refetch: fetchCourses, createCourse, updateCourse, deleteCourse };
}
