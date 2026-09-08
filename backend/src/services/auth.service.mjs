import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "./password.service.mjs";
import { httpError } from "../utils/http-error.mjs";
export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
export async function createAuthService(userModel) {
  const dummyHash = await hashPassword(randomUUID());
  return {
    async register({ name, email, password }) {
      const user = { id: randomUUID(), name, email };
      const hash = await hashPassword(password);
      try {
        await userModel.createUser(user, hash);
      } catch (error) {
        if (error.code === "23505")
          throw httpError(
            409,
            "Impossible de créer ce compte. Essayez de vous connecter avec cette adresse.",
          );
        throw error;
      }
      return user;
    },
    async login({ email, password }) {
      const user = await userModel.findUser(email);
      const valid = await verifyPassword(
        password,
        user?.password_hash || dummyHash,
      );
      if (!user || !valid)
        throw httpError(401, "Adresse e-mail ou mot de passe incorrect.");
      return publicUser(user);
    },
  };
}
