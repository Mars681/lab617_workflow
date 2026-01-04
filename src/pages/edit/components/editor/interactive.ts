import katex from 'katex';
import { createMathHtml, buildCodeBlockElement } from './renderers';

// Declare hljs global from CDN
declare const hljs: any;

export const mountCodeWidget = (
    codeWrapper: HTMLElement, 
    currentCode: string, 
    currentLang: string, 
    onSave: () => void
) => {
    // Create the Rich Editor Container
    const container = document.createElement('div');
    container.className = "code-editor-widget my-6 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-xl overflow-hidden bg-white dark:bg-slate-800 relative z-20 animate-in fade-in zoom-in-95 duration-200 ring-4 ring-indigo-50/50 dark:ring-indigo-900/20";
    container.setAttribute('contenteditable', 'false');

    // Header
    const header = document.createElement('div');
    header.className = "flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-indigo-50 dark:border-slate-700";
    
    // Header Left
    const titleGroup = document.createElement('div');
    titleGroup.className = "flex items-center gap-3";
    
    const icon = document.createElement('div');
    icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
    
    const label = document.createElement('span');
    label.className = "text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline";
    label.textContent = "Code Block";

    // Language Input
    const langInput = document.createElement('input');
    langInput.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded px-2 py-1 w-24 focus:outline-none focus:border-indigo-500 transition-colors";
    langInput.value = currentLang;
    langInput.placeholder = "Language";
    
    titleGroup.appendChild(icon);
    titleGroup.appendChild(label);
    titleGroup.appendChild(langInput);

    // Header Right (Actions)
    const actionsGroup = document.createElement('div');
    actionsGroup.className = "flex gap-1";
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = "p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors";
    cancelBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    cancelBtn.title = "Delete (Esc)";

    const saveBtn = document.createElement('button');
    saveBtn.className = "p-1.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors";
    saveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    saveBtn.title = "Save (Ctrl+Enter)";

    actionsGroup.appendChild(cancelBtn);
    actionsGroup.appendChild(saveBtn);

    header.appendChild(titleGroup);
    header.appendChild(actionsGroup);

    // Editor Area (Top)
    const editorArea = document.createElement('div');
    editorArea.className = "relative bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700";
    
    const textarea = document.createElement('textarea');
    textarea.className = "w-full p-4 font-mono text-sm leading-relaxed bg-transparent text-slate-700 dark:text-slate-200 outline-none resize-y min-h-[120px] border-none focus:ring-0";
    textarea.value = currentCode;
    textarea.spellcheck = false;
    
    editorArea.appendChild(textarea);

    // Preview Area (Bottom)
    const previewArea = document.createElement('div');
    previewArea.className = "p-4 bg-gray-50 dark:bg-[#282c34] overflow-x-auto relative";
    
    const previewLabel = document.createElement('span');
    previewLabel.className = "absolute top-2 right-3 text-[9px] font-bold text-slate-300 dark:text-slate-500 uppercase tracking-widest pointer-events-none select-none";
    previewLabel.textContent = "Preview";
    
    const previewPre = document.createElement('pre');
    previewPre.className = "!bg-transparent !p-0 !m-0 !border-0 text-sm";
    const previewCode = document.createElement('code');
    previewCode.className = `hljs language-${currentLang}`;
    
    // Initial highlight
    try {
        if (typeof hljs !== 'undefined' && currentLang && hljs.getLanguage(currentLang)) {
            previewCode.innerHTML = hljs.highlight(currentCode, { language: currentLang }).value;
        } else {
            previewCode.textContent = currentCode;
        }
    } catch(e) { previewCode.textContent = currentCode; }

    previewPre.appendChild(previewCode);
    previewArea.appendChild(previewLabel);
    previewArea.appendChild(previewPre);

    // Assemble
    container.appendChild(header);
    container.appendChild(editorArea);
    container.appendChild(previewArea);

    // Logic
    const updatePreview = () => {
        const code = textarea.value;
        const lang = langInput.value.trim() || 'text';
        previewCode.className = `hljs language-${lang}`;
        try {
            if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                previewCode.innerHTML = hljs.highlight(code, { language: lang }).value;
            } else {
                previewCode.textContent = code;
            }
        } catch(e) { previewCode.textContent = code; }
        
        // Auto expand textarea
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    };

    textarea.addEventListener('input', updatePreview);
    langInput.addEventListener('input', updatePreview);

    let isFinished = false;

    const finishEditing = () => {
        if (isFinished) return;
        isFinished = true;
        document.removeEventListener('mousedown', handleClickOutside);

        const newCode = textarea.value;
        const newLang = langInput.value.trim() || 'text';
        
        const { wrapper: newWrapper } = buildCodeBlockElement(newCode, newLang);
        
        // Highlight before inserting
        const newPre = newWrapper.querySelector('pre');
        const newCodeEl = newPre?.querySelector('code');
        if (newCodeEl && typeof hljs !== 'undefined') {
            try { hljs.highlightElement(newCodeEl); } catch(e) {}
        }

        if (container.parentNode) {
            container.parentNode.replaceChild(newWrapper, container);
        }
        onSave();
    };

    const removeBlock = () => {
        if (isFinished) return;
        isFinished = true;
        document.removeEventListener('mousedown', handleClickOutside);

        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
        onSave();
    };

    // Click Outside Handler
    const handleClickOutside = (e: MouseEvent) => {
        // If the click is not inside the container, we save and close.
        if (container && !container.contains(e.target as Node)) {
            finishEditing();
        }
    };

    // Delay attaching the listener to avoid immediate trigger from the click that opened the widget
    setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    // Event Listeners
    textarea.addEventListener('keydown', (ev) => {
        ev.stopPropagation(); // Stop propagation to allow browser default shortcuts (Ctrl+V, Ctrl+Z) to work on the textarea and not be intercepted by the parent

        if (ev.key === 'Tab') {
            ev.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.value = textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 2;
            updatePreview();
        } else if (ev.key === 'Backspace' && textarea.value === '') {
            ev.preventDefault();
            removeBlock();
        } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
            ev.preventDefault();
            finishEditing();
        } else if (ev.key === 'Escape') {
            ev.preventDefault();
            finishEditing(); 
        }
    });

    // Ensure paste/copy/cut work without interference from parent handlers
    textarea.addEventListener('paste', (ev) => ev.stopPropagation());
    textarea.addEventListener('copy', (ev) => ev.stopPropagation());
    textarea.addEventListener('cut', (ev) => ev.stopPropagation());

    langInput.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') {
            ev.preventDefault();
            finishEditing();
        }
    });

    saveBtn.addEventListener('click', (ev) => { ev.stopPropagation(); finishEditing(); });
    // Prompt: Clicking X should delete
    cancelBtn.addEventListener('click', (ev) => { ev.stopPropagation(); removeBlock(); });

    // Mount
    if (codeWrapper.parentNode) {
        codeWrapper.parentNode.replaceChild(container, codeWrapper);
    }

    // Post-mount focus
    requestAnimationFrame(() => {
        textarea.focus();
        updatePreview();
    });
};

