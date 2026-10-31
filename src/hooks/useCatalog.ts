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
import { SUBJECT_UNIVERSITIES } from '../data/subjectCatalog';

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

function mergeUniversities(...lists: University[][]): University[] {
  const merged = new Map<string, University>();
  for (const list of lists) {
    for (const item of list) {
      const previous = merged.get(item.id);
      if (previous) {
        merged.set(item.id, {
          ...previous,
          ...item,
          field: item.field || previous.field,
          fields: item.fields?.length ? item.fields : previous.fields,
        });
      } else {
        merged.set(item.id, item);
      }
    }
  }
  return Array.from(merged.values());
}

function mergeCountries(...lists: Country[][]): Country[] {
  const merged = new Map<string, Country>();
  for (const list of lists) {
    for (const item of list) {
      merged.set(item.id, { ...merged.get(item.id), ...item });
    }
  }
  return Array.from(merged.values());
}

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
        const finalUnivs = mergeUniversities(
          seedUniversities as unknown as University[],
          SUBJECT_UNIVERSITIES,
          u || []
        );
        const finalCountries = mergeCountries(seedCountries as unknown as Country[], c || []);
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
      setUniversities(mergeUniversities(seedUniversities as unknown as University[], SUBJECT_UNIVERSITIES));
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
          setUniversities(mergeUniversities(seedUniversities as unknown as University[], SUBJECT_UNIVERSITIES));
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
