'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useNews as fetchNewsApi } from "@/utils_protected/newsApi";

const NewsContext = createContext(null);

export function useNewsContext() {
  const context = useContext(NewsContext);
  if (context === null) throw new Error('useNewsContext must be used within NewsProvider');
  return context;
}

export function NewsProvider({ children }) {
  const [newsData, setNewsData] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [error, setError] = useState(null);
  const hasFetchedRef = useRef(false);
  const loadingRef = useRef(false);

  const fetchNews = useCallback(async ({ force = false } = {}) => {
    if (loadingRef.current) return;
    if (hasFetchedRef.current && !force) return;

    loadingRef.current = true;
    setLoadingNews(true);
    setError(null);
    try {
      const result = await fetchNewsApi();
      if (result.status === "Success") {
        setNewsData((result.data || []).slice(0, 12));
        hasFetchedRef.current = true;
      } else if (result.status === "Unauthorised") {
        setError("Error loading news. Please try again.");
        setNewsData([]);
      } else {
        setError(result.message || "Failed to fetch news");
        setNewsData([]);
      }
    } catch (err) {
      setError(err.message);
      setNewsData([]);
    } finally {
      loadingRef.current = false;
      setLoadingNews(false);
    }
  }, []);

  const value = useMemo(() => ({
    newsData,
    loadingNews,
    error,
    fetchNews,
  }), [newsData, loadingNews, error]);

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
}
