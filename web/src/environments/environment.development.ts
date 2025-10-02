export const environment = {
  production: false,
  msalConfig: {
    auth: {
      clientId: 'a8083a09-0c99-4e59-8b5c-aea127f19da2',
      authority:
        'https://login.microsoftonline.com/7427676f-ed2e-4126-b3b1-06279ba31283',
    },
  },
  apiConfig: {
    scopes: ['user.read'],
    uri: 'https://graph.microsoft.com/v1.0/me',
  },
  digitalCommunication: {
    url: 'https://localhost:62279/api/',
    token: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
    retries: 3,
    delay: 10000,
  },
  errorLogging: {
    logNetworkErrors: true,
    logClientErrors: true,
    logServerErrors: true,
    log4xxErrors: true,
    log5xxErrors: true,
    logRequestBody: true, // Log request bodies in dev
    logResponseBody: true, // Log response bodies in dev
    excludeUrls: ['api/operation/clientlogs', 'api/health'],
    excludeStatusCodes: [],
    showUserNotifications: true, // Show notifications in dev
    redirectOn401: true,
    loginUrl: '/',
  },
};
