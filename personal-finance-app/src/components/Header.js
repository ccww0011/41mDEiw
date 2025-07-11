"use client";

import React from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Header({ isAuthenticated }) {
  const router = useRouter();

  // Temporary: Comment out login/logout
  /*
  import { login, logout } from "../api/AuthApi";

  async function handleLogin() {
    try {
      await login(router);
    } catch (error) {
      router.push("/");
    }
  }

  async function handleLogout() {
    try {
      await logout(router);
    } catch (error) {
      router.push("/");
    }
  }
  */

  const handleNavigation = (path) => {
    router.push(path);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div className={styles.headerBanner}>
        {/* If using public folder: */}
        <Image
          alt="Aqua Farm Limited"
          src="/HomeLogo.jpg"
          width={400}
          height={100}
          style={{ height: "100%", width: "auto" }}
        />
      </div>

      <div className={styles.topnav}>
        <button onClick={() => handleNavigation("/")}>Home</button>
        <button onClick={() => handleNavigation("/expertise")}>Expertise</button>
        <button onClick={() => handleNavigation("/contactUs")}>Contact Us</button>
        {isAuthenticated ? (
          <button className={styles.rightmost} onClick={() => {/* handleLogout() */}}>
            Logout
          </button>
        ) : (
          <button className={styles.rightmost} onClick={() => {/* handleLogin() */}}>
            Login
          </button>
        )}
      </div>
    </>
  );
}

