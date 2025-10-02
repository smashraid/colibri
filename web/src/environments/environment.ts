// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true,
  msalConfig: {
    auth: {
      clientId: '4bc15bea-cf50-4c40-8551-6acca007cd8d',
      authority:
        'https://login.microsoftonline.com/7427676f-ed2e-4126-b3b1-06279ba31283',
    },
  },
  apiConfig: {
    scopes: ['user.read'],
    uri: 'https://graph.microsoft.com/v1.0/me',
  },
  digitalCommunication: {
    url: 'https://api.tztech.io/digital-communication/api/',
    token: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
    retries: 3,
    delay: 6000,
  },
  errorLogging: {
    logNetworkErrors: true,
    logClientErrors: true,
    logServerErrors: true,
    log4xxErrors: true,
    log5xxErrors: true,
    logRequestBody: false,
    logResponseBody: false,
    excludeUrls: [
      'api/operation/logClientErrorBatch',
      'api/health',
      'api/ping',
    ],
    excludeStatusCodes: [401, 404],
    showUserNotifications: false,
    redirectOn401: false,
    loginUrl: '/',
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
