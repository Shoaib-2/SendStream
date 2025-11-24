import { logger } from './logger';

// Interface definitions for Mailchimp API responses
export interface MailchimpListResponse {
  lists: Array<{
    id: string;
    name: string;
    stats: {
      member_count: number;
      unsubscribe_count: number;
      cleaned_count: number;
    };
  }>;
  total_items: number;
}

export interface MailchimpCampaignResponse {
  id: string;
  status: string;
  settings: {
    subject_line: string;
    from_name: string;
    reply_to: string;
  };
}

export interface MailchimpMemberResponse {
  members: Array<{
    email_address: string;
    merge_fields: {
      FNAME?: string;
    };
    status: string;
    timestamp_signup: string;
  }>;
  total_items: number;
}

// Validation functions
export function validateListResponse(response: unknown): MailchimpListResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response: expected an object');
  }

  const data = response as Record<string, unknown>;

  if (!Array.isArray(data.lists)) {
    throw new Error('Invalid response: lists property must be an array');
  }

  if (typeof data.total_items !== 'number') {
    throw new Error('Invalid response: total_items must be a number');
  }

  data.lists.forEach((list: unknown, index: number) => {
    if (!list || typeof list !== 'object') {
      throw new Error(`Invalid list at index ${index}: must be an object`);
    }
    const listObj = list as Record<string, unknown>;
    if (!listObj.id || typeof listObj.id !== 'string') {
      throw new Error(`Invalid list at index ${index}: missing or invalid id`);
    }
    if (!listObj.stats || typeof listObj.stats !== 'object') {
      throw new Error(`Invalid list at index ${index}: missing or invalid stats`);
    }
  });

  return data as unknown as MailchimpListResponse;
}

export function validateCampaignResponse(response: unknown): MailchimpCampaignResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid campaign response: expected an object');
  }

  const data = response as Record<string, unknown>;

  if (!data.id || typeof data.id !== 'string') {
    throw new Error('Invalid campaign response: missing or invalid id');
  }

  if (!data.settings || typeof data.settings !== 'object') {
    throw new Error('Invalid campaign response: missing or invalid settings');
  }

  const settings = data.settings as Record<string, unknown>;
  const requiredSettings = ['subject_line', 'from_name', 'reply_to'];
  requiredSettings.forEach(setting => {
    if (!settings[setting] || typeof settings[setting] !== 'string') {
      throw new Error(`Invalid campaign response: missing or invalid ${setting}`);
    }
  });

  return data as unknown as MailchimpCampaignResponse;
}

export function validateMemberResponse(response: unknown): MailchimpMemberResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid member response: expected an object');
  }

  const data = response as Record<string, unknown>;

  if (!Array.isArray(data.members)) {
    throw new Error('Invalid member response: members must be an array');
  }

  data.members.forEach((member: unknown, index: number) => {
    if (!member || typeof member !== 'object') {
      throw new Error(`Invalid member at index ${index}: must be an object`);
    }
    const memberObj = member as Record<string, unknown>;
    if (!memberObj.email_address || typeof memberObj.email_address !== 'string') {
      throw new Error(`Invalid member at index ${index}: missing or invalid email_address`);
    }
    if (!memberObj.status || typeof memberObj.status !== 'string') {
      throw new Error(`Invalid member at index ${index}: missing or invalid status`);
    }
  });

  return data as unknown as MailchimpMemberResponse;
}

// Helper function to safely validate and log API responses
export function validateApiResponse<T>(
  response: unknown,
  validator: (data: unknown) => T,
  context: string
): T {
  try {
    const validatedResponse = validator(response);
    logger.info(`Successfully validated ${context} response`);
    return validatedResponse;
  } catch (error) {
    logger.error(`Validation error in ${context}:`, error);
    logger.error('Received response:', response);
    throw error;
  }
}
