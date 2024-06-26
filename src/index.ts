import ldap, { SearchOptions, Control, SearchEntryObject } from "ldapjs";
import type { Logger } from "fast-node-logger";
import { search } from "./services/search";

export type { SearchEntryObject } from "ldapjs";

export interface IClientConfig
  extends Omit<ldap.ClientOptions, "url" | "bindDN"> {
  /** Domain name with format: ldap://{domain.com} */
  ldapServerUrl: string;
  /** Password to connect to AD */
  pass?: string;
  /** User to connect to AD */
  user?: string;
  /** instance of pino logger */
  logger?: Logger;
}

/** A Change object maps to the LDAP protocol of a modify change, and requires you to set the operation and modification. The operation is a string, and must be one of:
 * - replace: Replaces the attribute referenced in modification. If the modification has no values, it is equivalent to a delete.
 * - add: Adds the attribute value(s) referenced in modification. The attribute may or may not already exist.
 * - delete: Deletes the attribute (and all values) referenced in modification.

modification is just a plain old JS object with the values you want. */
export type ModifyChange<T = any> = {
  operation: "add" | "delete" | "replace";
  modification: {
    [key in keyof Partial<T>]: any;
  };
};
type ModifyAttributeFnInput<T> = {
  dn: string;
  changes: ModifyChange<T>[];
  controls?: any;
};
type QueryFnInput<T> = {
  options?: Omit<SearchOptions, "attributes">;
  /** select return attributes
   * - ["*"] for all available fields
   */
  attributes?: Array<keyof Partial<T> | "*">;
  controls?: Control | Control[];
  /** base dn to search */
  base: string;
};
type AddFnInput<T> = {
  entry: {
    [key in keyof Partial<T>]: string | string[];
  };
  dn: string;
  controls?: any;
};
type CompareFnInput<T = any> = {
  dn: string;
  controls?: any;
  /** attribute to compare
   * - Note: it just use first property, no matter how many property gets
   */
  field: {
    [key in keyof Partial<T>]: string;
  };
};
type DelFnInput = {
  dn: string;
  controls?: any;
};
type ExtendedOpFnInput = {
  oid: string;
  value: string;
  controls?: any;
};
type ModifyDnFnInput = {
  dn: string;
  newDn: string;
  controls?: any;
};
type BindFnInput = {
  user?: string;
  pass?: string;
};

/** @description this is a class to provide low level promise base interaction with ldap server */
export class Client {
  private config: IClientConfig;
  private client!: ldap.Client;
  private logger?: Logger;

  constructor(config: IClientConfig) {
    this.config = config;

    let reconnect: any = true;
    if (typeof config.reconnect !== "undefined") {
      reconnect = config.reconnect;
    }

    this.client = ldap.createClient({
      ...this.config,
      reconnect,
      url: this.config.ldapServerUrl,
      log: this.config.logger,
    });
  }

  /** connection status */
  public getConnectionStatus = (): boolean => {
    return this.client.connected;
  };

  /** @return a connected ldap client that is useful for use flexibility of [ldap.js](http://ldapjs.org/) directly. */
  public async bind(input?: BindFnInput): Promise<ldap.Client> {
    this.logger?.trace("bind()");
    return new Promise((resolve, reject) => {
      if (this.client) {
        this.client.destroy((err: any) => {
          reject(err);
        });
      }

      this.client = ldap.createClient({
        ...this.config,
        url: this.config.ldapServerUrl,
        log: this.config.logger,
      });

      this.client.on("connectError", (err) => {
        reject(err);
      });
      this.client.on("connectTimeout", (err) => {
        reject(err);
      });
      this.client.on("connectRefused", (err) => {
        reject(err);
      });
      this.client.on("error", (err) => {
        reject(err);
      });

      const user = input?.user ?? this.config.user;
      const pass = input?.pass ?? this.config.pass;
      if (user && pass) {
        this.client.bind(user, pass, (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(this.client);
        });
      } else {
        reject(
          new Error(
            `user or pass not provided! you can provide in either bind function or when create new instance of client.`,
          ),
        );
      }
    });
  }

