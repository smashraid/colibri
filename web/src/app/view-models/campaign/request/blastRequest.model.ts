import { SubscriberIterable } from '../../subscriber/subscriberIterable.model';

export interface BlastRequest {
  campaignName: string;
  listName: string;
  listDescription: string;
  templateId: number;
  listId: number;
  supressionList: number | null | undefined;
  sendAt: string;
  order: number;
  subscribers: SubscriberIterable[];
}
