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

// Module-level cache and in-flight promise to deduplicate concurrent fetches across components
let inFlightPromise: Promise<{ univs: University[]; countriesList: Country[] }> | null = null;
let cachedCatalog: { univs: University[]; countriesList: Country[] } | null = null;

async function getCachedOrFetchCatalog(forceRefresh = false): Promise<{ univs: University[]; countriesList: Country[] }> {
  if (!forceRefresh && cachedCatalog) {
    return cachedCatalog;
  }
  if (!inFlightPromise || forceRefresh) {
    inFlightPromise = Promise.all([
      getUniversities().catch(() => []),
      getCountries().catch(() => []),
    ])
      .then(([u, c]) => {
        const finalUnivs = u && u.length > 0 ? u : (seedUniversities as unknown as University[]);
        const finalCountries = c && c.length > 0 ? c : (seedCountries as unknown as Country[]);
        cachedCatalog = { univs: finalUnivs, countriesList: finalCountries };
        inFlightPromise = null;
        return cachedCatalog;
      })
      .catch((err) => {
        inFlightPromise = null;
        throw err;
      });
  }
  return inFlightPromise;
}

export function useCatalog(): UseCatalogResult {
  const [universities, setUniversities] = useState<University[]>(
    cachedCatalog ? cachedCatalog.univs : (seedUniversities as unknown as University[])
  );
  const [countries, setCountries] = useState<Country[]>(
    cachedCatalog ? cachedCatalog.countriesList : (seedCountries as unknown as Country[])
  );
  const [loading, setLoading] = useState<boolean>(!cachedCatalog);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCachedOrFetchCatalog(forceRefresh);
      setUniversities(data.univs);
      setCountries(data.countriesList);
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
    let isMounted = true;

    const execute = async () => {
      try {
        if (!cachedCatalog) {
          setLoading(true);
        }
        setError(null);
        const data = await getCachedOrFetchCatalog(false);
        if (isMounted) {
          setUniversities(data.univs);
          setCountries(data.countriesList);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[useCatalog] Catalog fetch warning, using seed data:', err);
          setError(err.message || 'Failed to fetch catalog data');
          setUniversities(seedUniversities as unknown as University[]);
          setCountries(seedCountries as unknown as Country[]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    execute();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    universities,
    countries,
    loading,
    error,
    refresh: () => fetchCatalog(true),
  };
}
