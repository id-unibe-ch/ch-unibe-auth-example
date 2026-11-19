import { randomUUID } from 'node:crypto';
import { isDatabaseConfigured } from './db';
import type { ProviderProfile } from './providers';
import { SqlUserStore } from './store-sql';

/**
 * Data access for user accounts and linked identities.
 * Data model: docs/04-account-linking.md
 *
 * Two implementations:
 *   - SqlUserStore (store-sql.ts): Azure SQL, active once SQL_SERVER and SQL_DATABASE are set
 *   - MemoryUserStore (below): development without a database only; data is lost on restart
 */

export interface Identity {
  id: string;
  provider: string;
  issuer: string;
  subject: string;
  email?: string;
  emailVerified?: boolean;
  claims: Record<string, unknown>;
  linkedAt: Date;
  lastLoginAt: Date;
}

export interface User {
  id: string;
  displayName?: string;
  createdAt: Date;
  identities: Identity[];
}

export type LinkResult = 'linked' | 'already-linked' | 'conflict';
export type UnlinkResult = 'unlinked' | 'not-found' | 'last-identity';

export interface UserStore {
  getUser(userId: string): Promise<User | undefined>;
  findUserIdByIdentity(issuer: string, subject: string): Promise<string | undefined>;
  createUser(provider: string, profile: ProviderProfile): Promise<User>;
  /** Updates the claims and last sign-in of an existing identity. */
  recordLogin(provider: string, profile: ProviderProfile): Promise<void>;
  linkIdentity(userId: string, provider: string, profile: ProviderProfile): Promise<LinkResult>;
  unlinkIdentity(userId: string, identityId: string): Promise<UnlinkResult>;
  deleteUser(userId: string): Promise<void>;
}

const key = (issuer: string, subject: string) => `${issuer}\u0000${subject}`;

function toIdentity(provider: string, profile: ProviderProfile): Identity {
  const now = new Date();
  return {
    id: randomUUID(),
    provider,
    issuer: profile.issuer,
    subject: profile.subject,
    email: profile.email,
    emailVerified: profile.emailVerified,
    claims: profile.claims,
    linkedAt: now,
    lastLoginAt: now,
  };
}

class MemoryUserStore implements UserStore {
  private users = new Map<string, User>();
  /** Uniqueness (issuer, subject) → userId, the equivalent of UNIQUE(issuer, subject). */
  private identityIndex = new Map<string, string>();

  async getUser(userId: string) {
    return this.users.get(userId);
  }

  async findUserIdByIdentity(issuer: string, subject: string) {
    return this.identityIndex.get(key(issuer, subject));
  }

  async createUser(provider: string, profile: ProviderProfile) {
    const identity = toIdentity(provider, profile);
    const user: User = {
      id: randomUUID(),
      displayName: profile.displayName,
      createdAt: new Date(),
      identities: [identity],
    };
    this.users.set(user.id, user);
    this.identityIndex.set(key(identity.issuer, identity.subject), user.id);
    return user;
  }

  async recordLogin(provider: string, profile: ProviderProfile) {
    const userId = this.identityIndex.get(key(profile.issuer, profile.subject));
    const identity = userId
      ? this.users
          .get(userId)
          ?.identities.find((i) => i.issuer === profile.issuer && i.subject === profile.subject)
      : undefined;
    if (!identity) return;
    identity.provider = provider;
    identity.claims = profile.claims;
    identity.email = profile.email;
    identity.emailVerified = profile.emailVerified;
    identity.lastLoginAt = new Date();
  }

  async linkIdentity(userId: string, provider: string, profile: ProviderProfile) {
    const owner = this.identityIndex.get(key(profile.issuer, profile.subject));
    if (owner === userId) return 'already-linked';
    if (owner) return 'conflict';
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    const identity = toIdentity(provider, profile);
    user.identities.push(identity);
    this.identityIndex.set(key(identity.issuer, identity.subject), userId);
    return 'linked';
  }

  async unlinkIdentity(userId: string, identityId: string) {
    const user = this.users.get(userId);
    const identity = user?.identities.find((i) => i.id === identityId);
    if (!user || !identity) return 'not-found';
    // Later also count passkeys: one way to sign in has to remain.
    if (user.identities.length <= 1) return 'last-identity';
    user.identities = user.identities.filter((i) => i.id !== identityId);
    this.identityIndex.delete(key(identity.issuer, identity.subject));
    return 'unlinked';
  }

  async deleteUser(userId: string) {
    const user = this.users.get(userId);
    if (!user) return;
    for (const i of user.identities) this.identityIndex.delete(key(i.issuer, i.subject));
    this.users.delete(userId);
  }
}

// Kept on globalThis so the state survives hot reloads of the dev server.
const g = globalThis as unknown as { __userStore?: UserStore };
export const store: UserStore = (g.__userStore ??= isDatabaseConfigured()
  ? new SqlUserStore()
  : new MemoryUserStore());

if (!isDatabaseConfigured()) {
  console.warn('[store] No database configured (SQL_SERVER/SQL_DATABASE) – using the in-memory store.');
}
