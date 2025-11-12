import { SubscriberResponse } from '../response/subscriber';

export interface CreateSubscribersRequest {
  listId: bigint;
  subscribers: SubscriberResponse[];
  updateExistingUsersOnly: boolean;
}
