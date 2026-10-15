/**
 * AbroadPath AI - Catalog Hook (Universities & Countries)
 * File: src/hooks/useCatalog.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R2) & PROJECT.md
 */

import { useState, useEffect } from 'react';
import { University, Country } from '../types';
import { getUniversities, getCountries } from '../services/firestoreService';
import seedUniversities from '../data/universities.json';
import seedCountries from '../data/countries.json';

interface UseCatalogResult {
  universities: University[];
  countries: Country[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCatalog(): UseCatalogResult {
  const [universities, setUniversities] = useState<University[]>(seedUniversities as unknown as University[]);
  const [countries, setCountries] = useState<Country[]>(seedCountries as unknown as Country[]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError(null);

      const [univList, countryList] = await Promise.all([
        getUniversities().catch(() => []),
        getCountries().catch(() => []),
      ]);

      if (univList && univList.length > 0) {
        setUniversities(univList);
      } else {
        setUniversities(seedUniversities as unknown as University[]);
      }

      if (countryList && countryList.length > 0) {
        setCountries(countryList);
      } else {
        setCountries(seedCountries as unknown as Country[]);
      }
    } catch (err: any) {
      console.warn('[useCatalog] Catalog fetch warning, using seed data:', err);
      setError(err.message || 'Failed to fetch catalog data');
      setUniversities(seedUniversities as unknown as University[]);
      setCountries(seedCountries as unknown as Country[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  return {
    universities,
    countries,
    loading,
    error,
    refresh: fetchCatalog,
  };
}
