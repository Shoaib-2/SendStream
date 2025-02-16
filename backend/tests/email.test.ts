import { EmailService } from '../src/services/email.service';
import nodemailer from 'nodemailer';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

// Mock logger to prevent console output during tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('Email Service', () => {
  let emailService: EmailService;
  let mockSendMail: jest.Mock<() => Promise<{ messageId: string }>>;

  beforeEach(() => {
    mockSendMail = jest.fn<() => Promise<{ messageId: string }>>().mockResolvedValue({ messageId: 'test-id' });
    const mockTransporter = {
      verify: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      sendMail: mockSendMail
    };

    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(mockTransporter as any);
    emailService = new EmailService();
  });

  it('sends newsletter to subscribers', async () => {
    const newsletter = {
      _id: '123',
      subject: 'Test Newsletter',
      content: 'Test Content'
    };
    
    const subscribers = [{
      _id: '456',
      email: 'test@example.com'
    }];

    await emailService.sendNewsletter(newsletter, subscribers);
    
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'test@example.com',
      subject: 'Test Newsletter',
      html: expect.stringContaining('Test Content')
    }));
  });
});