import "./globals.css";
import Nav from "./components/Nav";
import AIAssistant from "./components/AIAssistant";

export const metadata = {
  title: "Command Center — Lilac Desk",
  description: "Personal business + fitness assistant for Lilac Desk.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#5C181E",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        {children}
        <AIAssistant />
      </body>
    </html>
  );
}
