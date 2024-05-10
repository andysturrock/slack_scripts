import {WebClient, LogLevel, UsersProfileSetArguments} from "@slack/web-api";
import fs from 'node:fs/promises';
import dotenv from "dotenv";
dotenv.config();

const department = process.env.DEPARTMENT

async function createClient(token: string) {

  return new WebClient(token, {
    logLevel: LogLevel.INFO
  });
}

async function main() {
  const commercial = await fs.readFile(`./${department}.csv`, "utf8");
  const rows = commercial.split("\n");
  const users = [];
  for(let row of rows) {
    row = row.replace("\r", "");
    if(row.match(/^\/\//)) {
      continue;
    }
    if(row == "") {
      break;
    }
    const fields = row.split(",");
    users.push({
      firstName: fields[0],
      lastName: fields[1],
      email: fields[2]
    });
  }

  const botClient = await createClient(process.env.BOT_TOKEN!);
  const userClient = await createClient(process.env.USER_TOKEN!);

  for(const user of users) {
    process.stdout.write(`Searching slack for ${user.email}...`);
    const slackUser = await botClient.users.lookupByEmail({email: user.email});
    const id = slackUser.user?.id;
    process.stdout.write(` Found ${id}, setting department...`);
    const usersProfileSetArguments: UsersProfileSetArguments = {
      user: id,
      profile:{
        "fields": {
          "Xf04NH65JWJC": { // Don't know if this is always this value in every Slack.
            "value": department,
            "alt": ""
          }
        }
      }
    };
    const response = await userClient.users.profile.set(usersProfileSetArguments);
    process.stdout.write(` Done.\n`);
  }
}

main();