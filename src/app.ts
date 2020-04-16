import { config } from "dotenv";
config();
import { Client, IClientConfig } from "./index";

(async () => {
  const options: IClientConfig = {
    url: process.env.AD_URI ?? "",
    bindDN: process.env.AD_USER ?? "",
    secret: process.env.AD_Pass ?? "",
    baseDN: "DC=ki,DC=local",
  };
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
  // const addResult = await client.add({
  //   entry,
  //   dn: "CN=testUser2,OU=Users,OU=KII,DC=ki,DC=local",
  // });
  // console.log(addResult);

  // const modifyResult = await client.modify({
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
  // console.log(`File: app.ts,`, `Line: 53 => `, modifyResult);

  // const compared = await client.compare({
  //   dn: "CN=testUser2,OU=Users,OU=KII,DC=ki,DC=local",
  //   attribute: "cn",
  //   value: "testUser2",
  // });
  // console.log(`File: app.ts,`, `Line: 22 => `, compared);

  const data = await client.queryAttributes({
    options: {
      attributes: ["*"],
      filter: "(&(objectClass=organizationalPerson)(cn=test*))",
      scope: "sub",
    },
  });
  console.log(`File: app.ts,`, `Line: 17 => `, data[0]);

  await client.unbind();
})();
