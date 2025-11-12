export interface SubscriberResponse {
  email: string;
  dataFields?: { [key: string]: any } | null;
  mergeNestedObjects: boolean;
  preferUserId: boolean;
  userId?: bigint;
}

export interface FailedUpdates {
  conflictEmails: string[];
  conflictUserIds: string[];
  forgottenEmails: string[];
  forgottenUserIds: string[];
  invalidDataEmails: string[];
  invalidDataUserIds: string[];
  invalidEmails: string[];
  invalidUserIds: string[];
  notFoundEmails: string[];
  notFoundUserIds: string[];
}

export interface CreateSubscribersResponse {
  createdFields: string[];
  failCount: bigint;
  failedUpdates: FailedUpdates;
  filteredOutFields: string[];
  invalidEmails: string[];
  invalidUserIds: string[];
  successCount: bigint;
}
