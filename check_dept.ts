import {WebClient, LogLevel, UsersProfileSetArguments} from "@slack/web-api";
import dotenv from "dotenv";
import util from 'util';
dotenv.config();

async function createClient(token: string) {
  return new WebClient(token, {
    logLevel: LogLevel.INFO
  });
}

async function main() {
  const userClient = await createClient(process.env.USER_TOKEN!);

  const result = await userClient.users.list({});
  if(!result.members) {
    console.log("Can't get members from workspace");
    return;
  }

  console.log(`No department set for users:`);
  for(const member of result.members) {
    if(member.deleted) {
      continue;
    }
    if(member.is_bot) {
      continue;
    }
    const profile = await userClient.users.profile.get({user: member.id});
    const fields = profile.profile?.fields;
    if(fields) {
      const department = fields["Xf04NH65JWJC"];
      if(!department) {
        console.log(`${member.name}`);
      }
    }
  }
  process.stdout.write(`Done.\n`);
}

main();