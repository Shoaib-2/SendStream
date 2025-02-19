import { analyticsService } from '../src/services/analytics.service';
import Analytics from '../src/models/analytics';
import Newsletter from '../src/models/Newsletter';
import mongoose, { Types } from 'mongoose';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

// Mock the models and logger
jest.mock('../src/models/analytics');
jest.mock('../src/models/Newsletter');
jest.mock('../src/utils/logger');

// Define mock types
type MockAnalytics = {
  _id: Types.ObjectId;
  newsletterId: Types.ObjectId;
  createdBy: Types.ObjectId;
  opens: {
    count: number;
    details: Array<{
      subscriberId: Types.ObjectId;
      timestamp: Date;
    }>;
  };
  clicks: {
    count: number;
    details: Array<{
      subscriberId: Types.ObjectId;
      url: string;
      timestamp: Date;
    }>;
  };
};

type MockNewsletter = {
  _id: Types.ObjectId;
  sentTo: number;
  openRate?: number;
  clickRate?: number;
  createdBy: Types.ObjectId;
};

// Cast mocked models to jest.Mocked
const MockedAnalytics = Analytics as jest.Mocked<typeof Analytics>;
const MockedNewsletter = Newsletter as jest.Mocked<typeof Newsletter>;

describe('Analytics Service', () => {
  const TEST_USER_ID = new Types.ObjectId();
  const TEST_SUBSCRIBER_ID = new Types.ObjectId();
  const TEST_NEWSLETTER_ID = new Types.ObjectId();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks email opens', async () => {
    const mockAnalytics: MockAnalytics = {
      _id: new Types.ObjectId(),
      newsletterId: TEST_NEWSLETTER_ID,
      createdBy: TEST_USER_ID,
      opens: { count: 0, details: [] },
      clicks: { count: 0, details: [] }
    };

    const mockNewsletter: MockNewsletter = {
      _id: TEST_NEWSLETTER_ID,
      sentTo: 100,
      createdBy: TEST_USER_ID
    };

    MockedAnalytics.findOne.mockResolvedValue(mockAnalytics as any);
    MockedAnalytics.findByIdAndUpdate.mockResolvedValue(mockAnalytics as any);
    MockedNewsletter.findById.mockResolvedValue(mockNewsletter as any);

    const result = await analyticsService.trackOpen(TEST_NEWSLETTER_ID.toString(), TEST_SUBSCRIBER_ID.toString());

    expect(result).toBe(true);
    expect(MockedAnalytics.findByIdAndUpdate).toHaveBeenCalledWith(
      mockAnalytics._id,
      {
        $inc: { 'opens.count': 1 },
        $push: {
          'opens.details': expect.objectContaining({
            subscriberId: TEST_SUBSCRIBER_ID.toString(),
            timestamp: expect.any(Date)
          })
        }
      }
    );
  });

  it('calculates metrics correctly', async () => {
    const mockNewsletter: MockNewsletter = {
      _id: TEST_NEWSLETTER_ID,
      sentTo: 100,
      createdBy: TEST_USER_ID
    };

    const mockAnalytics: MockAnalytics = {
      _id: new Types.ObjectId(),
      newsletterId: TEST_NEWSLETTER_ID,
      createdBy: TEST_USER_ID,
      opens: { count: 50, details: [] },
      clicks: { count: 25, details: [] }
    };

    MockedAnalytics.findOne.mockResolvedValue(mockAnalytics as any);
    MockedNewsletter.findById.mockResolvedValue(mockNewsletter as any);
    MockedAnalytics.findByIdAndUpdate.mockResolvedValue(mockAnalytics as any);

    const result = await analyticsService.trackOpen(TEST_NEWSLETTER_ID.toString(), TEST_SUBSCRIBER_ID.toString());

    expect(result).toBe(true);
    expect(MockedAnalytics.findByIdAndUpdate).toHaveBeenCalledWith(
      mockAnalytics._id,
      {
        $inc: { 'opens.count': 1 },
        $push: {
          'opens.details': expect.objectContaining({
            subscriberId: TEST_SUBSCRIBER_ID.toString(),
            timestamp: expect.any(Date)
          })
        }
      }
    );
  });

  it('handles missing analytics record', async () => {
    const mockNewsletter: MockNewsletter = {
      _id: TEST_NEWSLETTER_ID,
      sentTo: 100,
      createdBy: TEST_USER_ID
    };

    MockedAnalytics.findOne.mockResolvedValue(null);
    MockedNewsletter.findById.mockResolvedValue(mockNewsletter as any);
    MockedAnalytics.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      newsletterId: TEST_NEWSLETTER_ID,
      createdBy: TEST_USER_ID
    } as any);
    MockedAnalytics.findByIdAndUpdate.mockResolvedValue({} as any);

    const result = await analyticsService.trackOpen(TEST_NEWSLETTER_ID.toString(), TEST_SUBSCRIBER_ID.toString());
    expect(result).toBe(true);
  });

  it('handles missing newsletter record', async () => {
    MockedNewsletter.findById.mockResolvedValue(null);

    await expect(analyticsService.trackOpen(TEST_NEWSLETTER_ID.toString(), TEST_SUBSCRIBER_ID.toString()))
      .rejects
      .toThrow('Failed to track email open');
  });

  it('validates subscriber ID', async () => {
    await expect(analyticsService.trackOpen(TEST_NEWSLETTER_ID.toString(), ''))
      .rejects
      .toThrow('Failed to track email open');
  });

  it('handles invalid newsletter ID format', async () => {
    await expect(analyticsService.trackOpen('invalid-id', TEST_SUBSCRIBER_ID.toString()))
      .rejects
      .toThrow('Failed to track email open');
  });
});
