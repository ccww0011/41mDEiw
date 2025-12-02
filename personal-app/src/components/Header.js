"use client";

import React from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const router = useRouter();
  const { user, login, logout } = useAuth();

  const handleNavigation = (path) => {
    router.push(path);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div className={styles.headerBanner}>
        <Image
          alt="Aqua Farm Limited"
          src="/HomeLogo.jpg"
          width={400}
          height={100}
          style={{ height: "100%", width: "auto" }}
          priority
        />
      </div>

      <div className={styles.topnavContainer}>
        <button onClick={() => handleNavigation("/")}>Home</button>
        <button onClick={() => handleNavigation("/demo")}>Demo</button>
        <button onClick={() => handleNavigation("/contact-us")}>Contact Us</button>
        {user ? (
          <div className={styles.rightmost}>
            <div className={styles.text}> {user.email}</div>
            <button className={styles.buttonDark} onClick={() => handleNavigation("/account")}>Portfolio</button>
            <button className={styles.buttonDark} onClick={logout}>Logout</button>
          </div>
        ) : (
          <div className={styles.rightmost}>
            <button className={styles.rightmost} onClick={login}>Login</button>
          </div>
        )}
      </div>
    </>
  );
}

