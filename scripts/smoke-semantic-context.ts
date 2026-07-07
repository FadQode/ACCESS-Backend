import { sql } from "drizzle-orm";

import { env } from "../src/config/env";
import { createDatabase } from "../src/db";
import { createEmbeddingClient } from "../src/integrations/embeddings/embedding.client";
import { createSemanticContextRepository } from "../src/modules/context-suggestions/semantic-context.repository";
import { createSemanticContextService } from "../src/modules/context-suggestions/semantic-context.service";
import {
  createEmbeddingBackfillService,
  createEmbeddingRepository,
} from "../src/modules/embeddings";

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const firstRow = <T>(rows: unknown): T => {
  const row = (rows as T[])[0];
  assert(row, "Expected at least one row");
  return row;
};

const nowIso = () => new Date().toISOString();

const database = createDatabase(env.database);

try {
  const user = firstRow<{ id: string }>(
    await database.db.execute(sql`
      select id
      from users
      order by created_at asc
      limit 1
    `),
  );

  await database.db.execute(sql`
    update reference_sources
    set
      category = 'payment',
      source_type = 'policy',
      content = 'Saldo saya terpotong tapi tiket tidak muncul. Jika saldo terpotong dan tiket belum muncul, arahkan pelanggan untuk pengecekan transaksi dan jangan menjanjikan refund sebelum verifikasi.',
      status = 'active',
      search_text = 'saldo terpotong tiket tidak muncul pembayaran transaksi refund verifikasi',
      updated_at = now()
    where title = 'SOP Saldo Terpotong Tiket Tidak Muncul'
  `);

  await database.db.execute(sql`
    insert into reference_sources (
      created_by,
      source_type,
      title,
      category,
      content,
      status,
      version,
      search_text,
      created_at,
      updated_at
    )
    select
      ${user.id},
      'policy',
      'SOP Saldo Terpotong Tiket Tidak Muncul',
      'payment',
      'Saldo saya terpotong tapi tiket tidak muncul. Jika saldo terpotong dan tiket belum muncul, arahkan pelanggan untuk pengecekan transaksi dan jangan menjanjikan refund sebelum verifikasi.',
      'active',
      '1.0',
      'saldo terpotong tiket tidak muncul pembayaran transaksi refund verifikasi',
      now(),
      now()
    where not exists (
      select 1
      from reference_sources
      where title = 'SOP Saldo Terpotong Tiket Tidak Muncul'
    )
  `);

  const complaint = firstRow<{ id: string }>(
    await database.db.execute(sql`
      insert into complaints (
        reference_no,
        tracking_token,
        source,
        category,
        complaint_text,
        status,
        submitted_at,
        resolved_at,
        created_at,
        updated_at
      )
      values (
        'SMOKE-SEMANTIC-001',
        'smoke-semantic-context-token',
        'web_form',
        'payment',
        'Saldo saya terpotong tapi tiket tidak muncul.',
        'resolved',
        now(),
        now(),
        now(),
        now()
      )
      on conflict (reference_no)
      do update set
        complaint_text = excluded.complaint_text,
        status = 'resolved',
        resolved_at = now(),
        updated_at = now()
      returning id
    `),
  );

  await database.db.execute(sql`
    insert into quick_response_sessions (
      agent_id,
      complaint_id,
      source_channel,
      response_target,
      final_response,
      outcome,
      created_at,
      updated_at
    )
    select
      ${user.id},
      ${complaint.id},
      'web_form',
      'public_reply',
      'Kami memahami kendala pembayaran Anda. Laporan saldo terpotong dan tiket belum muncul akan kami teruskan untuk pengecekan transaksi.',
      'sent_resolved',
      now(),
      now()
    where not exists (
      select 1
      from quick_response_sessions
      where complaint_id = ${complaint.id}
        and outcome = 'sent_resolved'
        and final_response is not null
    )
  `);

  const embeddingClient = createEmbeddingClient(env.embedding);
  const backfill = createEmbeddingBackfillService(
    env.embedding,
    embeddingClient,
    createEmbeddingRepository(database.db),
  );

  const referenceStart = performance.now();
  const referenceSummary = await backfill.embedReferences();
  const referenceMs = Math.round(performance.now() - referenceStart);

  const caseStart = performance.now();
  const caseSummary = await backfill.embedResolvedCases();
  const caseMs = Math.round(performance.now() - caseStart);

  const semanticService = createSemanticContextService(
    env.semanticContext,
    env.embedding,
    embeddingClient,
    createSemanticContextRepository(database.db),
  );
  const semanticStart = performance.now();
  const context = await semanticService.getSemanticContextSuggestions({
    category: "payment",
    complaintText: "Saldo saya terpotong tapi tiket tidak muncul.",
  });
  const semanticMs = Math.round(performance.now() - semanticStart);

  assert(
    context.relevantReferences.length > 0,
    "Expected at least one relevant reference",
  );
  assert(
    context.similarResolvedCases.length > 0,
    "Expected at least one similar resolved case",
  );
  assert(
    !("score" in context.relevantReferences[0]!),
    "Relevant reference must not expose score",
  );
  assert(
    !("complaintId" in context.similarResolvedCases[0]!),
    "Similar resolved case must not expose complaintId",
  );
  assert(
    !("score" in context.similarResolvedCases[0]!),
    "Similar resolved case must not expose score",
  );

  console.log(
    JSON.stringify(
      {
        backfill: {
          references: referenceSummary,
          resolvedCases: caseSummary,
        },
        semanticContext: {
          relevantReferences: context.relevantReferences.length,
          similarResolvedCases: context.similarResolvedCases.length,
        },
        status: "ok",
        timing: {
          backfillReferencesMs: referenceMs,
          backfillResolvedCasesMs: caseMs,
          generatedAt: nowIso(),
          semanticMs,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await database.close();
}
