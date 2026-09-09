import { randomUUID } from "node:crypto";
export function createOAuthModel(db) {
  return {
    async saveRequest(request) {
      await db.query("DELETE FROM oauth_requests WHERE expires_at <= $1", [
        Date.now(),
      ]);
      await db.query(
        "INSERT INTO oauth_requests(state_hash,browser_hash,nonce,verifier,link_user_id,expires_at) VALUES($1,$2,$3,$4,$5,$6)",
        [
          request.stateHash,
          request.browserHash,
          request.nonce,
          request.verifier,
          request.linkUserId,
          request.expiresAt,
        ],
      );
    },
    async consumeRequest(stateHash, browserHash) {
      return (
        await db.query(
          "DELETE FROM oauth_requests WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>$3 RETURNING *",
          [stateHash, browserHash, Date.now()],
        )
      ).rows[0];
    },
    async resolveIdentity(identity, linkUserId) {
      const client = await db.connect();
      let user;
      try {
        await client.query("BEGIN");
        // Lock identity creation to handle repeated callbacks and concurrent sign-ins.
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          `google:${identity.subject}`,
        ]);
        user = (
          await client.query("SELECT * FROM users WHERE google_subject=$1", [
            identity.subject,
          ])
        ).rows[0];
        if (linkUserId) {
          if (user && user.id !== linkUserId) throw new Error("already_linked");
          const owner = (
            await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [
              linkUserId,
            ])
          ).rows[0];
          if (
            !owner ||
            owner.email !== identity.email ||
            (owner.google_subject && owner.google_subject !== identity.subject)
          )
            throw new Error("link_mismatch");
          await client.query("UPDATE users SET google_subject=$1 WHERE id=$2", [
            identity.subject,
            owner.id,
          ]);
          user = owner;
        } else if (!user) {
          if (
            (
              await client.query("SELECT id FROM users WHERE email=$1", [
                identity.email,
              ])
            ).rowCount
          )
            throw new Error("existing_account");
          user = {
            id: randomUUID(),
            name: identity.name,
            email: identity.email,
          };
          await client.query(
            "INSERT INTO users(id,name,email,google_subject,created_at) VALUES($1,$2,$3,$4,$5)",
            [user.id, user.name, user.email, identity.subject, Date.now()],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return user;
    },
  };
}
