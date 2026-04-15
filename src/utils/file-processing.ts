import * as pdfjsLib from 'pdfjs-dist';
import { Attachment } from '@/types';
import { toast } from 'sonner';

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  
  try {
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as any[]).map(item => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  } finally {
    // Crucial for stopping memory leaks in worker threads
    await loadingTask.destroy();
  }
}

export async function captureVideoFrames(file: File, frameCount: number = 3): Promise<string[]> {
  const videoUrl = URL.createObjectURL(file);
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: string[] = [];
    
    video.src = videoUrl;
    video.muted = true;
    
    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(videoUrl);
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        for (let i = 0; i < frameCount; i++) {
          const time = (duration / (frameCount + 1)) * (i + 1);
          video.currentTime = time;
          await new Promise(r => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context?.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL('image/jpeg', 0.8));
              r(true);
            };
            video.addEventListener('seeked', onSeeked);
          });
        }
        cleanup();
        resolve(frames);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = (err) => {
      cleanup();
      reject(err);
    };
  });
}

export async function processFileAttachment(file: File): Promise<Attachment | null> {
  const id = crypto.randomUUID();
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
      URL.revokeObjectURL(url);
      return null;
    }
  } catch (err) {
    console.error(`Error processing ${file.name}:`, err);
    toast.error(`Failed to process ${file.name}`);
    URL.revokeObjectURL(url);
    return null;
  }
}
