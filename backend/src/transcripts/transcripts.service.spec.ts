import { TranscriptsService } from './transcripts.service';

describe('TranscriptsService', () => {
  beforeAll(() => {
    process.env.OLLAMA_DISABLE = '1';
  });

  afterAll(() => {
    delete process.env.OLLAMA_DISABLE;
  });

  it('replaces incremental caption updates instead of appending', () => {
    const svc = new TranscriptsService();
    svc.addCaption('m1', 'Hello');
    svc.addCaption('m1', 'Hello world');
    svc.addCaption('m1', 'Hello world!!!');
    expect(svc.getCaptions('m1')).toEqual(['Hello world!!']);
  });

  it('collapses repeated phrases inside a caption', () => {
    const svc = new TranscriptsService();
    svc.addCaption(
      'm1',
      'with some friends with some friends and we stayed up way too too late',
    );
    const caps = svc.getCaptions('m1');
    expect(caps).toHaveLength(1);
    expect(caps[0]).toBe('with some friends and we stayed up way too too late');
  });

  it('summarize returns Markdown headings even without Ollama', async () => {
    const svc = new TranscriptsService();
    svc.addCaption('m1', 'We decided to ship on Friday.');
    const summary = await svc.summarize('m1');
    expect(summary).toMatch(/## TL;DR/);
  });
});
