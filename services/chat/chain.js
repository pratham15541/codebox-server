import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createChatModel } from "../ai/config.js";

const SYSTEM_PROMPT = `You are an expert code assistant embedded in CodeBox, an online IDE.
Your job is to explain code clearly, help debug issues, and answer programming questions.

Use the retrieved code context when relevant. If context is insufficient, say so and reason from general knowledge.
When debugging:
- Identify likely root causes
- Point to specific lines or symbols
- Suggest concrete fixes

Format responses with:
1. Direct answer
2. Code walkthrough (if applicable)
3. Debugging tips or next steps

Be concise but thorough. Use markdown for code blocks.`;

function formatContext(retrievedChunks) {
  if (!retrievedChunks?.length) {
    return "No indexed code context available for this query.";
  }

  return retrievedChunks
    .map(
      (item, i) =>
        `### Context ${i + 1} (${item.doc.metadata?.symbolName || item.doc.metadata?.chunkType || "block"}, lines ${item.doc.metadata?.startLine}-${item.doc.metadata?.endLine}, score: ${item.score?.toFixed(3)})\n\`\`\`${item.doc.metadata?.language || ""}\n${item.doc.pageContent}\n\`\`\``
    )
    .join("\n\n");
}

function formatHistory(messages) {
  if (!messages?.length) return "No prior conversation.";

  return messages
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
}

export async function runCodeExplanationChain({
  question,
  retrievedChunks,
  history = [],
  language,
  codeSnippet,
}) {
  const model = createChatModel();
  const context = formatContext(retrievedChunks);
  const conversationHistory = formatHistory(history);

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    [
      "human",
      `Language: {language}

Conversation history:
{history}

Retrieved code context:
{context}

{codeSection}

User question: {question}`,
    ],
  ]);

  const chain = RunnableSequence.from([
    prompt,
    model,
    new StringOutputParser(),
  ]);

  const codeSection = codeSnippet
    ? `Additional code provided by user:\n\`\`\`${language || ""}\n${codeSnippet}\n\`\`\``
    : "";

  const answer = await chain.invoke({
    question,
    context,
    history: conversationHistory,
    language: language || "unknown",
    codeSection,
  });

  return answer;
}
