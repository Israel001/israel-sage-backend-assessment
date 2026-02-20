import { WalletService } from "./services/wallet-service";
import { MongoAccountRepository } from "./repositories/mongo-account-repository";
import { MongoTransactionRepository } from "./repositories/mongo-transaction-repository";
import { InMemoryAccountRepository } from "./repositories/in-memory-account-repository";
import { InMemoryTransactionRepository } from "./repositories/in-memory-transaction-repository";

export interface AppContainer {
  walletService: WalletService;
}

export interface InMemoryContainer extends AppContainer {
  accounts: InMemoryAccountRepository;
  transactions: InMemoryTransactionRepository;
}

export function createMongoContainer(): AppContainer {
  const accounts = new MongoAccountRepository();
  const transactions = new MongoTransactionRepository();
  const walletService = new WalletService({ accounts, transactions });
  return { walletService };
}

export function createInMemoryContainer(): InMemoryContainer {
  const accounts = new InMemoryAccountRepository();
  const transactions = new InMemoryTransactionRepository();
  const walletService = new WalletService({ accounts, transactions });
  return { walletService, accounts, transactions };
}
