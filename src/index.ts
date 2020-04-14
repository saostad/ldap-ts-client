import ldap, { SearchOptions, Control, SearchEntryObject } from "ldapjs";
import type { Logger } from "pino";
import { search } from "./services/search";

export interface IClientConfig extends ldap.ClientOptions {
  /**Password to connect to AD */
  secret: string;
  /**User to connect to AD */
  bindDN: string;
  /**Root of tree for search */
  baseDN: string;
  /** Domain name with format: ldap://{domain.com} */
  url: string;
  /**instance of pino logger */
  logger?: Logger;
}

interface QueryFnInput {
  options?: SearchOptions;
  controls?: Control | Control[];
  base?: string;
}

/** @description this is a class to provide low level promise base interaction with ldap server */
export class Client {
  private config: IClientConfig;
  private client!: ldap.Client;
  private logger?: Logger;
  public baseDN: string;

  constructor(config: IClientConfig) {
    this.config = config;
    this.baseDN = config.baseDN;
    this.client = ldap.createClient({
      ...this.config,
      log: this.config.logger,
    });
    this.bind();
  }

  public isConnected = (): boolean => {
    return this.client.connected;
  };

  /** @return a connected ldap client that is useful for use flexibility of [ldap.js](http://ldapjs.org/) directly. */
  public bind = async (): Promise<ldap.Client> => {
    this.logger?.trace("bind()");
    return new Promise((resolve, reject) => {
      this.client.bind(this.config.bindDN, this.config.secret, (err) => {
        if (err) {
          reject(err);
        }

        resolve(this.client);
      });
    });
  };

  public unbind = () => {
    this.logger?.trace("unbind()");
    this.client.unbind();
  };

  private async connect() {
    this.logger?.trace("connect()");
    if (this.client && this.client.connected) {
      return this.client;
    }
    const client = await this.bind();
    return client;
  }

  /** @description raw search to provided full flexibility */
  public async query({ options, controls, base }: QueryFnInput) {
    this.logger?.trace("query()");
    await this.connect();

    return search({
      client: this.client,
      base: base ?? this.config.baseDN,
      options,
      controls,
    });
  }

  /** @description raw search returns just attributes */
  public async queryAttributes({
    options,
    controls,
    base,
  }: QueryFnInput): Promise<SearchEntryObject[]> {
    this.logger?.trace("queryAttributes()");
    await this.connect();

    const data = await search({
      client: this.client,
      base: base ?? this.config.baseDN,
      options,
      controls,
    });

    return data.map((entry) => entry.object);
  }
}
