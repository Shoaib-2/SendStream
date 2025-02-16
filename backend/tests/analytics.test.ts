// backend/tests/analytics.test.ts
import { analyticsService } from '../src/services/analytics.service';
import Analytics from '../src/models/analytics';
import Newsletter from '../src/models/Newsletter';
import mongoose from 'mongoose';

jest.mock('../src/models/analytics');
jest.mock('../src/models/Newsletter');
jest.mock('../src/utils/logger');

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks email opens', async () => {
    const mockAnalytics = {
      _id: new mongoose.Types.ObjectId(),
      newsletterId: 'newsletter-id',
      opens: { count: 0, details: [] }
    };

    (Analytics.findOne as jest.Mock).mockResolvedValue(mockAnalytics);
    (Analytics.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockAnalytics);
    (Newsletter.findById as jest.Mock).mockResolvedValue({ sentTo: 100 });

    await analyticsService.trackOpen('newsletter-id', 'subscriber-id');

    expect(Analytics.findByIdAndUpdate).toHaveBeenCalledWith(
      mockAnalytics._id,
      expect.objectContaining({
        $inc: { 'opens.count': 1 }
      })
    );
  });

  it('calculates metrics correctly', async () => {
    const mockNewsletter = {
      _id: 'newsletter-id',
      sentTo: 100
    };

    const mockAnalytics = {
      newsletterId: 'newsletter-id',
      opens: { count: 50 },
      clicks: { count: 25 }
    };

    (Analytics.findOne as jest.Mock).mockResolvedValue(mockAnalytics);
    (Newsletter.findById as jest.Mock).mockResolvedValue(mockNewsletter);

    await analyticsService.trackOpen('newsletter-id', 'subscriber-id');

    expect(Newsletter.findByIdAndUpdate).toHaveBeenCalledWith(
      'newsletter-id',
      expect.objectContaining({
        openRate: 50,
        clickRate: 50
      })
    );
  });
});