  /** unbind connection */
  public async unbind(): Promise<void> {
    this.logger?.trace("unbind()");
    return new Promise((resolve, reject) => {
      this.client.unbind((err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  /** unbind the connection and don't allow it to connect again. */
  public async destroy(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.destroy((err: any) => {
        reject(err);
      });
      resolve();
    });
  }

  /** bind to server if client is not already bound */
  private async connect() {
    this.logger?.trace("connect()");
    if (this.client?.connected) {
      return this.client;
    }
    const client = await this.bind();
    return client;
  }

  /** @description raw search to provided full flexibility */
  public async query<T = any>({
    options,
    controls,
    base,
    attributes,
  }: QueryFnInput<T>) {
    this.logger?.trace("query()");
    await this.connect();

    const data = await search({
      client: this.client,
      base,
      options: {
        ...options,
        attributes: attributes as string[],
      },
      controls,
    });
    return data;
  }

  /** @description raw search returns just attributes
   *
   * // TODO: add Generic type for return data
   */
  public async queryAttributes<T = any>({
    options,
    attributes,
    controls,
    base,
  }: QueryFnInput<T>): Promise<SearchEntryObject[]> {
    this.logger?.trace("queryAttributes()");
    await this.connect();

    const data = await search({
      client: this.client,
      base,
      options: {
        ...options,
        attributes: attributes as string[],
      },
      controls,
    });
    return data.map((entry) => entry.object);
  }
  /** Performs an add operation against the LDAP server.
   * @description Allows you to add an entry (which is just a plain JS object)
   */
  public async add<T = any>({
    entry,
    dn,
    controls,
  }: AddFnInput<T>): Promise<boolean> {
    this.logger?.trace("add()");
    await this.connect();
    return new Promise((resolve, reject) => {
      if (controls) {
        this.client.add(dn, entry, controls, function addCallback(err) {
          if (err) {
            reject(err);
          }
          resolve(true);
        });
      } else {
        this.client.add(dn, entry, function addCallback(err) {
          if (err) {
            reject(err);
          }
          resolve(true);
        });
      }
    });
  }

  /** Performs a LDAP compare operation with the given attribute and value against the entry referenced by dn. */
  public async compare<T = any>({
    dn,
    controls,
    field,
  }: CompareFnInput<T>): Promise<boolean | undefined> {
    this.logger?.trace("compare()");
    await this.connect();
    return new Promise((resolve, reject) => {
      const [attribute, value] = Object.entries<string>(field)[0];
      if (controls) {
        this.client.compare(
          dn,
          attribute,
          value,
          controls,
          function compareCallback(err, matched) {
            if (err) {
              reject(err);
            }
            resolve(matched);
          },
        );
      } else {
        this.client.compare(dn, attribute, value, function compareCallback(
          err,
          matched,
        ) {
          if (err) {
            reject(err);
          }
          resolve(matched);
        });
      }
    });
  }

  /** Deletes an entry from the LDAP server. */
  public async del({ dn, controls }: DelFnInput): Promise<boolean> {
    this.logger?.trace("del()");
    await this.connect();
    return new Promise((resolve, reject) => {
      if (controls) {
        this.client.del(dn, controls, function delCallback(err) {
          if (err) {
            reject(err);
          }
          resolve(true);
        });
      } else {
        this.client.del(dn, function delCallback(err) {
          if (err) {
            reject(err);
          }
          resolve(true);
        });
      }
    });
  }

  /**
   * @description Performs an extended operation against LDAP server.
   * @example
   * const {value} = await client.extendedOp('1.3.6.1.4.1.4203.1.11.3');
   * console.log('whois: ' + value);
   */
  public async extendedOp({
    oid,
    value,
    controls,
  }: ExtendedOpFnInput): Promise<{ value: string; res: any }> {
    this.logger?.trace("extendedOp()");
    await this.connect();
    return new Promise((resolve, reject) => {
      if (controls) {
        this.client.exop(oid, value, controls, function extendedOpCallback(
          err,
          value,
          res,
        ) {
          if (err) {
            reject(err);
          }
          resolve({ value, res });
        });
      } else {
        this.client.exop(oid, value, function extendedOpCallback(
          err,
          value,
          res,
        ) {
          if (err) {
            reject(err);
          }
          resolve({ value, res });
        });
      }
    });
  }

  /**
   * @description Performs a LDAP modifyDN (rename) operation against an entry in the LDAP server. A couple points with this client API:
   * - There is no ability to set "keep old dn." It's always going to flag the old dn to be purged.
   * - The client code will automatically figure out if the request is a "new superior" request ("new superior" means move to a different part of the tree, as opposed to just renaming the leaf).
   */
  public async modifyDn({
    dn,
    newDn,
    controls,
  }: ModifyDnFnInput): Promise<boolean> {
    this.logger?.trace("modifyDn()");
    await this.connect();
    return new Promise((resolve, reject) => {
      if (controls) {
        this.client.modifyDN(dn, newDn, controls, function modifyDnCallback(
          err,
        ) {
          if (err) {
            reject(err);
          }
          resolve(true);
        });
      } else {
        this.client.modifyDN(dn, newDn, function modifyDNCallback(err) {
          if (err) {
            reject(err);
          }
          resolve(true);
        });
      }
    });
  }

  /** Performs a LDAP modify operation against attributes of the existing LDAP entity. This API requires you to pass in a Change object.
   */
  public async modifyAttribute<T = any>({
    dn,
    changes,
    controls,
  }: ModifyAttributeFnInput<T>): Promise<boolean> {
    this.logger?.trace("modifyAttribute()");
    await this.connect();
    return new Promise((resolve, reject) => {
      if (controls) {
        this.client.modify(dn, changes, controls, function modifyCallBack(
          error,
        ) {
          if (error) {
            reject(error);
          }
          resolve(true);
        });
      } else {
        this.client.modify(dn, changes, function modifyCallBack(error) {
          if (error) {
            reject(error);
          }
          resolve(true);
        });
      }
    });
  }
}
