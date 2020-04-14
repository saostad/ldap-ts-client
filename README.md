# Active directory connection

LDAP Client to do low level promise base interaction with ldap server

- Promise based functions
- type-safe with [Typescript](https://www.typescriptlang.org/)

## How to use it:

- `npm i ldap-ts-client`

```ts
import { IClientConfig, LdapClient } from "ldap-ts-client";

const config: IClientConfig = {
  url: "ldap://Domain.com" /** Domain name here */,
  bindDN: "{USER_NAME}" /** user name to connect to AD server */,
  secret: "{PASSWORD}" /** password for account */,
  baseDN: "{ROOT_OF_TREE}" /** root of tree that want to query */,
};

const client = new LdapClient(config);

// do something with functionalities

// always free-Up after you done the job!
client.unbind();
```

## API DOC

for full API documentation look at [API Website](https://saostad.github.io/ldap-ts-client/classes/_index_.client.html)

## functionalities:

#### async queryAttributes()

```ts
/** get displayName of all users */
const users = await client.queryAttributes({
  options: {
    filter:
      "(&(|(objectClass=user)(objectClass=person))(!(objectClass=computer))(!(objectClass=group)))",
    attributes: ["displayName"],
    scope: "sub",
    paged: true,
  },
});

// always unbind after finish the operation to prevent memory leak
client.unbind();
```

### Advance Uses:

#### async query() (raw search to provided full flexibility)

```ts
/** get displayName and distinguished name  of empty groups */
const groups = await client.query({
  options: {
    filter: "(&(objectClass=group)(!(member=*)))",
    attributes: ["displayName", "dn"],
    scope: "sub",
    paged: true,
  },
});

// always unbind after finish the operation to prevent memory leak
client.unbind();
```

#### async bind() to access underlying api. returns a connected [ldap.js](http://ldapjs.org/) client.

#### NOTICE: lpad.js is using node EventEmitters not ES6 Promises

```ts
client.bind().then((client) => {
  client.search(this.config.baseDN, opts, (err, res) => {
    if (err) {
      reject(err);
    }
    res.on("searchEntry", (entry) => {});
    res.on("error", (err) => {});
    res.on("end", function (result) {
      client.unbind();
    });
  });
});
```

## TODO

- [ ] remove dependency to [ldap.js](http://ldapjs.org/) package
- [ ] add Windows Integrated Authentication [Kerberos](https://github.com/mongodb-js/kerberos)
