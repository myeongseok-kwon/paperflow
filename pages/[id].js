import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Textarea, Button, VStack, Text, Box, Spinner, HStack } from "@chakra-ui/react";
import MermaidComponent from "@/components/MermaidComponent";
import Layout from "../components/Layout";
import { getCompletion } from "@/utils/openaiHelper";

export default function PDFPage() {
  const router = useRouter();
  const { id, content, mermaidCode: initialMermaidCode } = router.query;  // Get the PDF name, content, and Mermaid code from the query

  const [textContent, setTextContent] = useState("");
  const [mermaidCode, setMermaidCode] = useState(initialMermaidCode || "");  // Initialize with query mermaid code
  const [feedback, setFeedback] = useState("");
  const [regenerateLoading, setRegenerateLoading] = useState(false);  // Loading state for regeneration
  const [upgradeLoading, setUpgradeLoading] = useState(false);  // Loading state for upgrade



  function extractMermaidDiagram(text) {
    // Triple backticks로 둘러싸인 모든 코드 블록을 추출
    const pattern = /```(.*?)```/gs;
    const diagrams = [...text.matchAll(pattern)].map(match => match[1]);

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

  // Update mermaid diagram based on feedback
  const handleRegenerate = async() => {
    try{    
        setRegenerateLoading(true); 
        const systemPrompt = "You will be given the research paper content, summarizing diagram mermaid code, and feedback about diagram. You should keep the basic diagram, but modify with considering user feedbacks."

        const userPrompt = "Please provide the updated Mermaid Diagram code. The content was: `" + textContent + "`, the diagram was: ```"+ mermaidCode + ", and the comment is:" + feedback;
        const response = await getCompletion("gpt-4o-mini", systemPrompt, userPrompt);
        const newMermaidCode = extractMermaidDiagram(response);
        console.log("newMermaidCode", newMermaidCode)
        setMermaidCode(newMermaidCode);
    } catch (error) {
      console.error("Error generating Mermaid diagram:", error);
    } finally {
      setRegenerateLoading(false);  // Stop loading
    }
  };

  const handleUpgrade = async() => {
    try{
        console.log("upgrading start")
        setUpgradeLoading(true); 
        const systemPrompt = `
You will be given the research paper content and summarizing diagram mermaid code. You should keep the basic diagram, but upgrade the diagram by following instruction.
아래의 Stage 1 - Stage 2  순서로 생각의 흐름을 따라가세요. Stage 1는 내부적으로 처리하고, 최종 답변으로 Stage 2의 Mermaid 코드만 제공해주세요. 모든 critical thought 이 다이어그램에 드러나야 합니다.

<Stage 1>

1. 모든 답변 내용은 한글이 되어야 한다.
2. 각 문장마다 출처 표시는 하지 않아도 된다.
3. 기존 Diagram에서의 section과 각 섹션별 claim-evidence 관계에 대해 비판적인 접근을 취할 거야. 이 연구의 완결성과 논리를 비판하는 Devil's Advocate'의 역할을 수행해야해. 여기서는 새로운 접근 방식 그리고 관련된 노트를 추가하면서, 현재 method의 문제점을 지적하고 이를 더 보완할 방식을 언급할 수 있게 하는 거야.
4. 이 때, 각 섹션 중 어떠한 claim 또는 Evidence에 대한 비판인지를 함께 기억해 줘. 나중에 다이어그램에 반영하고 싶어.
5. 최소 10개의 아이디어를 부탁해. 질문의 난이도는 대학원생 박사 또는 교수진 정도로 아주 연구론적으로 집중되게 해줘.
6. 만약 의미적으로 같은 용어 (e.g., GAN = Generative Adversarial Network)이 나온다면 모두 같은 용어 (e.g., GAN)으로 통일해줘. 즉, "GAN" 관련 용어는 모두 "GAN"으로 통일시키는 거야. 예시: "The proposed model ($7) operates in ($R1, $H ) an unsupervised manner. ($8)"라는 예시에서는"proposed model"는 이 논문에 제시하는 방법론/모델이니깐 이거에 대한 건 전부 이걸로 태깅해야겠지 또한 "unsupervised manner."는 unsupervised model 같은 용어와도 의미론적으로 같을테니 모두 이걸로 묶어야겠지.

---

<Stage 2>
이제, 방금 답변을 기준으로 예전에 너가 나한테 줬던 머메이드 다이어그램에 위 답변을 추가시켜줘. 누락없이 전부 다 포함시켜줘. 너가 주었던 머메이드 다이어그램을 아래에 줄게. 비판적인 접근 중 첫 번째 방식인'이 연구에서 제안하는 method를 더욱 보호하고 강화하는 방식'는 classDef critique_approach_1 (fill: #00FFFF, stroke: #0000FF)로, 두 번째는 '이 연구의 완결성과 논리를 비판하는 Devil's Advocate'는  classDef critique_approach_2(fill: #FF355E, stroke: #8B0000)로 부탁할게. 이 때 각 접근이 비판했던 대상이 노드들에 edge를 연결해서 한 눈에 볼 수 있는 dynamic graph를 줘. 즉, critique_approach_1, critique_approach_2 노드들은 따로 하나의 section으로 모여있기 보단, 기존의 섹션 내부읜 노드들과 연결되어 있어야 해. syntax에러가 나지 않게 주의해줘.

---

# 기존 Mermaid Code (여기에 critique_approach_1, critique_approach_2노드를 이어붙이면 돼.) 기존 코드 관련해선 노드 종류 및 색상 모두 변하지 않게 주의해 줘. 기존 코드에 critique_approach_1, critique_approach_2노드와 엣지만 딱 올려서 추가하는 거야. 나머지는 무조건 동일해야 해.

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
I1["연구 문제: 리뷰에서 속성별 감정 점수를 추출하는 문제"]:::question
I2["연구 문제: 누락된 속성의 감정 점수를 보정하는 방법"]:::question
I3["연구 목표: 머신러닝과 구조적 모델 결합"]:::question
S1["제안된 솔루션: 딥러닝 CNN-LSTM 하이브리드 모델"]:::solution
S2["제안된 솔루션: 리뷰어 행동 모델을 통한 누락 보정"]:::solution
end

%% Method: Experimental Design and Data %%
subgraph Method
M1["실험 방법: 속성별 점수 예측을 위한 구조적 모델"]:::method
M2["데이터: Yelp 리뷰 텍스트 및 속성별 평점"]:::method
M3["모델 설계: EM 알고리즘과 베이즈 규칙 활용"]:::method
M4["검증: 홀드아웃 샘플을 사용한 모델 평가"]:::method
end

%% Results: Key Findings and Relationships %%
subgraph Results
R1["결과: CNN-LSTM 모델의 성능이 기존 방법보다 우수"]:::result
R2["결과: 속성별 누락 보정이 평균 점수에 유의미한 영향"]:::result
R3["결과: 리뷰어 세그먼트 분석으로 다양한 동기 파악"]:::result
end

%% Discussion: Contributions and Limitations %%
subgraph Discussion
D1["기여: 감정 분석에서 언어 구조의 중요성 강조"]:::discussion
D2["기여: 사회과학과 공학적 접근 방식의 융합"]:::discussion
L1["한계: 속성 중요도와 리뷰 빈도의 불일치"]:::discussion
L2["한계: 일부 리뷰의 전략적 편향 가능성"]:::discussion
end

%% Conclusion: Future Directions %%
subgraph Conclusion
C1["향후 연구: 리뷰어 행동과 속성 누락 연구 확대"]:::conclusion
C2["향후 연구: 다른 도메인에 모델 적용 검토"]:::conclusion
end

%% Interconnections %%
I1 --> S1
I2 --> S2
I3 --> S1

S1 --> M1
S2 --> M3
M1 --> M2
M3 --> M4

M4 --> R1
M3 --> R2
R1 --> D1
R2 --> D2
R3 --> D1

D1 --> C1
D2 --> C2
L1 --> C1
L2 --> C2
`
        const userPrompt = "Please provide the updated Mermaid Diagram code. The content was: `" + textContent + "`, and the diagram was: ```"+ mermaidCode
        const response = await getCompletion("gpt-4o-mini", systemPrompt, userPrompt);
        const newMermaidCode = extractMermaidDiagram(response);
        console.log("newMermaidCode", newMermaidCode)
        setMermaidCode(newMermaidCode);
    } catch (error) {
        console.error("Error auto-upgrading Mermaid diagram:", error);
    } finally {
        setUpgradeLoading(false);  // Stop loading
    }
  };

  // Reinitialize mermaid whenever mermaidCode changes
  useEffect(() => {
    if (mermaidCode) {
      mermaid.init();  // Reinitialize mermaid diagram
    }
  }, [mermaidCode]);

  useEffect(() => {
    if (router.isReady) {
      setMermaidCode(initialMermaidCode || "");
      setFeedback("");  // Clear feedback when switching PDFs
    }
  }, [router.query, initialMermaidCode, id, content]);


  return (
    <Layout>
      <Box p={8}>
        <Text fontSize="2xl" mb={4}>PDF Processing for: {id}</Text>

        {/* Mermaid Diagram */}
        <Box mb={8}>
          <MermaidComponent mermaidCode={mermaidCode} id="paper-diagram"/>  {/* Display diagram */}
        </Box>

        {/* Feedback Input */}
        <VStack spacing={4}>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add feedback or comments for Regeneration"
          />
          <HStack spacing={4}>
            <Button colorScheme="blue" onClick={handleRegenerate} isDisabled={regenerateLoading}>
                {regenerateLoading ? (
                <>
                    <Spinner size="sm" mr={2} />
                    Regenerating...
                </>
                ) : (
                "Regenerate Diagram with Feedback"
                )}
            </Button>
            <Button colorScheme="blue" onClick={handleUpgrade}isDisabled={upgradeLoading}>
                {upgradeLoading ? (
                <>
                    <Spinner size="sm" mr={2} />
                    Automatically Upgrading...
                </>
                ) : (
                "Find Limitations and Upgrade with AI"
                )}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Layout>
  );
}