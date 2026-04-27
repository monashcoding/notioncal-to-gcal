const { Client } = require('@notionhq/client');

// Create the Notion API client using the integration token from .env
// The token is obtained at https://www.notion.so/my-integrations
const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = notion;
