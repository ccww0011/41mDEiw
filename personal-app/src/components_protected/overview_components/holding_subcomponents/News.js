import React, { useState, useEffect } from "react";
import { useNews } from "@/hooks_protected/useNews";

export function News() {
  const [newsData, setNewsData] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = async () => {
    setLoadingNews(true);
    setError(null);
    try {
      const result = await useNews();
      if (result.status === "Success") {
        setNewsData(result.data.slice(0, 12));
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
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <>
      <div className="grid">
        <div className="grid-item grid6">
          <h3>News</h3>
        </div>
        <div className="grid-item grid6">
          <button onClick={fetchNews} disabled={loadingNews}>
            {loadingNews ? "Loading..." : "Refresh News"}
          </button>
        </div>
      </div>
      <div style={{fontSize: "0.85rem"}}>

        {error && <div style={{color: "red", margin: "5px 0"}}>Error: {error}</div>}

        {newsData.length > 0 &&
          newsData.map((item, idx) => (
            <div key={idx} style={{padding: "2px"}}>
              {item.title} —{" "}
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                {item.source}
              </a>
            </div>
          ))}

        {!loadingNews && newsData.length === 0 && !error && (
          <div style={{margin: 0}}>No news available.</div>
        )}
      </div>
    </>
  );
}
