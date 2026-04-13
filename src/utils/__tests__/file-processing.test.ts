import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTextFromPDF, processFileAttachment } from '../file-processing';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'mocked pdf content' }]
        })
      })
    })
  })
}));

describe('file-processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract text from PDF mock', async () => {
    const mockFile = new File([''], 'test.pdf', { type: 'application/pdf' });
    const text = await extractTextFromPDF(mockFile);
    expect(text).toContain('mocked pdf content');
  });

  it('should process image attachment', async () => {
    const mockFile = new File(['image content'], 'test.png', { type: 'image/png' });
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    
    const attachment = await processFileAttachment(mockFile);
    expect(attachment?.type).toBe('image');
    expect(attachment?.name).toBe('test.png');
  });

  it('should process markdown attachment', async () => {
    const mockFile = new File(['# Title'], 'notes.md', { type: 'text/markdown' });
    const attachment = await processFileAttachment(mockFile);
    expect(attachment?.type).toBe('md');
    expect(attachment?.content).toBe('# Title');
  });
});
