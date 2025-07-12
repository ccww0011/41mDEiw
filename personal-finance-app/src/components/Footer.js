"use client";

import React from "react";
import styles from "./Footer.module.css";
import { useRouter } from "next/navigation";

export default function Footer() {
  const router = useRouter();

  const handleNavigation = (path) => {
    router.push(path);
    window.scrollTo(0, 0);
  };

  return (
    <div className="wrapper">
      <div className={styles.botnavContainer}>
        <button onClick={() => handleNavigation("/")}>Home</button>
        <button onClick={() => handleNavigation("/expertise")}>Expertise</button>
        <button onClick={() => handleNavigation("/contactUs")}>Contact Us</button>
      </div>
    </div>
  );
}
