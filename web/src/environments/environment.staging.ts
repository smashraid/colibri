export const environment = {
    production: false,
    msalConfig: {
      auth: {
        clientId: 'ENTER_CLIENT_ID',
        authority: 'ENTER_AUTHORITY',
      },
    },
    apiConfig: {
      scopes: ['ENTER_SCOPE'],
      uri: 'ENTER_URI',
    },
    iterable: {
        url: 'https://api.qa.tztech.io/digital-communication/api/',
        token: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
        retries: 3,
        delay: 6000
    }
  };