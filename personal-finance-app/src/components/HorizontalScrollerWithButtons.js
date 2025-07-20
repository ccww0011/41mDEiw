"use client";

import React, { useRef } from 'react';
import styles from '@/components/HorizontalScrollerWithButtons.module.css';

const HorizontalScrollerWithButtons = ( {items} ) => {
  const scrollContainerRef = useRef();

  return (
    <div>
      <div className={styles.scrollContainer}>
        <div className={styles.horizontalScrollContainer} ref={scrollContainerRef}>
          {items.map((item, index) => (
            <div className={styles.item} key={index}>
              <div style={{ textAlign: "center" }}>
                <img src={item.imageSrc} alt={item.title} style={{ maxWidth: "100%", height: "auto" }} />
              </div>
              <div style={{ padding: "0 15px" }}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <ul style={{margin: "5px", padding: "0 10px"}}>
                  {item.features.map((feature, featureIndex) => (
                    <li key={featureIndex} style={{padding: "2.5px 0"}}>
                      {feature}
                    </li>
                  ))}
                </ul>
                <p></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HorizontalScrollerWithButtons;
