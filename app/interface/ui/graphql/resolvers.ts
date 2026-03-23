// resolvers.ts
import { PasienRepo } from "@/modules/pasien";

export const resolvers = {
  Query: {
    pasien: () => PasienRepo,
  },
};
