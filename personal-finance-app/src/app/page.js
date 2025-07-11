import Hero from "../components/Hero";

export default function Home() {
  const homeProps = {
    path: "/Home.jpg",
    height: 40,
    altText: "Welcome!",
    title: "Technology Expertise for All Business",
    text: "Leveraging data and technology to drive growth and optimize processes. Enhancing efficiency and decision-making across business operations.",
    button: "Explore our expertise",
    navigate: "/expertise",
  };

  const contactProps = {
    path: "/Contact.jpg",
    height: 40,
    altText: "Contact us!",
    title: "Wanna know more? Get in touch",
    text: "Fancy a chat? We'd love to hear from you, find out what you need and see what we can do.",
    button: "Get in touch",
    navigate: "/contactUs",
  };

  return (
    <>
      <Hero {...homeProps} />
      <Hero {...contactProps} />
    </>
  );
}
