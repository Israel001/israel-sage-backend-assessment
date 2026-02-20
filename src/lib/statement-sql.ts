import { knex as createKnex, type Knex } from "knex";
import type { TransactionType } from "../types/domain";

// Knex is used as a portable query DSL for statement/report query templates.
const knex = createKnex({ client: "pg" });

interface StatementSqlArgs {
  accountId: string;
  type?: TransactionType;
  limit?: number;
}

export function buildStatementSql({
  accountId,
  type = undefined,
  limit = 20
}: StatementSqlArgs): Knex.Sql {
  return knex("transactions")
    .select("*")
    .where((builder) => {
      builder.where("from_account_id", accountId).orWhere("to_account_id", accountId);
    })
    .modify((builder) => {
      if (type) {
        builder.andWhere("type", type);
      }
    })
    .orderBy("created_at", "desc")
    .limit(Math.max(1, Math.min(Number(limit) || 20, 100)))
    .toSQL();
}
