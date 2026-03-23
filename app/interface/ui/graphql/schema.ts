// schema.ts
export const typeDefs = `
  type Pasien { id: ID!, nama: String!, umur: Int }
  type Query { pasien: [Pasien] }
`;
