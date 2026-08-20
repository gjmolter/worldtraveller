import Head from "next/head";
import Script from "next/script";
import "maplibre-gl/dist/maplibre-gl.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>I've Travelled the World</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Script
        defer
        data-domain="worldtraveller.vercel.app"
        src="https://analytics.cpbr.digital/js/script.js"
        strategy="afterInteractive"
      />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
