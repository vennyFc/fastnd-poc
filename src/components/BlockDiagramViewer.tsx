import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface BlockDiagramViewerProps {
  content: string;
}

export function BlockDiagramViewer({ content }: BlockDiagramViewerProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Check if content is a URL
  const isUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  // Check if content looks like Mermaid syntax
  const isMermaidSyntax = (str: string) => {
    const mermaidKeywords = ['graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'flowchart'];
    return mermaidKeywords.some(keyword => str.trim().toLowerCase().startsWith(keyword));
  };

  useEffect(() => {
    if (!isInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    const renderMermaid = async () => {
      if (!mermaidRef.current || !isInitialized || !isMermaidSyntax(content)) return;

      try {
        setRenderError(null);
        mermaidRef.current.innerHTML = '';
        
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, content);
        
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        setRenderError('Diagramm konnte nicht gerendert werden');
      }
    };

    renderMermaid();
  }, [content, isInitialized]);

  // Render as image if URL
  if (isUrl(content)) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <img 
          src={content} 
          alt="Blockdiagramm" 
          className="w-full h-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = '<p class="p-4 text-sm text-muted-foreground">Bild konnte nicht geladen werden</p>';
          }}
        />
      </div>
    );
  }

  // Render as Mermaid diagram if syntax detected
  if (isMermaidSyntax(content)) {
    return (
      <div className="rounded-lg border bg-background p-4">
        {renderError ? (
          <p className="text-sm text-destructive">{renderError}</p>
        ) : (
          <div ref={mermaidRef} className="flex justify-center items-center min-h-[200px]" />
        )}
      </div>
    );
  }

  // Render as formatted text
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
        {content}
      </pre>
    </div>
  );
}
