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

/** A Change object maps to the LDAP protocol of a modify change, and requires you to set the operation and modification. The operation is a string, and must be one of:
 * - replace: Replaces the attribute referenced in modification. If the modification has no values, it is equivalent to a delete.
 * - add: Adds the attribute value(s) referenced in modification. The attribute may or may not already exist.
 * - delete: Deletes the attribute (and all values) referenced in modification.

modification is just a plain old JS object with the values you want. */
export interface ModifyChange<T = any> {
  operation: "add" | "delete" | "replace";
  modification: {
    [key in keyof Partial<T>]: any;
  };
}
interface ModifyFnInput {
  dn: string;
  changes: ModifyChange[];
  controls?: any;
}
interface QueryFnInput {
  options?: SearchOptions;
  controls?: Control | Control[];
  base?: string;
}

interface AddEntry<T> {
  [key: string]: string | string[];
}
interface AddFnInput<T = any> {
  entry: AddEntry<T>;
  dn: string;
  controls?: any;
}
interface CompareFnInput<T = any> {
  dn: string;
  controls?: any;
  attribute: keyof Partial<T>;
  value: string;
}
interface DelFnInput {
  dn: string;
  controls?: any;
}
interface ExtendedOpFnInput {
  oid: string;
  value: string;
  controls?: any;
}
interface ModifyDnFnInput {
  dn: string;
  newDn: string;
  controls?: any;
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
  }

  /** connection status */
  public isConnected = (): boolean => {
    return this.client.connected;
  };

  /** @return a connected ldap client that is useful for use flexibility of [ldap.js](http://ldapjs.org/) directly. */
  public async bind(): Promise<ldap.Client> {
    this.logger?.trace("bind()");
    return new Promise((resolve, reject) => {
      this.client.bind(this.config.bindDN, this.config.secret, (err) => {
        if (err) {
          reject(err);
        }

        resolve(this.client);
      });
    });
  }

  /** unbind connection and free-up memory */
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

    const data = await search({
      client: this.client,
      base: base ?? this.config.baseDN,
      options,
      controls,
    });
    return data;
  }

  /** @description raw search returns just attributes
   *
   * // TODO: add Generic type for return data
   */
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
  /** Performs an add operation against the LDAP server.
   * @description Allows you to add an entry (which is just a plain JS object)
   */
  public async add({ entry, dn, controls }: AddFnInput): Promise<boolean> {
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

  /** Performs an LDAP compare operation with the given attribute and value against the entry referenced by dn. */
  public async compare({
    dn,
    controls,
    attribute,
    value,
  }: CompareFnInput): Promise<boolean | undefined> {
    this.logger?.trace("compare()");
    await this.connect();
    return new Promise((resolve, reject) => {
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
   * @description Performs an LDAP extended operation against an LDAP server.
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
   * @description Performs an LDAP modifyDN (rename) operation against an entry in the LDAP server. A couple points with this client API:
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

  /** Performs an LDAP modify operation against the existing LDAP entity. This API requires you to pass in a Change object.
   */
  public async modify({
    dn,
    changes,
    controls,
  }: ModifyFnInput): Promise<boolean> {
    this.logger?.trace("modify()");
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
