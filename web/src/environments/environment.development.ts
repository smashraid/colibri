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
    url: 'https://localhost:62279/api/',
    token: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
    retries: 3,
    delay: 10000,
  },
};
