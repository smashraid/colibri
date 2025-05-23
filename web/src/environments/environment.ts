// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true,
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
    url: 'https://api.tztech.io/digital-communication/api/',
    token: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
    retries: 3,
    delay: 6000,
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
