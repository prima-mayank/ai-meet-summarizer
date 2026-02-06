import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TranscriptsService } from '../transcripts/transcripts.service';

@Controller('export')
export class ExportController {
  constructor(private transcriptsService: TranscriptsService) {}

  @Get()
  async export(
    @Query('meetingId') meetingId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const safeFormat = (format || 'txt').toLowerCase();
    const captions = this.transcriptsService.getCaptions(meetingId);
    const summary = await this.transcriptsService.summarize(meetingId);
    const title = `Summary for ${meetingId || 'session'}`;
    const transcript = captions.join('\n');

    if (safeFormat === 'md') {
      const body = `# ${title}\n\n## Summary\n\n${summary}\n\n## Transcript\n\n${transcript}\n`;
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="summary.md"');
      return res.send(body);
    }

    if (safeFormat === 'pdf') {
      const body = `${title}\n\nSummary:\n${summary}\n\nTranscript:\n${transcript}\n`;
      const pdf = buildSimplePdf(body);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="summary.pdf"',
      );
      return res.send(pdf);
    }

    if (safeFormat === 'notion') {
      const blocks = buildNotionBlocks(title, summary, transcript);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="notion.json"',
      );
      return res.send(JSON.stringify({ title, blocks }, null, 2));
    }

    const text = `${title}\n\nSummary:\n${summary}\n\nTranscript:\n${transcript}\n`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="summary.txt"');
    return res.send(text);
  }
}

function buildNotionBlocks(title: string, summary: string, transcript: string) {
  return [
    headingBlock(title),
    headingBlock('Summary', 2),
    paragraphBlock(summary),
    headingBlock('Transcript', 2),
    paragraphBlock(transcript || ''),
  ];
}

function headingBlock(text: string, level = 1) {
  const type = level === 1 ? 'heading_1' : 'heading_2';
  return {
    object: 'block',
    type,
    [type]: {
      rich_text: [{ type: 'text', text: { content: text } }],
    },
  };
}

function paragraphBlock(text: string) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: text } }],
    },
  };
}

function buildSimplePdf(text: string) {
  const lines = text.split(/\r?\n/);
  const contentLines = lines.map((line) => `(${escapePdfText(line)}) Tj`);
  const content = [
    'BT',
    '/F1 12 Tf',
    '72 740 Td',
    ...contentLines.map((line) => `${line} T*`),
    'ET',
  ].join('\n');

  const objects: string[] = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objects.push(
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
  );
  objects.push(
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  );
  objects.push(
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  );

  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  let offset = 0;
  const chunks = ['%PDF-1.4'];
  for (const obj of objects) {
    offset += chunks.join('\n').length + 1;
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    chunks.push(obj);
  }
  const body = chunks.join('\n');
  const startxref = body.length + 1;
  const trailer = `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return `${body}\n${xref}${trailer}`;
}

function escapePdfText(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}
