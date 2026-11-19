-- 002: the app's own passkeys (WebAuthn credentials)
-- Data model: docs/04-account-linking.md#passkeys

CREATE TABLE dbo.passkeys (
    id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_passkeys PRIMARY KEY,
    user_id        UNIQUEIDENTIFIER NOT NULL
                   CONSTRAINT fk_passkeys_user REFERENCES dbo.users (id) ON DELETE CASCADE,
    -- base64url, as the browser returns it
    credential_id  NVARCHAR(512)    NOT NULL CONSTRAINT uq_passkeys_credential_id UNIQUE,
    public_key     VARBINARY(MAX)   NOT NULL,
    sign_count     BIGINT           NOT NULL CONSTRAINT df_passkeys_sign_count DEFAULT 0,
    transports     NVARCHAR(200)    NULL,
    -- 'singleDevice' or 'multiDevice' (synced passkey)
    device_type    NVARCHAR(32)     NOT NULL,
    backed_up      BIT              NOT NULL,
    name           NVARCHAR(100)    NOT NULL,
    created_at     DATETIME2(3)     NOT NULL CONSTRAINT df_passkeys_created_at DEFAULT SYSUTCDATETIME(),
    last_used_at   DATETIME2(3)     NULL
);

CREATE INDEX ix_passkeys_user_id ON dbo.passkeys (user_id);
