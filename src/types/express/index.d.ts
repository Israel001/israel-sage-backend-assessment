declare global {
  namespace Express {
    interface Request {
      auth?: {
        accountId: string;
      };
    }
  }
}

export {};
