import { MailchimpService } from '../src/services/Integrations/mailchimp';
import axios, { AxiosInstance } from 'axios';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>;

// Mock utilities
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../src/utils/retry', () => ({
  withRetry: jest.fn().mockImplementation((...args: any[]) => args[0]())
}));

jest.mock('../src/utils/rateLimiter', () => ({
  mailchimpRateLimiter: {
    withRateLimit: jest.fn().mockImplementation((...args: any[]) => args[0]())
  }
}));

// Mock validation
jest.mock('../src/utils/validation', () => ({
  validateApiResponse: jest.fn().mockImplementation((data) => data),
  validateListResponse: jest.fn().mockImplementation((data) => data),
  validateCampaignResponse: jest.fn().mockImplementation((data) => data),
  validateMemberResponse: jest.fn().mockImplementation((data) => data)
}));

describe('MailchimpService', () => {
  let mailchimpService: MailchimpService;
  const mockApiKey = 'test-api-key';
  const mockServerPrefix = 'us1';
  const mockListId = 'test-list-id';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup axios mock for create method
    mockedAxios.create.mockReturnValue(mockedAxiosInstance);
    
    // Initialize service
    mailchimpService = new MailchimpService(mockApiKey, mockServerPrefix);
  });

  describe('initializeList', () => {
    it('should successfully initialize list', async () => {
      const mockResponse = {
        data: {
          lists: [{ id: mockListId }],
          total_items: 1
        }
      };

      mockedAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await mailchimpService.initializeList();
      expect(result).toBe(mockListId);
    });

    it('should handle empty lists', async () => {
      mockedAxiosInstance.get.mockResolvedValueOnce({
        data: {
          lists: [],
          total_items: 0
        }
      });

      await expect(mailchimpService.initializeList()).rejects.toThrow();
    });
  });

  describe('getSubscriberStats', () => {
    it('should return subscriber statistics', async () => {
      const mockStats = {
        member_count: 100,
        unsubscribe_count: 10,
        cleaned_count: 5
      };

      mockedAxiosInstance.get.mockResolvedValueOnce({
        data: { stats: mockStats }
      });

      const stats = await mailchimpService.getSubscriberStats();
      expect(stats).toEqual({
        memberCount: 100,
        unsubscribeCount: 10,
        cleanedCount: 5
      });
    });
  });

  describe('addSubscribers', () => {
    it('should batch add subscribers', async () => {
      const subscribers = [
        { email: 'test1@example.com', name: 'Test 1' },
        { email: 'test2@example.com', name: 'Test 2' }
      ];

      mockedAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'batch-op-id' } });

      await mailchimpService.addSubscribers(subscribers);

      expect(mockedAxiosInstance.post).toHaveBeenCalledWith('/batches', {
        operations: expect.arrayContaining([
          expect.objectContaining({
            method: 'POST',
            path: expect.stringContaining('/lists/'),
            body: expect.objectContaining({
              email_address: expect.any(String),
              status: 'subscribed'
            })
          })
        ])
      });
    });
  });

  describe('sendNewsletter', () => {
    const mockNewsletter = {
      subject: 'Test Newsletter',
      content: '<p>Test content</p>'
    };

    it('should create and send campaign', async () => {
      const mockCampaignId = 'test-campaign-id';

      // Mock campaign creation
      mockedAxiosInstance.post.mockResolvedValueOnce({
        data: { id: mockCampaignId }
      });

      // Mock content setting
      mockedAxiosInstance.put.mockResolvedValueOnce({ data: { success: true } });

      // Mock campaign sending
      mockedAxiosInstance.post.mockResolvedValueOnce({ data: { success: true } });

      await mailchimpService.sendNewsletter(mockNewsletter);

      expect(mockedAxiosInstance.post).toHaveBeenCalledWith('/campaigns', expect.any(Object));
      expect(mockedAxiosInstance.put).toHaveBeenCalledWith(
        `/campaigns/${mockCampaignId}/content`,
        expect.any(Object)
      );
      expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
        `/campaigns/${mockCampaignId}/actions/send`
      );
    });

    it('should handle campaign creation failure', async () => {
      mockedAxiosInstance.post.mockRejectedValueOnce(new Error('API Error'));

      await expect(mailchimpService.sendNewsletter(mockNewsletter))
        .rejects.toThrow('API Error');
    });
  });

  describe('testConnection', () => {
    it('should successfully test connection', async () => {
      const mockResponse = {
        data: {
          lists: [{
            id: mockListId,
            name: 'Test List',
            stats: { member_count: 100 }
          }],
          total_items: 1
        }
      };

      mockedAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await mailchimpService.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.listId).toBe(mockListId);
    });

    it('should handle connection failure', async () => {
      mockedAxiosInstance.get.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await mailchimpService.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });
});