export const mountMathWidget = (
    mathWrapper: HTMLElement,
    tex: string,
    isBlock: boolean,
    onSave: () => void
) => {
    const container = document.createElement('div');
    container.className = "math-editor-widget my-6 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-xl overflow-hidden bg-white dark:bg-slate-800 relative z-20 animate-in fade-in zoom-in-95 duration-200 ring-4 ring-indigo-50/50 dark:ring-indigo-900/20";
    container.setAttribute('contenteditable', 'false');

    // Header
    const header = document.createElement('div');
    header.className = "flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-indigo-50 dark:border-slate-700";
    
    const titleGroup = document.createElement('div');
    titleGroup.className = "flex items-center gap-2";
    
    const icon = document.createElement('div');
    icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path><path d="M9 10h6"/><path d="M9 14h6"/></svg>`;
    
    const label = document.createElement('span');
    label.className = "text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider";
    label.textContent = "LaTeX Formula";
    
    titleGroup.appendChild(icon);
    titleGroup.appendChild(label);

    const actionsGroup = document.createElement('div');
    actionsGroup.className = "flex gap-1";
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = "p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors";
    cancelBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    cancelBtn.title = "Delete (Esc)";

    const saveBtn = document.createElement('button');
    saveBtn.className = "p-1.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors";
    saveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    saveBtn.title = "Save (Ctrl+Enter)";

    actionsGroup.appendChild(cancelBtn);
    actionsGroup.appendChild(saveBtn);

    header.appendChild(titleGroup);
    header.appendChild(actionsGroup);

    // Editor Area
    const editorArea = document.createElement('div');
    editorArea.className = "relative bg-slate-50 dark:bg-slate-900/50";
    
    const textarea = document.createElement('textarea');
    textarea.className = "w-full p-4 font-mono text-sm leading-relaxed bg-transparent text-slate-700 dark:text-slate-200 outline-none resize-y min-h-[100px] border-none focus:ring-0";
    textarea.value = tex;
    textarea.placeholder = "\\sum_{i=0}^n x_i";
    textarea.spellcheck = false;
    
    editorArea.appendChild(textarea);

    // Preview Area
    const previewArea = document.createElement('div');
    previewArea.className = "p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center min-h-[80px] overflow-x-auto relative";
    
    const previewLabel = document.createElement('span');
    previewLabel.className = "absolute top-2 left-3 text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest pointer-events-none select-none";
    previewLabel.textContent = "Preview";
    previewArea.appendChild(previewLabel);

    const previewContent = document.createElement('div');
    previewContent.className = "w-full text-center";
    previewArea.appendChild(previewContent);

    container.appendChild(header);
    container.appendChild(editorArea);
    container.appendChild(previewArea);

    const updatePreview = (latex: string) => {
        try {
            previewContent.innerHTML = katex.renderToString(latex, {
                displayMode: true,
                throwOnError: false,
                output: 'html'
            });
        } catch (e: any) {
            previewContent.innerHTML = `<div class="text-red-500 text-xs bg-red-50 p-2 rounded border border-red-100">${e.message}</div>`;
        }
    };

    textarea.addEventListener('input', (ev) => {
        ev.stopPropagation();
        updatePreview(textarea.value);
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });

    let isFinished = false;

    const finishEditing = () => {
        if (isFinished) return;
        isFinished = true;
        document.removeEventListener('mousedown', handleClickOutside);

        const newTex = textarea.value;
        const newHtmlWrapper = createMathHtml(newTex, isBlock);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHtmlWrapper;
        const newElement = tempDiv.firstChild as HTMLElement;
        
        if (container.parentNode) {
            container.parentNode.replaceChild(newElement, container);
        }
        onSave();
    };

    const removeBlock = () => {
        if (isFinished) return;
        isFinished = true;
        document.removeEventListener('mousedown', handleClickOutside);

        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
        onSave();
    };

    // Click Outside Handler
    const handleClickOutside = (e: MouseEvent) => {
        // If the click is not inside the container, we save and close.
        if (container && !container.contains(e.target as Node)) {
            finishEditing();
        }
    };

    // Delay attaching the listener to avoid immediate trigger from the click that opened the widget
    setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    saveBtn.addEventListener('click', (ev) => { ev.stopPropagation(); finishEditing(); });
    // Prompt: Clicking X should delete
    cancelBtn.addEventListener('click', (ev) => { ev.stopPropagation(); removeBlock(); });

    textarea.addEventListener('keydown', (ev) => {
        ev.stopPropagation(); // Stop propagation to enable browser default shortcuts on textarea
        
        if (ev.key === 'Backspace' && textarea.value === '') {
            // Delete block if backspacing on empty
            ev.preventDefault();
            removeBlock();
        } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
            ev.preventDefault();
            finishEditing();
        } else if (ev.key === 'Escape') {
            ev.preventDefault();
            finishEditing();
        }
    });

    // Ensure paste/copy/cut work without interference from parent handlers
    textarea.addEventListener('paste', (ev) => ev.stopPropagation());
    textarea.addEventListener('copy', (ev) => ev.stopPropagation());
    textarea.addEventListener('cut', (ev) => ev.stopPropagation());

    updatePreview(tex);

    if (mathWrapper.parentNode) {
        mathWrapper.parentNode.replaceChild(container, mathWrapper);
    }

    requestAnimationFrame(() => {
        textarea.focus();
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    });
};