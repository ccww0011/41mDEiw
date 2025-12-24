"use client";

import React from "react";
import styles from "./Hero.module.css";
import Image from "next/image";
import { useRouter } from 'next/navigation';

export default function Hero(props) {
  const router = useRouter();

  function handleNavigation(path) {
    router.push(path);
    window.scrollTo(0, 0);
  }

  return (
    <div className={styles.imageContainer} style={{ height: `${props.height}vh` }}>
      <Image
        src={props.path}
        alt={props.altText || "Image"}
        fill
        style={{ objectFit: "cover" }}
        loading={'eager'}
      />

      <div className={styles.innerContainer}>
        <h1>{props.title}</h1>
        <p>{props.text}</p>
        {props.path && props.navigate && props.button && (
          <button
            className={styles.button}
            onClick={() => handleNavigation(props.navigate)}
          >
            {props.button}
          </button>
        )}
      </div>
    </div>
  );
}

