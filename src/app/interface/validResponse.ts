export interface ValidResponse {
  valid: boolean;
  userId: number | undefined;
  companyId: string | undefined; // ou o tipo correto para companieId
}
