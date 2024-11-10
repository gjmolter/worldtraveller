import Head from "next/head";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>I've Travelled the World</title>
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
        />
        <script defer data-domain="worldtraveller.vercel.app" src="https://analytics.cpbr.digital/js/script.js"></script>
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
