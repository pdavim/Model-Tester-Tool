export class ExportService {
  /**
   * Triggers a browser download for the given content.
   */
  static download(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Exports a chat session as JSON.
   */
  static exportSessionJson(session: any) {
    const content = JSON.stringify(session, null, 2);
    const date = new Date().toISOString().split('T')[0];
    this.download(content, `session-${session.id}-${date}.json`, 'application/json');
  }

  /**
   * Exports a chat session as Markdown.
   */
  static exportSessionMarkdown(session: any) {
    let md = `# ${session.name}\n\n`;
    md += `Created: ${new Date(session.createdAt).toLocaleString()}\n`;
    md += `Model: ${session.parameters.selectedModel}\n\n---\n\n`;

    session.messages.forEach((m: any) => {
      md += `### ${m.role.toUpperCase()}\n`;
      if (m.modelId) md += `*Model: ${m.modelId}*\n`;
      md += `\n${m.content}\n\n`;
      if (m.attachments?.length > 0) {
        md += `**Attachments:** ${m.attachments.map((a: any) => a.name).join(', ')}\n\n`;
      }
    });

    const date = new Date().toISOString().split('T')[0];
    this.download(md, `session-${session.id}-${date}.md`, 'text/markdown');
  }

  /**
   * Exports a benchmark report as Markdown.
   */
  static exportBenchmarkReport(results: any[], analysis: string | null) {
    let md = `# Benchmark Battle Report\n\n`;
    md += `Date: ${new Date().toLocaleString()}\n\n`;
    
    if (analysis) {
      md += `## AI Analysis\n\n${analysis}\n\n---\n\n`;
    }

    md += `## Individual Model Performance\n\n`;
    md += `| Model | Latency | Tokens | Capabilities |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;

    results.forEach(r => {
      const caps = r.capabilities.filter((c: any) => c.status === 'completed').length;
      const total = r.capabilities.length;
      md += `| ${r.model} | ${r.overallLatency}ms | ${r.overallTokens} | ${caps}/${total} PASS |\n`;
    });

    md += `\n\n## Raw Response Samples\n\n`;
    results.forEach(r => {
      md += `### ${r.model}\n\n`;
      r.capabilities.forEach((c: any) => {
        md += `#### ${c.categoryName} (${c.latency}ms)\n`;
        md += `\`\`\`\n${c.response || 'No response'}\n\`\`\`\n\n`;
      });
      md += `---\n\n`;
    });

    this.download(md, `benchmark-report-${Date.now()}.md`, 'text/markdown');
  }
}
