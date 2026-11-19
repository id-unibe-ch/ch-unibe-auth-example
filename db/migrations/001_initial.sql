-- 001: user accounts, linked identities and sessions
-- Data model: docs/04-account-linking.md

CREATE TABLE dbo.users (
    id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_users PRIMARY KEY,
    display_name  NVARCHAR(256)    NULL,
    created_at    DATETIME2(3)     NOT NULL CONSTRAINT df_users_created_at DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.identities (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_identities PRIMARY KEY,
    user_id         UNIQUEIDENTIFIER NOT NULL
                    CONSTRAINT fk_identities_user REFERENCES dbo.users (id) ON DELETE CASCADE,
    provider        NVARCHAR(64)     NOT NULL,
    issuer          NVARCHAR(400)    NOT NULL,
    subject         NVARCHAR(255)    NOT NULL,
    email           NVARCHAR(320)    NULL,
    email_verified  BIT              NULL,
    claims          NVARCHAR(MAX)    NOT NULL CONSTRAINT ck_identities_claims_json CHECK (ISJSON(claims) = 1),
    linked_at       DATETIME2(3)     NOT NULL CONSTRAINT df_identities_linked_at DEFAULT SYSUTCDATETIME(),
    last_login_at   DATETIME2(3)     NOT NULL CONSTRAINT df_identities_last_login_at DEFAULT SYSUTCDATETIME(),
    -- An identity belongs to exactly one user account (ADR-005).
    CONSTRAINT uq_identities_issuer_subject UNIQUE (issuer, subject)
);

CREATE INDEX ix_identities_user_id ON dbo.identities (user_id);

-- Astro sessions: the content is a serialised blob; Astro handles the expiry of individual values.
CREATE TABLE dbo.sessions (
    id          NVARCHAR(128)  NOT NULL CONSTRAINT pk_sessions PRIMARY KEY,
    data        NVARCHAR(MAX)  NOT NULL,
    updated_at  DATETIME2(3)   NOT NULL CONSTRAINT df_sessions_updated_at DEFAULT SYSUTCDATETIME()
);

CREATE INDEX ix_sessions_updated_at ON dbo.sessions (updated_at);
