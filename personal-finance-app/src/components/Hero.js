"use client";

import styles from "./Hero.module.css";
import { useRouter } from "next/navigation";
import React from "react";
import Image from "next/image";

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
        layout="fill"
        objectFit="cover"
        priority
      />

      <div className={styles.innerContainer}>
        <h1>{props.title}</h1>
        <div className={styles.desktopText}><b>{props.text}</b></div>
        {props.path && (
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

