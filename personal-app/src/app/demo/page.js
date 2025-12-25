"use client"

import Hero from "@/components/Hero";

export default function Demo() {
  // Demo, Overview, Market, Transaction

  const demoProps = {
    path: "/Demo1.jpg",
    height: 80,
    altText: "Welcome to Demo Centre!",
    title: "Demo Centre",
    text: "Preview features in the restricted area",
    button: "Get started",
    navigate: "/walkthrough",
  };

  return (
    <>
      <Hero {...demoProps} />
    </>
  );
}