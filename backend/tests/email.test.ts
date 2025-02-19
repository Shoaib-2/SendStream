import { EmailService } from '../src/services/email.service';
import nodemailer from 'nodemailer';
import { beforeEach, afterEach, describe, it, expect, jest } from '@jest/globals';

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
  let mockTransporter: any;

  beforeEach(() => {
    mockSendMail = jest.fn<() => Promise<{ messageId: string }>>().mockResolvedValue({ messageId: 'test-id' });
    mockTransporter = {
      verify: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      sendMail: mockSendMail,
      close: jest.fn()
    };

    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(mockTransporter);
    emailService = new EmailService();
  });

  afterEach(() => {
    // Close the transporter after each test
    if (mockTransporter && typeof mockTransporter.close === 'function') {
      mockTransporter.close();
    }
    jest.clearAllMocks();
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
