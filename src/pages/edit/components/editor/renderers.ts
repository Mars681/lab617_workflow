import { marked } from 'marked';
import TurndownService from 'turndown';
import * as TurndownPluginGfmModule from 'turndown-plugin-gfm';
import katex from 'katex';
import { GitHubSlugger, stripMarkdownFormatting } from '../../utils/markdownUtils';

// Declare hljs global from CDN
declare const hljs: any;

const gfm = (TurndownPluginGfmModule as any).gfm || (TurndownPluginGfmModule as any).default?.gfm;

// --- Helper Functions ---

export const normalizeLanguage = (language: string | undefined) => {
  const lang = (language || 'text').trim().split(/\s+/)[0];
  return lang || 'text';
};

export const getLanguageFromCodeBlock = (block: HTMLElement): string | null => {
  const codeEl = block.querySelector('code');
  if (!codeEl) return null;
  const match = (codeEl.className || '').match(/language-([^\s]+)/);
  return match ? match[1] : null;
};

// --- HTML Generators ---

export const createCodeBlockHtml = (code: string, language: string | undefined) => {
  const lang = normalizeLanguage(language);
  
  let highlightedCode = '';
  try {
    if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
      highlightedCode = hljs.highlight(code, { language: lang }).value;
    } else {
        highlightedCode = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
    }
  } catch (e) {
    highlightedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return `
    <div class="code-block-wrapper my-4 rounded-lg overflow-visible border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#282c34] shadow-sm relative">
      <div class="code-header flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-[#21252b] border-b border-gray-200 dark:border-gray-900 select-none" contenteditable="false">
        <div class="flex items-center gap-1.5">
           <div class="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
           <div class="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
           <div class="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></div>
        </div>
        <span class="text-[10px] font-mono font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${lang}</span>
      </div>
      <pre class="!p-4 overflow-x-auto text-sm font-mono leading-relaxed !bg-transparent text-gray-800 dark:text-gray-200 m-0 !border-0"><code class="hljs language-${lang}">${highlightedCode || '<br/>'}</code></pre>
    </div>
  `;
};

export const buildCodeBlockElement = (code: string, language: string) => {
  const lang = normalizeLanguage(language);

  const wrapper = document.createElement('div');
  wrapper.className = "code-block-wrapper my-4 rounded-lg overflow-visible border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#282c34] shadow-sm relative";

  const header = document.createElement('div');
  header.className = "code-header flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-[#21252b] border-b border-gray-200 dark:border-gray-900 select-none";
  header.setAttribute('contenteditable', 'false');

  const dotGroup = document.createElement('div');
  dotGroup.className = "flex items-center gap-1.5";
  ['bg-red-400/80', 'bg-amber-400/80', 'bg-emerald-400/80'].forEach((color) => {
    const dot = document.createElement('div');
    dot.className = `w-2.5 h-2.5 rounded-full ${color}`;
    dotGroup.appendChild(dot);
  });

  const langLabel = document.createElement('span');
  langLabel.className = "text-[10px] font-mono font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider";
  langLabel.textContent = lang;

  header.appendChild(dotGroup);
  header.appendChild(langLabel);

  const pre = document.createElement('pre');
  pre.className = "!p-4 overflow-x-auto text-sm font-mono leading-relaxed !bg-transparent text-gray-800 dark:text-gray-200 m-0 !border-0";

  const codeEl = document.createElement('code');
  codeEl.className = `hljs language-${lang}`;
  codeEl.textContent = code;

  pre.appendChild(codeEl);
  wrapper.appendChild(header);
  wrapper.appendChild(pre);

  return { wrapper, codeEl, langLabel };
};

