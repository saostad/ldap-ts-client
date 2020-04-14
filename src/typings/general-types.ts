import { Client } from "ldapjs";

export interface SearchResultAttribute {
  type: string;
  vals: string[];
}

export interface FN {
  client: Client;
  base: string;
}
