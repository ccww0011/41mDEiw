import React, { useEffect } from "react";
import { useNewsContext } from "@/context/NewsContext";

export function News() {
  const { newsData, loadingNews, error, fetchNews } = useNewsContext();

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return (
    <>
      <div className="grid">
        <div className="grid-item grid6">
          <h3>News</h3>
        </div>
        <div className="grid-item grid6">
          <button onClick={() => fetchNews({ force: true })} disabled={loadingNews}>
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
