import { useState } from "react";
import { useRouter } from "next/router";
import { Input, Button, Box, Spinner, Text, HStack  } from "@chakra-ui/react";
import "../utils/pdfWorkerPolyfill";
import * as pdfjsLib from "pdfjs-dist/webpack";  // Import pdfjs-dist
import Layout from "../components/Layout";  // Import Layout component
import { useHistory } from "../context/HistoryContext";  // Import HistoryContext
import { getCompletion } from "@/utils/openaiHelper";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);  // Track loading state
  const router = useRouter();
  const { addHistoryItem } = useHistory();  // Get the function to add history items
  const [mermaidCode, setMermaidCode] = useState("");

  function extractMermaidDiagram(text) {
    // Triple backticks로 둘러싸인 모든 코드 블록을 추출
    const pattern = /```(.*?)```/gs;
    const diagrams = [...text.matchAll(pattern)].map(match => match[1]);
    
    if (diagrams.length === 0) {
      return text;
    }

    // 'mermaid'로 시작하면 삭제하고 나머지 반환
    const cleanedDiagrams = diagrams.map(diagram => {
      let cleanedDiagram = diagram.trim();
      if (cleanedDiagram.startsWith('mermaid')) {
        cleanedDiagram = cleanedDiagram.slice('mermaid'.length).trim();
      }
      return cleanedDiagram;
    });

    return cleanedDiagrams[0];
  }

  const generateMermaidCodeIMRDCER = async (text) => {
    try {
      // Call the OpenAI API with the provided system prompt and user prompt
      const systemPrompt = `  
      아래의 Stage 1 - Stage 2 - Stage 3 순서로 생각의 흐름을 따라가세요. Stage 1과 2는 내부적으로 처리하고, 최종 답변으로 Stage 3의 Mermaid 코드만 제공해주세요. claim-evidence 까지도 모두 다이어그램에 들어가야 해. 한글로 부탁해.
      
      <Stage 1>
      PDF로 주어진 논문에서 모든 주장-근거 쌍을 추출하여 나열해 줘. 다음 지침을 모두 따라서 줘. 너의 답변에서 마크다운 스타일은 쓰지 말아줘.
      
      1. 모든 답변 내용은 한글이 되어야 한다.
      2. 각 문장마다 출처 표시는 하지 않아도 된다.
      3. 논문에서 나온 모든 주장-근거 pair 목록을 알려줘. 하나도 빠짐 없이 구체적으로 모든 내용을 다 담아주면 좋겠어. 각 주장-근거는 서론, 선행연구, 그리고 이 논문에서 설명하는 모델에 대해선 특히 구체적으로 제공되어야 해. 모두 밸런스있게 모두 구체적으로 다뤄줘. 대학원생 level에 맞춰 심도있게 내용이 정리되어야 해. 하지만 또한 너무 내용이 요약되어선 안돼. 연구내용의 중요한 부분이 모두 담기도록.
      4. 각 주장과 연관있는 근거가 있다면 함께 달아줘. 근거는 같은 문단에서 나온 다른 뒷받침 문장이거나 아니면 다른 넘버링이 붙은 근거일 수 있고, 또는 선행논문 reference일 수 있어. 연구적 의의가 높다고 생각되는 구체적인 근거는 모두 다 달아주면 좋겠어. 그리고 그 evidence에 특정 논문명이나 다른 주장 ($C5) 등으로 언급해도 돼. 좀 더 구체적이고 연구, 전문적으로 아주 세부적으로 다뤄줘. 이 논문의 학술적인 내용을 더욱 심도있게 발전시킬 수 있는 정도가 되어야 해.
      5. 만약 의미적으로 같은 용어 (e.g., GAN = Generative Adversarial Network)이 나온다면 모두 같은 용어 (e.g., GAN)으로 통일해줘. 즉, "GAN" 관련 용어는 모두 "GAN"으로 통일시키는 거야. 예시: "The proposed model ($7) operates in ($R1, $H ) an unsupervised manner. ($8)"라는 예시에서는"proposed model"는 이 논문에 제시하는 방법론/모델이니깐 이거에 대한 건 전부 이걸로 태깅해야겠지 또한 "unsupervised manner."는 unsupervised model 같은 용어와도 의미론적으로 같을테니 모두 이걸로 묶어야겠지.
      
      ---
      
      <Stage 2>
      좋아. 이제 너가 준 답변을 기본으로, 각 claim에 대해 추가적으로 각 섹션별로 구획을 나눈 다음, 각 섹션에 맞는 내용을 정리해야해. 섹션을 구분할때는  IMRD framework를 따르면 좋을 것 같아.  밑에는 각 섹션에서 중요하게 다뤄줘야하는 핵심 내용들을 정리한 것들이야.
      
      1. introduction
      "연구 논문에서 제기된 주요 연구 질문 또는 문제는 무엇인가? 이 문제를 해결하기 위해 제안된 접근 방식은 무엇인가? 해당 내용을 연구 질문(연구 문제)과 제안된 솔루션으로 정리하라."
      2. Method
      "논문에서 사용된 실험 방법론 또는 데이터 수집 방법을 설명하라. 실험 설계, 사용된 모델(또는 알고리즘), 데이터의 출처 및 특징을 그래프 형태로 정리하라."
      3. Result
      "실험 결과에서 도출된 주요 발견은 무엇인가? 각 발견은 어떤 데이터 또는 측정값에서 나왔는지 요약하고, 발견 간의 상관관계 또는 인과 관계를 시각적으로 나타내라."
      4. Discussion
      "논문에서 논의된 주요 이론적 기여와 실질적 한계는 무엇인가? 각 기여와 한계가 연구의 결과와 어떻게 연결되는지 보여줘라."
      5. Conclusion
      "논문의 결론에서 제안된 향후 연구 방향을 요약하라. 현재 연구에서 다루지 못한 문제와 향후 해결해야 할 과제를 시각적으로 정리해라."
      6. Introduction - method
      "논문에서 제기된 주요 연구 문제와 이를 해결하기 위한 실험 방법을 시각적으로 연결해라. 연구 문제에서 시작해 실험 방법이 어떻게 설계되었는지 나타내라."
      7. Result - discussion
      "실험 결과에서 나온 주요 발견들과 그로부터 도출된 논의 사항을 시각적으로 연결하라. 각각의 결과가 논문에서 어떻게 해석되고 논의되는지 보여줘라."
      
      ## 이 내용들을 참고해서 섹션별 내용을 정리할 때, 핵심 내용들이 논문에 실제로 반영되어 있는지 확인해줘. 만약 있다면, 그 핵심내용들이 반드시 담겨야해.
      
      <Stage 3>
      이제, 첫 번째 답변과 두 번째 답변을 기준으로 mermaid 다이어그램을 그려줘.
      가장 중요한 건, node 엔티티 내부 이름 및 변수에 소괄호를 포함한 특수기호를 사용하지 말아줘. 에러를 발생시킬 수 있기 때문이야.
      즉 claim-evidence 그리고 imrd 관련 답변을 모두 한 번에 다이어그램화 시킬 거야. 그리고 각 노드별로 evidence 또는 imrd 태그를 붙여줘. 아래의 template을 따라줘.
      
      Stage 3에 대한 답변만 정리해줘. 코드는 구체적으로 모든 claim, evidence, imrd 전부 다 넣어줘. 누락없이.
      
      graph TB
      %% Define Colors %%
      classDef question fill:#EF9A9A,stroke:#B71C1C,stroke-width:2px,color:#000;
      classDef solution fill:#BBDEFB,stroke:#0D47A1,stroke-width:2px,color:#000;
      classDef method fill:#C8E6C9,stroke:#1B5E20,stroke-width:2px,color:#000;
      classDef result fill:#FFF59D,stroke:#F57F17,stroke-width:2px,color:#000;
      classDef discussion fill:#FFCCBC,stroke:#BF360C,stroke-width:2px,color:#000;
      classDef conclusion fill:#C5E1A5,stroke:#33691E,stroke-width:2px,color:#000;
      classDef link fill:#FFECB3,stroke:#FF6F00,stroke-width:2px,color:#000;
      
      %% Introduction: Research Question and Proposed Solution %%
      subgraph Introduction
      I1["연구 문제: <연구 문제 1>"]:::question
      I2["연구 문제: <연구 문제 2>"]:::question
      I3["연구 목표: <연구 목표>"]:::question
      S1["제안된 솔루션: <솔루션 1>"]:::solution
      S2["제안된 솔루션: <솔루션 2>"]:::solution
      end
      
      %% Method: Experimental Design and Data %%
      subgraph Method
      M1["실험 방법: <실험 방법 1>"]:::method
      M2["실험 방법: <실험 방법 2>"]:::method
      M3["데이터 수집: <데이터 설명>"]:::method
      M4["실험 설계: <실험 설계 설명>"]:::method
      end
      
      %% Results: Key Findings and Relationships %%
      subgraph Results
      R1["결과: <결과 1>"]:::result
      R2["결과: <결과 2>"]:::result
      R3["결과: <결과 3>"]:::result
      R4["결과: <결과 4>"]:::result
      end
      
      %% Discussion: Contributions and Limitations %%
      subgraph Discussion
      D1["기여: <기여 1>"]:::discussion
      D2["기여: <기여 2>"]:::discussion
      L1["한계: <한계 1>"]:::discussion
      L2["한계: <한계 2>"]:::discussion
      end
      
      %% Conclusion: Future Directions %%
      subgraph Conclusion
      C1["향후 연구: <향후 연구 방향 1>"]:::conclusion
      C2["향후 연구: <향후 연구 방향 2>"]:::conclusion
      end
      
      %% Interconnections %%
      I1 --> S1
      I2 --> S2
      I3 --> S1
      
      S1 --> M1
      S2 --> M2
      M1 --> M3
      M2 --> M4
      
      M3 --> R1
      M3 --> R2
      M4 --> R3
      M4 --> R4
      
      R1 --> D1
      R2 --> D2
      R3 --> D1
      R4 --> D2
      
      D1 --> C1
      D2 --> C2
      L1 --> C1
      L2 --> C2
  `
      const userPrompt = "Please provide the Mermaid Diagram code for the following text: " + text;
      
      // Fetch the completion result using the OpenAI API helper function
      const response = await getCompletion("gpt-4o-mini", systemPrompt, userPrompt);

      console.log("응답: ", response)
      // Assuming the response contains the Mermaid code in the correct format, return it
      return extractMermaidDiagram(response);  // Assuming you have this function to extract Mermaid code
    } catch (error) {
      console.error("Error generating Mermaid diagram:", error);
      throw error;
    }
  };

  const generateMermaidCodeIMRD = async (text) => {
    try {
      // Call the OpenAI API with the provided system prompt and user prompt
      const systemPrompt = `
아래의 Stage 1 - Stage 2 - Stage 3 순서로 생각의 흐름을 따라가세요. Stage 1과 2는 내부적으로 처리하고, 최종 답변으로 Stage 3의 Mermaid 코드만 제공해주세요.

<Stage 1>
PDF로 주어진 논문에서 다음 지침을 모두 따라서 줘. 너의 답변에서 마크다운 스타일은 쓰지 말아줘.

1. 모든 답변 내용은 한글이 되어야 한다.
2. 각 문장마다 출처 표시는 하지 않아도 된다.

<Stage 2>
각 섹션별로 구획을 나눈 다음, 각 섹션에 맞는 내용을 정리해야해. 섹션을 구분할때는  IMRD framework를 따르면 좋을 것 같아.  밑에는 각 섹션에서 중요하게 다뤄줘야하는 핵심 내용들을 정리한 것들이야.

1. introduction
"연구 논문에서 제기된 주요 연구 질문 또는 문제는 무엇인가? 이 문제를 해결하기 위해 제안된 접근 방식은 무엇인가? 해당 내용을 연구 질문(연구 문제)과 제안된 솔루션으로 정리하라."
2. Method
"논문에서 사용된 실험 방법론 또는 데이터 수집 방법을 설명하라. 실험 설계, 사용된 모델(또는 알고리즘), 데이터의 출처 및 특징을 그래프 형태로 정리하라."
3. Result
"실험 결과에서 도출된 주요 발견은 무엇인가? 각 발견은 어떤 데이터 또는 측정값에서 나왔는지 요약하고, 발견 간의 상관관계 또는 인과 관계를 시각적으로 나타내라."
4. Discussion
"논문에서 논의된 주요 이론적 기여와 실질적 한계는 무엇인가? 각 기여와 한계가 연구의 결과와 어떻게 연결되는지 보여줘라."
5. Conclusion
"논문의 결론에서 제안된 향후 연구 방향을 요약하라. 현재 연구에서 다루지 못한 문제와 향후 해결해야 할 과제를 시각적으로 정리해라."
6. Introduction - method
"논문에서 제기된 주요 연구 문제와 이를 해결하기 위한 실험 방법을 시각적으로 연결해라. 연구 문제에서 시작해 실험 방법이 어떻게 설계되었는지 나타내라."
7. Result - discussion
"실험 결과에서 나온 주요 발견들과 그로부터 도출된 논의 사항을 시각적으로 연결하라. 각각의 결과가 논문에서 어떻게 해석되고 논의되는지 보여줘라."

이 내용들을 참고해서 섹션별 내용을 정리할 때, 핵심 내용들이 논문에 실제로 반영되어 있는지 확인해줘. 만약 있다면, 그 핵심내용들이 반드시 담겨야해.

---

<Stage 3>
이제, 답변을 기준으로 mermaid 다이어그램 코드를 제공해줘. 그리고 각 노드별로 imrd 태그를 붙여줘. 가장 중요한 건, node 엔티티 내부 이름 및 변수에 소괄호를 포함한 특수기호를 사용하지 말아줘. 에러를 발생시킬 수 있기 때문이야.
      `
      
      const userPrompt = "Please provide the Mermaid Diagram code for the following text: " + text;
      
      // Fetch the completion result using the OpenAI API helper function
      const response = await getCompletion("gpt-4o-mini", systemPrompt, userPrompt);

      console.log("응답: ", response)
      // Assuming the response contains the Mermaid code in the correct format, return it
      return extractMermaidDiagram(response);  // Assuming you have this function to extract Mermaid code
    } catch (error) {
      console.error("Error generating Mermaid diagram:", error);
      throw error;
    }
  };

  const generateMermaidCodeCER = async (text) => {
    try {
      const systemPrompt = `
      아래의 Stage 1 - Stage 2 - Stage 3 순서로 생각의 흐름을 따라가세요. Stage 1과 2는 내부적으로 처리하고, 최종 답변으로 Stage 3의 Mermaid 코드만 제공해주세요. claim-evidence 까지도 모두 다이어그램에 들어가야 해.
      <Stage 1>
      PDF로 주어진 논문에서 모든 주장-근거 쌍을 추출하여 나열해 줘. 다음 지침을 모두 따라서 줘. 너의 답변에서 마크다운 스타일은 쓰지 말아줘.

      1. 모든 답변 내용은 한글이 되어야 한다.
      2. 각 문장마다 출처 표시는 하지 않아도 된다.
      3. 논문에서 나온 모든 주장-근거 pair 목록을 알려줘. 하나도 빠짐 없이 구체적으로 모든 내용을 다 담아주면 좋겠어. 각 주장-근거는 서론, 선행연구, 그리고 이 논문에서 설명하는 모델에 대해선 특히 구체적으로 제공되어야 해. 모두 밸런스있게 모두 구체적으로 다뤄줘. 대학원생 level에 맞춰 심도있게 내용이 정리되어야 해. 하지만 또한 너무 내용이 요약되어선 안돼. 연구내용의 중요한 부분이 모두 담기도록.
      4. 각 주장과 연관있는 근거가 있다면 함께 달아줘. 근거는 같은 문단에서 나온 다른 뒷받침 문장이거나 아니면 다른 넘버링이 붙은 근거일 수 있고, 또는 선행논문 reference일 수 있어. 연구적 의의가 높다고 생각되는 구체적인 근거는 모두 다 달아주면 좋겠어. 그리고 그 evidence에 특정 논문명이나 다른 주장 ($C5) 등으로 언급해도 돼. 좀 더 구체적이고 연구, 전문적으로 아주 세부적으로 다뤄줘. 이 논문의 학술적인 내용을 더욱 심도있게 발전시킬 수 있는 정도가 되어야 해.
      5. 만약 의미적으로 같은 용어 (e.g., GAN = Generative Adversarial Network)이 나온다면 모두 같은 용어 (e.g., GAN)으로 통일해줘. 즉, "GAN" 관련 용어는 모두 "GAN"으로 통일시키는 거야. 예시: "The proposed model ($7) operates in ($R1, $H ) an unsupervised manner. ($8)"라는 예시에서는"proposed model"는 이 논문에 제시하는 방법론/모델이니깐 이거에 대한 건 전부 이걸로 태깅해야겠지 또한 "unsupervised manner."는 unsupervised model 같은 용어와도 의미론적으로 같을테니 모두 이걸로 묶어야겠지.

      <Stage 2>
      좋아. 이제 너가 준 답변을 기본으로, 각 claim에 대해 내용을 정리해야해.

      <Stage 3>
      이제, 답변을 기준으로 mermaid 다이어그램 코드를 제공해줘. 가장 중요한 건, node 엔티티 내부 이름 및 변수에 소괄호를 포함한 특수기호를 사용하지 말아줘. 에러를 발생시킬 수 있기 때문이야.
      `
      // Call the OpenAI API with the provided system prompt and user prompt
      const userPrompt = "Please provide the Mermaid Diagram code for the following text: " + text;
      
      // Fetch the completion result using the OpenAI API helper function
      const response = await getCompletion("gpt-4o-mini", systemPrompt, userPrompt);

      console.log("응답: ", response)
      // Assuming the response contains the Mermaid code in the correct format, return it
      return extractMermaidDiagram(response);  // Assuming you have this function to extract Mermaid code
    } catch (error) {
      console.error("Error generating Mermaid diagram:", error);
      throw error;
    }
  };

  // Function to extract text from a PDF
  const extractTextFromPDFIMRDCER = async (pdfFile) => {
    setLoading(true);
    const fileReader = new FileReader();

    fileReader.onload = async function () {
      const typedArray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      let textContent = '';

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const pageText = await page.getTextContent();
        const pageStrings = pageText.items.map(item => item.str);
        textContent += pageStrings.join(" ");
      }

      // Generate a basic mermaid code from the extracted text
      const generatedMermaidCode = await generateMermaidCodeIMRDCER(textContent);
      setMermaidCode(generatedMermaidCode);

      // Add to global history
      addHistoryItem(pdfFile.name, generatedMermaidCode);

      // Navigate to dynamic page and pass the extracted text and mermaid code via query
      router.push({
        pathname: `/${pdfFile.name}`,
        query: {
          content: textContent,  // Pass the extracted PDF text
          mermaidCode: generatedMermaidCode  // Pass the generated Mermaid code
        }
      });

      setLoading(false);
    };

    fileReader.readAsArrayBuffer(pdfFile);
  };

  // Function to extract text from a PDF
  const extractTextFromPDFIMRD = async (pdfFile) => {
    setLoading(true);
    const fileReader = new FileReader();

    fileReader.onload = async function () {
      const typedArray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      let textContent = '';

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const pageText = await page.getTextContent();
        const pageStrings = pageText.items.map(item => item.str);
        textContent += pageStrings.join(" ");
      }

      // Generate a basic mermaid code from the extracted text
      const generatedMermaidCode = await generateMermaidCodeIMRD(textContent);
      setMermaidCode(generatedMermaidCode);

      // Add to global history
      addHistoryItem(pdfFile.name, generatedMermaidCode);

      // Navigate to dynamic page and pass the extracted text and mermaid code via query
      router.push({
        pathname: `/${pdfFile.name}`,
        query: {
          content: textContent,  // Pass the extracted PDF text
          mermaidCode: generatedMermaidCode  // Pass the generated Mermaid code
        }
      });

      setLoading(false);
    };

    fileReader.readAsArrayBuffer(pdfFile);
  };

    // Function to extract text from a PDF
    const extractTextFromPDFCER = async (pdfFile) => {
      setLoading(true);
      const fileReader = new FileReader();
  
      fileReader.onload = async function () {
        const typedArray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let textContent = '';
  
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const pageText = await page.getTextContent();
          const pageStrings = pageText.items.map(item => item.str);
          textContent += pageStrings.join(" ");
        }
  
        // Generate a basic mermaid code from the extracted text
        const generatedMermaidCode = await generateMermaidCodeCER(textContent);
        setMermaidCode(generatedMermaidCode);
  
        // Add to global history
        addHistoryItem(pdfFile.name, generatedMermaidCode);
  
        // Navigate to dynamic page and pass the extracted text and mermaid code via query
        router.push({
          pathname: `/${pdfFile.name}`,
          query: {
            content: textContent,  // Pass the extracted PDF text
            mermaidCode: generatedMermaidCode  // Pass the generated Mermaid code
          }
        });
  
        setLoading(false);
      };
  
      fileReader.readAsArrayBuffer(pdfFile);
    };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
    }
  };

  const handleImrdcer = () => {
    if (file) {
      extractTextFromPDFIMRDCER(file);
    }
  };

  const handleImrd = () => {
    if (file) {
      extractTextFromPDFIMRD(file);
    }
  };

  const handleCer = () => {
    if (file) {
      extractTextFromPDFCER(file);
    }
  };

  return (
    <Layout>
      <Box p={8}>
        <Input type="file" onChange={handleFileChange} style={{paddingTop: '4px'}}/>
        <HStack gap={8}>
          <Button mt={4} colorScheme="blue" onClick={handleImrd} isDisabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" mr={2} /> Processing...
              </>
            ) : (
              "IMRD ONLY"
            )}
          </Button>
          <Button mt={4} colorScheme="blue" onClick={handleCer} isDisabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" mr={2} /> Processing...
              </>
            ) : (
              "CER ONLY"
            )}
          </Button>
          <Button mt={4} colorScheme="blue" onClick={handleImrdcer} isDisabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" mr={2} /> Processing...
              </>
            ) : (
              "IMRD & CER"
            )}
          </Button>
        </HStack>
      </Box>
    </Layout>
  );
}