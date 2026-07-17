const FUNCTION_PATTERNS = [
  /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/m,
  /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/m,
  /^(?:export\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/m,
];

const CLASS_PATTERNS = [
  /^(?:export\s+)?class\s+(\w+)/m,
  /^(?:export\s+)?interface\s+(\w+)/m,
  /^(?:export\s+)?type\s+(\w+)\s*=/m,
];

function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

function detectBlockType(line, language) {
  for (const pattern of CLASS_PATTERNS) {
    if (pattern.test(line)) return "class";
  }
  for (const pattern of FUNCTION_PATTERNS) {
    if (pattern.test(line)) return "function";
  }
  if (/^(?:import|from|require|#include|using)\b/.test(line.trim())) {
    return "import";
  }
  return "block";
}

function extractSymbolName(line) {
  for (const pattern of [...CLASS_PATTERNS, ...FUNCTION_PATTERNS]) {
    const match = line.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function splitLargeBlock(content, startLine, chunkSize, overlap) {
  const lines = content.split("\n");
  const chunks = [];
  let buffer = [];
  let bufferStart = startLine;

  for (let i = 0; i < lines.length; i++) {
    buffer.push(lines[i]);
    const current = buffer.join("\n");

    if (current.length >= chunkSize) {
      chunks.push({
        content: current,
        startLine: bufferStart,
        endLine: bufferStart + buffer.length - 1,
        chunkType: "line",
      });

      const overlapLines = Math.max(1, Math.floor(overlap / 40));
      buffer = buffer.slice(-overlapLines);
      bufferStart = startLine + i - buffer.length + 1;
    }
  }

  if (buffer.length) {
    chunks.push({
      content: buffer.join("\n"),
      startLine: bufferStart,
      endLine: bufferStart + buffer.length - 1,
      chunkType: "line",
    });
  }

  return chunks;
}

/**
 * Splits source code into semantic blocks (functions, classes, imports)
 * with line-based fallback for oversized blocks.
 */
export function chunkCode(code, language = "javascript", options = {}) {
  const chunkSize = options.chunkSize || 800;
  const overlap = options.overlap || 120;

  if (!code?.trim()) return [];

  const lines = code.split("\n");
  const blocks = [];
  let currentBlock = [];
  let blockStart = 1;
  let blockType = "block";
  let symbolName = null;
  let braceDepth = 0;

  const flushBlock = () => {
    if (!currentBlock.length) return;

    const content = currentBlock.join("\n").trim();
    if (!content) {
      currentBlock = [];
      return;
    }

    if (content.length > chunkSize) {
      blocks.push(
        ...splitLargeBlock(content, blockStart, chunkSize, overlap).map((c) => ({
          ...c,
          language,
          symbolName,
        }))
      );
    } else {
      blocks.push({
        content,
        startLine: blockStart,
        endLine: blockStart + currentBlock.length - 1,
        chunkType: blockType,
        language,
        symbolName,
      });
    }

    currentBlock = [];
    blockType = "block";
    symbolName = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const trimmed = line.trim();

    if (!currentBlock.length) {
      blockStart = lineNumber;
      blockType = detectBlockType(line, language);
      symbolName = extractSymbolName(line);
    }

    currentBlock.push(line);

    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;

    const isBlankSeparator = !trimmed && braceDepth === 0 && currentBlock.length > 3;
    const isFunctionEnd = braceDepth === 0 && blockType === "function" && trimmed === "}";
    const isClassEnd = braceDepth === 0 && blockType === "class" && trimmed === "}";
    const isImportEnd = blockType === "import" && trimmed && !trimmed.startsWith("import") && !trimmed.startsWith("from");

    if (isFunctionEnd || isClassEnd || isBlankSeparator || isImportEnd) {
      flushBlock();
    }
  }

  flushBlock();

  return blocks.map((block, index) => ({
    ...block,
    chunkIndex: index,
    tokenCount: estimateTokenCount(block.content),
  }));
}
