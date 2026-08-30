import Head from "next/head";
import Script from "next/script";
import "maplibre-gl/dist/maplibre-gl.css";
import "flag-icons/css/flag-icons.min.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>CPBR Atlas — Map your travels</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Script
        data-site-id="fd5ee8720205"
        src="https://nosy.cpbr.digital/api/script.js"
        strategy="afterInteractive"
      />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
