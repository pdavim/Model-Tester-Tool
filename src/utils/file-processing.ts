import * as pdfjsLib from 'pdfjs-dist';
import { Attachment } from '@/types';
import { toast } from 'sonner';

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items as any[]).map(item => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

export async function captureVideoFrames(file: File, frameCount: number = 3): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: string[] = [];
    
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.play();
    
    video.onloadedmetadata = async () => {
      const duration = video.duration;
      for (let i = 0; i < frameCount; i++) {
        const time = (duration / (frameCount + 1)) * (i + 1);
        video.currentTime = time;
        await new Promise(r => {
          video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.8));
            r(true);
          };
        });
      }
      URL.revokeObjectURL(video.src);
      resolve(frames);
    };
  });
}

export async function processFileAttachment(file: File): Promise<Attachment | null> {
  const id = Math.random().toString(36).substring(7);
  const url = URL.createObjectURL(file);
  
  try {
    if (file.type.startsWith('image/')) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      return { id, name: file.name, type: 'image', url, base64 };
    } else if (file.type.startsWith('video/')) {
      const frames = await captureVideoFrames(file);
      return { id, name: file.name, type: 'video', url, base64: frames[0] };
    } else if (file.type === 'application/pdf') {
      const content = await extractTextFromPDF(file);
      return { id, name: file.name, type: 'pdf', url, content };
    } else if (file.name.endsWith('.md') || file.type === 'text/markdown') {
      const content = await file.text();
      return { id, name: file.name, type: 'md', url, content };
    } else {
      toast.error(`Unsupported file type: ${file.name}`);
      return null;
    }
  } catch (err) {
    console.error(`Error processing ${file.name}:`, err);
    toast.error(`Failed to process ${file.name}`);
    return null;
  }
}