export const createMathHtml = (tex: string, display: boolean) => {
    let rendered = '';
    try {
        rendered = katex.renderToString(tex, {
            displayMode: display,
            throwOnError: false,
            output: 'html',
            trust: true
        });
    } catch (e) {
        rendered = `<span class="text-red-500 font-mono text-xs p-1 bg-red-50 rounded border border-red-200">${tex}</span>`;
    }

    const displayClass = display 
        ? "math-jax-wrapper block my-4 py-4 px-2 text-center bg-gray-50/50 dark:bg-slate-800/30 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors overflow-x-auto border border-transparent hover:border-gray-200 dark:hover:border-slate-700" 
        : "math-jax-wrapper inline-block px-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors align-middle border border-transparent hover:border-gray-200 dark:hover:border-slate-700";
    
    // Encode for attribute to avoid breaking HTML
    const encodedTex = (tex || '').replace(/"/g, '&quot;');
    
    return `<span class="${displayClass}" data-tex="${encodedTex}" contenteditable="false" title="Click to edit formula">${rendered}</span>`;
};

// --- Markdown Processor ---

const cleanMathContent = (content: string) => {
  if (!content) return '';
  return content.replace(/^ *>/gm, '').trim();
};

export const processMarkdownWithMath = (markdown: string): string => {
  if (!markdown) return '';
  
  // Initialize Slugger for this render cycle to ensure IDs match the outline generation logic
  const slugger = new GitHubSlugger();
  const renderer = new marked.Renderer();
  
  // Custom code renderer
  // @ts-ignore
  renderer.code = (code: any, language: any) => {
    if (typeof code === 'object' && code && 'text' in code) {
      return createCodeBlockHtml(code.text, code.lang);
    }
    return createCodeBlockHtml(code, language);
  };

  // Custom heading renderer to enforce consistent IDs
  // @ts-ignore
  renderer.heading = (text, level) => {
    const cleanTitle = stripMarkdownFormatting(text);
    const id = slugger.slug(cleanTitle);
    return `<h${level} id="${id}">${text}</h${level}>`;
  };

  const mathSegments: { text: string, display: boolean }[] = [];
  const placeholder = (i: number) => `MATHSEGMENT${i}PLACEHOLDER`;
  
  let protectedText = markdown;
  
  // 1. Block Math $$...$$
  protectedText = protectedText.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
      mathSegments.push({ text: cleanMathContent(content), display: true });
      return placeholder(mathSegments.length - 1);
  });
  
  // 2. Block Math \[...\]
  protectedText = protectedText.replace(/(^|[^\\])\\\[([\s\S]*?)\\\]/g, (match, prefix, content) => {
      mathSegments.push({ text: cleanMathContent(content), display: true });
      return `${prefix || ''}${placeholder(mathSegments.length - 1)}`;
  });
  
  // 3. Inline Math \(...\)
  protectedText = protectedText.replace(/(^|[^\\])\\\(([\s\S]*?)\\\)/g, (match, prefix, content) => {
      mathSegments.push({ text: cleanMathContent(content), display: false });
      return `${prefix || ''}${placeholder(mathSegments.length - 1)}`;
  });
  
  // 4. Inline Math $...$
  protectedText = protectedText.replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$/g, (match, prefix, content) => {
     if (/^[\d.,]+$/.test(content.trim())) return match;
     mathSegments.push({ text: cleanMathContent(content), display: false });
     return `${prefix || ''}${placeholder(mathSegments.length - 1)}`;
  });

  let html = '';
  try {
      html = marked.parse(protectedText, { renderer }) as string;
  } catch (e) {
      html = protectedText.replace(/\n/g, '<br/>');
  }

  // Restore Math
  html = html.replace(/MATHSEGMENT(\d+)PLACEHOLDER/g, (_, i) => {
    const segment = mathSegments[parseInt(i, 10)];
    if (!segment) return '';
    return createMathHtml(segment.text, segment.display);
  });

  return html;
};

// --- Turndown Service ---

export const getTurndownService = () => {
    const service = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    if (gfm) service.use(gfm);

    service.escape = function (string) {
        return (string || '')
          .replace(/^(#{1,6} )/gm, '\\$1')
          .replace(/^([-*_] *){3,}$/gm, function (match) {
            return match.split(match.charAt(0)).join('\\' + match.charAt(0))
          })
          .replace(/^(\W* {0,3})(\d+)\. /gm, '$1$2\\. ')
          .replace(/^([^\\\w]*)[*+-] /gm, function (match) {
            return match.replace(/([*+-])/g, '\\$1')
          })
          .replace(/^(\W* {0,3})> /gm, '$1\\> ')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '\\[$1\\]($2)')
    };

    service.addRule('mathjax-wrapper', {
        filter: (node) => node.nodeName === 'SPAN' && node.classList.contains('math-jax-wrapper'),
        replacement: (content, node) => {
            const tex = (node as HTMLElement).getAttribute('data-tex') || '';
            const isBlock = node.classList.contains('block');
            return isBlock ? `\n$$\n${tex}\n$$\n` : `$${tex}$`;
        }
    });

    service.addRule('math-editor-widget', {
        filter: (node) => node.classList.contains('math-editor-widget'),
        replacement: (content, node) => {
            const textarea = node.querySelector('textarea');
            const tex = textarea ? textarea.value : '';
            return `\n$$\n${tex}\n$$\n`;
        }
    });

    service.addRule('code-editor-widget', {
        filter: (node) => node.classList.contains('code-editor-widget'),
        replacement: (content, node) => {
            const textarea = node.querySelector('textarea');
            const langInput = node.querySelector('input');
            const code = textarea ? textarea.value : '';
            const lang = langInput ? langInput.value : '';
            
            const backtickMatches = code.match(/`+/g);
            const maxBackticks = backtickMatches ? Math.max(...backtickMatches.map(m => m.length)) : 0;
            const fenceChar = '`';
            const fenceLength = Math.max(3, maxBackticks + 1);
            const fenceStr = fenceChar.repeat(fenceLength);

            return `\n${fenceStr}${lang}\n${code}\n${fenceStr}\n`;
        }
    });

    service.addRule('code-wrapper', {
        filter: (node) => node.classList.contains('code-block-wrapper'),
        replacement: (content, node) => {
            const codeEl = node.querySelector('code');
            if (!codeEl) return content;
            const className = codeEl.className || '';
            const match = className.match(/language-([^\s]+)/);
            const lang = match ? match[1] : '';
            
            const text = codeEl.textContent || '';
            const backtickMatches = text.match(/`+/g);
            const maxBackticks = backtickMatches ? Math.max(...backtickMatches.map(m => m.length)) : 0;
            const fenceChar = '`';
            const fenceLength = Math.max(3, maxBackticks + 1);
            const fenceStr = fenceChar.repeat(fenceLength);

            return `\n${fenceStr}${lang}\n${text}\n${fenceStr}\n`;
        }
    });

    return service;
};