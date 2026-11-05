import './globals.css';

export const metadata = {
  title: 'RunwayOps',
  description: 'Fashion week runway slot booking and backstage management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
