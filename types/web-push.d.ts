declare module "web-push" {
  type PushSubscription = {
    endpoint: string;
    keys: {
      auth: string;
      p256dh: string;
    };
  };

  type VapidDetails = {
    subject: string;
    publicKey: string;
    privateKey: string;
  };

  type SendResult = {
    statusCode?: number;
  };

  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  function generateVAPIDKeys(): VapidDetails;
  function sendNotification(
    subscription: PushSubscription,
    payload?: string,
  ): Promise<SendResult>;

  const webpush: {
    generateVAPIDKeys: typeof generateVAPIDKeys;
    sendNotification: typeof sendNotification;
    setVapidDetails: typeof setVapidDetails;
  };

  export default webpush;
}
