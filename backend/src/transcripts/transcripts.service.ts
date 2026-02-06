import { Injectable } from '@nestjs/common';
import { addCaptionToList } from './caption-store';
import { summarizeCaptionsToMarkdown } from './fallback-markdown';
import { tryOllamaMarkdownSummary } from './ollama-summarizer';
import { buildTranscriptText } from './transcript-text';

@Injectable()
export class TranscriptsService {
  private transcripts = new Map<string, string[]>();

  addCaption(meetingId: string, text: string) {
    if (!meetingId || !text) return;
    const list = this.transcripts.get(meetingId) ?? [];
    const next = addCaptionToList(list, text);
    if (next !== list) this.transcripts.set(meetingId, next);
  }

  getCaptions(meetingId: string): string[] {
    return this.transcripts.get(meetingId) ?? [];
  }

  getStats(meetingId: string): {
    meetingId: string;
    count: number;
    lastCaption: string;
  } {
    const captions = this.getCaptions(meetingId);
    return {
      meetingId,
      count: captions.length,
      lastCaption: captions.length > 0 ? captions[captions.length - 1] : '',
    };
  }

  clear(meetingId: string) {
    this.transcripts.delete(meetingId);
  }

  async summarize(meetingId: string): Promise<string> {
    const captions = this.getCaptions(meetingId);
    const transcriptText = buildTranscriptText(captions);
    const aiSummary = await tryOllamaMarkdownSummary(transcriptText);
    return aiSummary ?? summarizeCaptionsToMarkdown(captions);
  }
}
