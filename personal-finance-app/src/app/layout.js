import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata = {
  title: "Personal Finance",
  description: "This website takes care of your personal portfolio.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
    <body>
    <div className="wrapper">
      <header className="header">
        <Header isAuthenticated={false} />
      </header>

      <main>{children}</main>

      <footer className="footer">
        <Footer />
      </footer>
    </div>
    </body>
    </html>
  );
}
