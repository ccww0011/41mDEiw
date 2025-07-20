import '../styles/globals.css';
import Header from "../components/Header";
import Footer from "../components/Footer";
import {AuthProvider} from "@/context/AuthContext";

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
        <AuthProvider>
          <Header/>
          <main>{children}</main>
          <Footer/>
        </AuthProvider>
      </body>
    </html>
  );
}
