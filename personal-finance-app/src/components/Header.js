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
        />
      </div>

      <div className={styles.topnavContainer}>
        <button onClick={() => handleNavigation("/")}>Home</button>
        <button onClick={() => handleNavigation("/expertise")}>Expertise</button>
        <button onClick={() => handleNavigation("/contactUs")}>Contact Us</button>
        {user ? (
          <div className={styles.rightmost}>
            <p> {user.email}</p>
            <button onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <button className={styles.rightmost} onClick={login}>
            Login
          </button>
        )}
      </div>
    </>
  );
}

