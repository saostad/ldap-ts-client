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
  const data = await client.queryAttributes({
    options: {
      attributes: ["*"],
      filter: "(&(userPrincipalName=sostad*))",
      scope: "sub",
    },
  });
  console.log(`File: app.ts,`, `Line: 17 => `, data[0]);
  await client.unbind();
})();
