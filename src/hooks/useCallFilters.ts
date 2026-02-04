import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface CallFilters {
  search: string;
  statusFilter: string;
  courseFilter: string;
  countryFilter: string;
  callerFilter: string;
}

const DEFAULT_FILTERS: CallFilters = {
  search: '',
  statusFilter: 'all',
  courseFilter: 'all',
  countryFilter: 'all',
  callerFilter: 'all',
};

/**
 * Hook para persistir filtros de llamadas en URL y sessionStorage
 * Esto permite mantener los filtros al navegar entre páginas
 */
export function useCallFilters(storageKey: 'call1' | 'call2') {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Inicializar desde URL primero, luego sessionStorage, luego defaults
  const getInitialFilters = useCallback((): CallFilters => {
    // Primero intentar obtener de la URL
    const urlSearch = searchParams.get('q');
    const urlStatus = searchParams.get('status');
    const urlCourse = searchParams.get('course');
    const urlCountry = searchParams.get('country');
    const urlCaller = searchParams.get('caller');
    
    if (urlSearch !== null || urlStatus !== null || urlCourse !== null || urlCountry !== null || urlCaller !== null) {
      return {
        search: urlSearch || '',
        statusFilter: urlStatus || 'all',
        courseFilter: urlCourse || 'all',
        countryFilter: urlCountry || 'all',
        callerFilter: urlCaller || 'all',
      };
    }
    
    // Si no hay params en URL, intentar sessionStorage
    try {
      const stored = sessionStorage.getItem(`filters-${storageKey}`);
      if (stored) {
        return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignorar errores de sessionStorage
    }
    
    return DEFAULT_FILTERS;
  }, [searchParams, storageKey]);
  
  const [filters, setFiltersState] = useState<CallFilters>(getInitialFilters);
  
  // Sincronizar con URL y sessionStorage cuando cambian los filtros
  const updateFilters = useCallback((newFilters: Partial<CallFilters>) => {
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Guardar en sessionStorage
      try {
        sessionStorage.setItem(`filters-${storageKey}`, JSON.stringify(updated));
      } catch {
        // Ignorar errores
      }
      
      // Actualizar URL sin recargar la página
      const params = new URLSearchParams();
      if (updated.search) params.set('q', updated.search);
      if (updated.statusFilter !== 'all') params.set('status', updated.statusFilter);
      if (updated.courseFilter !== 'all') params.set('course', updated.courseFilter);
      if (updated.countryFilter !== 'all') params.set('country', updated.countryFilter);
      if (updated.callerFilter !== 'all') params.set('caller', updated.callerFilter);
      
      setSearchParams(params, { replace: true });
      
      return updated;
    });
  }, [storageKey, setSearchParams]);
  
  const setSearch = useCallback((value: string) => updateFilters({ search: value }), [updateFilters]);
  const setStatusFilter = useCallback((value: string) => updateFilters({ statusFilter: value }), [updateFilters]);
  const setCourseFilter = useCallback((value: string) => updateFilters({ courseFilter: value }), [updateFilters]);
  const setCountryFilter = useCallback((value: string) => updateFilters({ countryFilter: value }), [updateFilters]);
  const setCallerFilter = useCallback((value: string) => updateFilters({ callerFilter: value }), [updateFilters]);
  
  const clearFilters = useCallback(() => {
    updateFilters(DEFAULT_FILTERS);
  }, [updateFilters]);
  
  const hasActiveFilters = filters.search !== '' || 
    filters.statusFilter !== 'all' || 
    filters.courseFilter !== 'all' || 
    filters.countryFilter !== 'all' || 
    filters.callerFilter !== 'all';
  
  return {
    ...filters,
    setSearch,
    setStatusFilter,
    setCourseFilter,
    setCountryFilter,
    setCallerFilter,
    clearFilters,
    hasActiveFilters,
  };
}
