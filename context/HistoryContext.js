import { createContext, useState, useContext } from 'react';

// Create the History Context
const HistoryContext = createContext();

// History Provider to wrap the app and provide state
export const HistoryProvider = ({ children }) => {
  const [history, setHistory] = useState([]);

  const addHistoryItem = (pdfName, mermaidCode) => {
    setHistory((prevHistory) => [...prevHistory, { pdfName, mermaidCode }]);
  };

  return (
    <HistoryContext.Provider value={{ history, addHistoryItem }}>
      {children}
    </HistoryContext.Provider>
  );
};

// Custom hook to use the HistoryContext
export const useHistory = () => {
  return useContext(HistoryContext);
};