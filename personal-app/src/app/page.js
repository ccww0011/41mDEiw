"use client";

import Hero from "@/components/Hero";

export default function Home() {
  const homeProps = {
    path: "/Home1.jpg",
    height: 40,
    altText: "Welcome!",
    title: "Technology Expertise for All Corporations.",
    text: "Enhancing efficiency and decision-making across all business operations.",
    button: "My Cases",
    navigate: "/cases",
  };

  const contactProps = {
    path: "/Home2.jpg",
    height: 40,
    altText: "Contact us!",
    title: "Wanna know more? Get in touch.",
    text: "We'd love to hear from you, find out what you need and see what we can do.",
    button: "Contact Us",
    navigate: "/contact-us",
  };

  return (
    <>
      <Hero {...homeProps} />
      <Hero {...contactProps} />
    </>
  );
}
