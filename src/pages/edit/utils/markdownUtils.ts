import { Outline } from '../../types';

export class GitHubSlugger {
  private slugs = new Map<string, number>();

  slug(value: string) {
    let slug = value.toLowerCase()
      .trim()
      // Remove characters that aren't word characters, chinese, dashes, or spaces
      .replace(/[^\w\u4e00-\u9fa5\- ]+/g, '')
      // Replace spaces with dashes
      .replace(/\s+/g, '-');
      
    if (this.slugs.has(slug)) {
      const count = this.slugs.get(slug)! + 1;
      this.slugs.set(slug, count);
      return `${slug}-${count}`;
    } else {
      this.slugs.set(slug, 0);
      return slug;
    }
  }
}

// Helper to remove basic markdown formatting for cleaner titles
export const stripMarkdownFormatting = (text: string): string => {
  return text
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
    .replace(/(\*|_)(.*?)\1/g, '$2')     // Italic
    .replace(/`([^`]+)`/g, '$1')         // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/^[#\s]+/, '') // Leading hashes just in case
    .trim();
};

export const parseMarkdownToOutline = (markdownText: string): Outline | null => {
  if (!markdownText) return null;

  const slugger = new GitHubSlugger();
  
  // Regex to match ALL headings (H1-H6) to ensure slugger state is synced with renderer
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  let title = "Untitled Document";
  const chapters: any[] = [];
  
  // Track if we found the document title (first H1)
  let titleFound = false;

  while ((match = regex.exec(markdownText)) !== null) {
      const level = match[1].length;
      const rawTitle = match[2].trim();
      const cleanTitle = stripMarkdownFormatting(rawTitle);
      
      // Generate slug for EVERY heading to maintain sync with HTML renderer
      const slug = slugger.slug(cleanTitle);

      // Capture first H1 as document title
      if (level === 1 && !titleFound) {
          title = cleanTitle;
          titleFound = true;
          // Don't add H1 to outline tree
          continue;
      }

      // Collect content logic (simplified for sidebar navigation)
      // Note: We are strictly building the tree here. Summary/Content capturing 
      // can be enhanced if needed, but for navigation, structure + slug is key.
      
      // Add H2 (Level 1 in Sidebar)
      if (level === 2) {
          chapters.push({ 
              title: cleanTitle, 
              slug: slug, 
              summary: '', // Content mapping omitted for speed/simplicity in this pass
              children: [] 
          });
      } 
      // Add H3 (Level 2 in Sidebar)
      else if (level === 3 && chapters.length > 0) {
          const parent = chapters[chapters.length - 1];
          parent.children.push({ 
              title: cleanTitle, 
              slug: slug, 
              summary: '' 
          });
      }
  }

  return { title, chapters };
};

export const renderOutlinePreview = (outline: Outline) => {
  let preview = `# ${outline.title}\n\n`;
  preview += outline.chapters.map((c, i) => {
      const formattedSummary = c.summary.replace(/\n/g, '\n\n');
      return `## ${c.title}\n\n${formattedSummary}`;
  }).join('\n\n');
  return preview;
};