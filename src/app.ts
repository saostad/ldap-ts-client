import { config } from "dotenv";
config();
import { Client, IClientConfig } from "./index";
import { User } from "./generated/interfaces/User";

(async () => {
  const options: IClientConfig = {
    ldapServerUrl: process.env.AD_URI ?? "",
    user: process.env.AD_USER ?? "",
    pass: process.env.AD_Pass ?? "",
    baseDN: "DC=ki,DC=local",
    queueDisable: false,
  };
  const client1 = new Client(options);
  const data1 = await client1.queryAttributes<User>({
    attributes: ["cn"],
    options: {
      filter: "(&(objectClass=user)(cn=*))",
      scope: "sub",
      paged: true,
    },
  });
  console.log(`File: app.ts,`, `Line: 17 => `, data1.length);
  client1.unbind();

  const client2 = new Client(options);
  const data2 = await client2.queryAttributes<User>({
    attributes: ["cn"],
    options: {
      filter: "(&(objectClass=user)(cn=*))",
      scope: "sub",
      paged: true,
    },
  });
  console.log(`File: app.ts,`, `Line: 17 => `, data2.length);
  client2.unbind();

  const client = new Client(options);

  // const delResult = await client.del({
  //   dn: "CN=testUser2,OU=Users,OU=KII,DC=ki,DC=local",
  // });
  // console.log(`File: app.ts,`, `Line: 18 => `, delResult);

  // const { value } = await client.extendedOp({
  //   oid: "1.3.6.1.4.1.4203.1.11.3",
  //   value: "",
  // });
  // console.log(`File: app.ts,`, `Line: 18 => `, value);

  // const modifyDnResult = await client.modifyDn({
  //   dn: "CN=testUser3,OU=Users,OU=KII,DC=ki,DC=local",
  //   newDn: "CN=testUser4,OU=Users,OU=KII,DC=ki,DC=local",
  // });
  // console.log(`File: app.ts,`, `Line: 18 => `, modifyDnResult);

  // const entry = {
  //   cn: "testUser2",
  //   sn: "testUser2",
  //   objectClass: "organizationalPerson",
  // };
  // const addResult = await client.add<User>({
  //   entry,
  //   dn: "CN=testUser2,OU=Users,OU=KII,DC=ki,DC=local",
  // });
  // console.log(addResult);

  // const modifyAttributeResult = await client.modifyAttribute<User>({
  //   dn: "CN=testUser2,OU=Users,OU=KII,DC=ki,DC=local",
  //   changes: [
  //     {
  //       operation: "add",
  //       modification: {
  //         mail: "mymail@mydomain.com",
  //       },
  //     },
  //   ],
  // });
  // console.log(`File: app.ts,`, `Line: 53 => `, modifyAttributeResult);

  // const compared = await client.compare<User>({
  //   dn: "CN=testUser2,OU=Users,OU=KII,DC=ki,DC=local",
  //   field: {
  //     cn: "testUser2",
  //   },
  // });
  // console.log(`File: app.ts,`, `Line: 22 => `, compared);

  const data = await client.queryAttributes<User>({
    attributes: ["cn"],
    options: {
      filter: "(&(objectClass=user)(cn=*))",
      scope: "sub",
      paged: true,
    },
  });
  console.log(`File: app.ts,`, `Line: 17 => `, data.length);

  await client.unbind();
})();
