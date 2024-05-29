/**
 * Script to replace one user in Atlas with another, setting the manager hierarchy and job title from the old user.
 * Useful if a profile-only user has been invited as a real user.
 */
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const oldID = process.env.OLD_ID!;
  const newID = process.env.NEW_ID!;
  const department = process.env.DEPARTMENT!;

  type Resource = {
    id: string,
    displayName: string,
    title: string,
    'urn:scim:schemas:extension:enterprise:1.0': {
      department: string,
      manager: {
        managerId: string
      },
      // We don't get this from Slack, we'll fill it in.
      // directReports: string[]
    }
  }
  type UserData = {
    totalResults: number,
    itemsPerPage: number,
    startIndex: number,
    Resources: Resource[]
  };

  const id2Resource= new Map<string, Resource>();

  process.stdout.write(`Getting existing Slack users...`);

  const config = {
    headers: { Authorization: `Bearer ${process.env.USER_TOKEN}` }
  };
  const count = 1000;
  let startIndex = 1;
  let totalResults = 0;
  while(true) {
    const {data} = await axios.get<UserData>(`https://api.slack.com/scim/v1/Users/?count=${count}&startIndex=${startIndex}`, config)
    totalResults = data.totalResults;
    startIndex += data.itemsPerPage;

    for(const resource of data.Resources) {
      id2Resource.set(resource.id, resource);
    }

    if(startIndex >= totalResults) {
      break;
    }
  }

  if(id2Resource.size != totalResults) {
    throw new Error("Failed to get all users");
  }

  const resources = Array.from(id2Resource.values());
  const directReports = resources.filter((resource) => {
    return (resource["urn:scim:schemas:extension:enterprise:1.0"]?.manager?.managerId === oldID);
  });
  process.stdout.write(`Done.\n`);

  process.stdout.write(`Setting manager on direct reports to ${newID}...`);
  for(const directReport of directReports) {
    const data = {
      'urn:scim:schemas:extension:enterprise:1.0': {
        manager: {
          managerId: newID
        }
      }
    };
    const result = axios.patch(`https://api.slack.com/scim/v1/Users/${directReport.id}`, data, config);
  }
  process.stdout.write(`Done.\n`);

  const newManagerId = id2Resource.get(oldID)?.["urn:scim:schemas:extension:enterprise:1.0"].manager.managerId;
  if(newManagerId) {
    process.stdout.write(`Setting manager of ${newID} to ${newManagerId}...`);
    const data = {
      'urn:scim:schemas:extension:enterprise:1.0': {
        manager: {
          managerId: newManagerId
        }
      }
    };
    axios.patch(`https://api.slack.com/scim/v1/Users/${newID}`, data, config);
    process.stdout.write(`Done.\n`);
  }

  const title = id2Resource.get(oldID)?.title;
  if(title) {
    process.stdout.write(`Setting title of ${newID} to ${title}...`);
    const data = {
      title
    };
    axios.patch(`https://api.slack.com/scim/v1/Users/${newID}`, data, config);
    process.stdout.write(`Done.\n`);
  }

  process.stdout.write(`Setting department of ${newID} to ${department}...`);
  const data = {
    'urn:scim:schemas:extension:enterprise:1.0': {
      department
    }
  };
  axios.patch(`https://api.slack.com/scim/v1/Users/${newID}`, data, config);
  process.stdout.write(`Done.\n`);
}

main();