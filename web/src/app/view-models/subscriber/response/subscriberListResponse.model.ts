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


export interface SubscriberListResponse {
    createdFields: string[]
    failCount: number
    failedUpdates: FailedUpdates
    filteredOutFields: string[]
    invalidEmails: string[]
    invalidUserIds: string[]
    successCount: number
  }