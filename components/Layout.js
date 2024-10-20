import { useState } from "react";
import { Box, VStack, Text, HStack, IconButton} from "@chakra-ui/react";
import { useHistory } from "../context/HistoryContext";
import { useRouter } from "next/router";
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons'; // Import arrow icons


const Layout = ({ children }) => {
  const router = useRouter();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const { history } = useHistory();  // Get history from the global context

  const handleHistoryItemClick = (pdfName, content, mermaidCode) => {
    router.push({
      pathname: `/${encodeURIComponent(pdfName)}`,
      query: {
        content: content,
        mermaidCode: mermaidCode
      }
    });
  };

  return (
    <HStack alignItems="start" position="relative">
      {/* Sidebar */}
      {isSidebarVisible && (
        <Box w="20%" p={4} bg="gray.100" minH="100vh" position="relative">
          {/* Sidebar Title */}
          <Text fontSize="lg" mb={4} onClick={() => router.push('/')} cursor="pointer">
            Paper Flow
          </Text>

          {/* History Items */}
          <VStack align="start">
            {history.length > 0 ? (
              history.map((item, index) => (
                <Box key={index} onClick={() => handleHistoryItemClick(item.pdfName, item.content, item.mermaidCode)} cursor="pointer">
                  <Text>{item.pdfName.substring(0, 15) + "..."}</Text>
                </Box>
              ))
            ) : (
              <Text>No history yet.</Text>
            )}
          </VStack>

          {/* Toggle Button: Hide Sidebar */}
          <IconButton
            icon={<ChevronLeftIcon />}
            position="absolute"
            top="50%"
            right="0px"
            transform="translateY(-50%)"
            onClick={() => setIsSidebarVisible(false)}
            aria-label="Hide Sidebar"
            fontWeight="bold"       
          />
        </Box>
      )}

      {/* Main Content */}
      <Box w={isSidebarVisible ? "80%" : "100%"} p={8}>
        {children}
      </Box>

      {/* Toggle Button: Show Sidebar (only visible when sidebar is hidden) */}
      {!isSidebarVisible && (
        <IconButton
          icon={<ChevronRightIcon />}
          position="fixed"   // Ensure the button stays fixed
          top="50%"
          left="0"
          transform="translateY(-50%)"
          onClick={() => setIsSidebarVisible(true)}
          aria-label="Show Sidebar"
          zIndex="100"       // Ensure it's above other elements
          fontWeight="bold"
          bg="transparent"
        />
      )}
    </HStack>
  );
};

export default Layout;