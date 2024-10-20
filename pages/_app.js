import { ChakraProvider } from "@chakra-ui/react";
import { HistoryProvider } from "../context/HistoryContext";

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider>
      <HistoryProvider>
        <Component {...pageProps} />
      </HistoryProvider>
    </ChakraProvider>
  );
}

export default MyApp;