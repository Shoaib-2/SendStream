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
export function validateListResponse(response: any): MailchimpListResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response: expected an object');
  }

  if (!Array.isArray(response.lists)) {
    throw new Error('Invalid response: lists property must be an array');
  }

  if (typeof response.total_items !== 'number') {
    throw new Error('Invalid response: total_items must be a number');
  }

  response.lists.forEach((list: any, index: number) => {
    if (!list.id || typeof list.id !== 'string') {
      throw new Error(`Invalid list at index ${index}: missing or invalid id`);
    }
    if (!list.stats || typeof list.stats !== 'object') {
      throw new Error(`Invalid list at index ${index}: missing or invalid stats`);
    }
  });

  return response as MailchimpListResponse;
}

export function validateCampaignResponse(response: any): MailchimpCampaignResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid campaign response: expected an object');
  }

  if (!response.id || typeof response.id !== 'string') {
    throw new Error('Invalid campaign response: missing or invalid id');
  }

  if (!response.settings || typeof response.settings !== 'object') {
    throw new Error('Invalid campaign response: missing or invalid settings');
  }

  const requiredSettings = ['subject_line', 'from_name', 'reply_to'];
  requiredSettings.forEach(setting => {
    if (!response.settings[setting] || typeof response.settings[setting] !== 'string') {
      throw new Error(`Invalid campaign response: missing or invalid ${setting}`);
    }
  });

  return response as MailchimpCampaignResponse;
}

export function validateMemberResponse(response: any): MailchimpMemberResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid member response: expected an object');
  }

  if (!Array.isArray(response.members)) {
    throw new Error('Invalid member response: members must be an array');
  }

  response.members.forEach((member: any, index: number) => {
    if (!member.email_address || typeof member.email_address !== 'string') {
      throw new Error(`Invalid member at index ${index}: missing or invalid email_address`);
    }
    if (!member.status || typeof member.status !== 'string') {
      throw new Error(`Invalid member at index ${index}: missing or invalid status`);
    }
  });

  return response as MailchimpMemberResponse;
}

// Helper function to safely validate and log API responses
export function validateApiResponse<T>(
  response: any,
  validator: (data: any) => T,
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
