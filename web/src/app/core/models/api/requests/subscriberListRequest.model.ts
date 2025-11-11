import { SubscriberIterable } from "../subscriberIterable.model";

export interface SubscriberListRequest {
  listId: number;
  subscribers: SubscriberIterable[];
  updateExistingUsersOnly: boolean;
}
