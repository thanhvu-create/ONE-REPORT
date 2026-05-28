import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiService (mock mode)', () => {
  let service: AiService;
  const prismaStub = {
    aiProcessingLog: { create: jest.fn().mockResolvedValue({}) },
  } as unknown as PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: prismaStub },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                'gemini.apiKey': '',
                'gemini.chatModel': 'gemini-2.0-flash',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();
    service = moduleRef.get(AiService);
  });

  it('reports it is in mock mode when no API key is set', () => {
    expect(service.isUsingMock()).toBe(true);
  });

  describe('heuristic analysis', () => {
    it('detects blocker and high priority on "blocked"', async () => {
      const res = await service.analyze(null, 'I am blocked because supplier data is missing.');
      expect(res.analysis.has_blocker).toBe(true);
      expect(res.analysis.priority).toBe('high');
      expect(res.analysis.issue_category).toBe('missing_data');
    });

    it('detects urgent on customer-impact language', async () => {
      const res = await service.analyze(null, 'Critical production outage with customer impact.');
      expect(res.analysis.priority).toBe('urgent');
      expect(res.analysis.has_blocker).toBe(true);
    });

    it('returns low priority + no blocker for a calm update', async () => {
      const res = await service.analyze(null, 'Completed quarterly inventory check, all good.');
      expect(res.analysis.has_blocker).toBe(false);
      expect(res.analysis.priority).toBe('low');
      expect(res.analysis.issue_category).toBe('no_issue');
    });

    it('returns fallback for empty text', async () => {
      const res = await service.analyze(null, '   ');
      expect(res.failed).toBe(true);
      expect(res.analysis.priority).toBe('medium');
      expect(res.analysis.has_blocker).toBe(false);
    });
  });

  describe('mock transcribe', () => {
    it('returns a placeholder transcript without an API key', async () => {
      const out = await service.transcribe(Buffer.from(''), 'sample.webm', 'audio/webm');
      expect(out.modelName).toBe('mock-whisper');
      expect(out.text).toContain('sample.webm');
    });
  });
});
