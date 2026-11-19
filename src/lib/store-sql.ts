import { randomUUID } from 'node:crypto';
import { getPool, isUniqueViolation, sql } from './db';
import type { ProviderProfile } from './providers';
import type { Identity, LinkResult, UnlinkResult, User, UserStore } from './store';

interface IdentityRow {
  id: string;
  user_id: string;
  provider: string;
  issuer: string;
  subject: string;
  email: string | null;
  email_verified: boolean | null;
  claims: string;
  linked_at: Date;
  last_login_at: Date;
}

function toIdentity(r: IdentityRow): Identity {
  return {
    id: r.id.toLowerCase(),
    provider: r.provider,
    issuer: r.issuer,
    subject: r.subject,
    email: r.email ?? undefined,
    emailVerified: r.email_verified ?? undefined,
    claims: JSON.parse(r.claims),
    linkedAt: r.linked_at,
    lastLoginAt: r.last_login_at,
  };
}

/** Binds the parameters of a new identity to a request. */
function bindIdentity(req: sql.Request, userId: string, provider: string, p: ProviderProfile) {
  return req
    .input('id', sql.UniqueIdentifier, randomUUID())
    .input('user_id', sql.UniqueIdentifier, userId)
    .input('provider', sql.NVarChar(64), provider)
    .input('issuer', sql.NVarChar(400), p.issuer)
    .input('subject', sql.NVarChar(255), p.subject)
    .input('email', sql.NVarChar(320), p.email ?? null)
    .input('email_verified', sql.Bit, p.emailVerified ?? null)
    .input('claims', sql.NVarChar(sql.MAX), JSON.stringify(p.claims));
}

const INSERT_IDENTITY = `
  INSERT INTO dbo.identities (id, user_id, provider, issuer, subject, email, email_verified, claims)
  VALUES (@id, @user_id, @provider, @issuer, @subject, @email, @email_verified, @claims)`;

export class SqlUserStore implements UserStore {
  async getUser(userId: string): Promise<User | undefined> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input('id', sql.UniqueIdentifier, userId)
      .query<{ id: string; display_name: string | null; created_at: Date }>(
        `SELECT id, display_name, created_at FROM dbo.users WHERE id = @id;
         SELECT * FROM dbo.identities WHERE user_id = @id ORDER BY linked_at;`,
      );
    const recordsets = res.recordsets as unknown as [
      { id: string; display_name: string | null; created_at: Date }[],
      IdentityRow[],
    ];
    const u = recordsets[0][0];
    if (!u) return undefined;
    return {
      id: u.id.toLowerCase(),
      displayName: u.display_name ?? undefined,
      createdAt: u.created_at,
      identities: recordsets[1].map(toIdentity),
    };
  }

  async findUserIdByIdentity(issuer: string, subject: string) {
    const pool = await getPool();
    const res = await pool
      .request()
      .input('issuer', sql.NVarChar(400), issuer)
      .input('subject', sql.NVarChar(255), subject)
      .query<{ user_id: string }>(
        'SELECT user_id FROM dbo.identities WHERE issuer = @issuer AND subject = @subject',
      );
    return res.recordset[0]?.user_id.toLowerCase();
  }

  async createUser(provider: string, profile: ProviderProfile): Promise<User> {
    const pool = await getPool();
    const userId = randomUUID();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input('id', sql.UniqueIdentifier, userId)
        .input('display_name', sql.NVarChar(256), profile.displayName?.slice(0, 256) ?? null)
        .query('INSERT INTO dbo.users (id, display_name) VALUES (@id, @display_name)');
      await bindIdentity(new sql.Request(tx), userId, provider, profile).query(INSERT_IDENTITY);
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
    return (await this.getUser(userId))!;
  }

  async recordLogin(provider: string, profile: ProviderProfile) {
    const pool = await getPool();
    await pool
      .request()
      .input('provider', sql.NVarChar(64), provider)
      .input('issuer', sql.NVarChar(400), profile.issuer)
      .input('subject', sql.NVarChar(255), profile.subject)
      .input('email', sql.NVarChar(320), profile.email ?? null)
      .input('email_verified', sql.Bit, profile.emailVerified ?? null)
      .input('claims', sql.NVarChar(sql.MAX), JSON.stringify(profile.claims))
      .query(
        `UPDATE dbo.identities
            SET provider = @provider, email = @email, email_verified = @email_verified,
                claims = @claims, last_login_at = SYSUTCDATETIME()
          WHERE issuer = @issuer AND subject = @subject`,
      );
  }

  async linkIdentity(userId: string, provider: string, profile: ProviderProfile): Promise<LinkResult> {
    const owner = await this.findUserIdByIdentity(profile.issuer, profile.subject);
    if (owner === userId) return 'already-linked';
    if (owner) return 'conflict';
    const pool = await getPool();
    try {
      await bindIdentity(pool.request(), userId, provider, profile).query(INSERT_IDENTITY);
      return 'linked';
    } catch (err) {
      // Concurrent link of the same identity: the UNIQUE constraint decides.
      if (isUniqueViolation(err)) {
        return (await this.findUserIdByIdentity(profile.issuer, profile.subject)) === userId
          ? 'already-linked'
          : 'conflict';
      }
      throw err;
    }
  }

  async unlinkIdentity(userId: string, identityId: string): Promise<UnlinkResult> {
    const pool = await getPool();
    // Atomic: delete only if at least one identity remains afterwards.
    // Later also count passkeys.
    const res = await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('id', sql.UniqueIdentifier, identityId)
      .query<{ result: UnlinkResult }>(
        `IF NOT EXISTS (SELECT 1 FROM dbo.identities WHERE id = @id AND user_id = @user_id)
           SELECT 'not-found' AS result;
         ELSE
         BEGIN
           DELETE FROM dbo.identities
            WHERE id = @id AND user_id = @user_id
              AND (SELECT COUNT(*) FROM dbo.identities WITH (UPDLOCK, HOLDLOCK) WHERE user_id = @user_id) > 1;
           SELECT CASE WHEN @@ROWCOUNT = 1 THEN 'unlinked' ELSE 'last-identity' END AS result;
         END`,
      );
    return res.recordset[0]!.result;
  }

  async deleteUser(userId: string) {
    const pool = await getPool();
    // Identities go with it through ON DELETE CASCADE.
    await pool.request().input('id', sql.UniqueIdentifier, userId).query('DELETE FROM dbo.users WHERE id = @id');
  }
}
