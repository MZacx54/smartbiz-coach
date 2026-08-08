import React from 'react';

interface FormattedMarkdownProps {
  content: string;
}

export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`empty-${lineIdx}`} className="h-1" />);
      return;
    }

    // Numbered list match: "1. **Title:** desc"
    const numberedListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    // Bullet list match: "- **Title:** desc" or "* **Title:** desc"
    const bulletListMatch = trimmed.match(/^[-*]\s+(.*)$/);

    if (numberedListMatch) {
      const num = numberedListMatch[1];
      const itemText = numberedListMatch[2];
      elements.push(
        <div key={`num-${lineIdx}`} className="flex gap-2 items-start my-1.5 bg-slate-50/80 border border-slate-200/60 p-2.5 rounded-xl">
          <span className="w-5 h-5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            {num}
          </span>
          <div className="flex-1 text-slate-800 text-xs leading-relaxed">
            {formatInlineMarkdown(itemText)}
          </div>
        </div>
      );
    } else if (bulletListMatch) {
      const itemText = bulletListMatch[1];
      elements.push(
        <div key={`bullet-${lineIdx}`} className="flex gap-2 items-start my-1 pl-1">
          <span className="text-emerald-500 font-bold text-xs mt-0.5">•</span>
          <div className="flex-1 text-slate-800 text-xs leading-relaxed">
            {formatInlineMarkdown(itemText)}
          </div>
        </div>
      );
    } else {
      elements.push(
        <p key={`p-${lineIdx}`} className="mb-1 text-xs leading-relaxed text-slate-800">
          {formatInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  return <div className="space-y-0.5">{elements}</div>;
};

/**
 * Parses inline markdown for **bold**, *italic*, `code`
 */
function formatInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      const boldText = match[2];
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-bold text-slate-950">
          {boldText}
        </strong>
      );
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      const italicText = match[3];
      parts.push(
        <em key={`i-${keyIdx++}`} className="italic text-slate-700">
          {italicText}
        </em>
      );
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      const codeText = match[4];
      parts.push(
        <code key={`c-${keyIdx++}`} className="bg-slate-100 text-emerald-700 font-mono px-1 py-0.5 rounded text-[11px]">
          {codeText}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export default FormattedMarkdown;
