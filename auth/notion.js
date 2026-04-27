// This file creates and exports the Notion API client.
// You don't need to edit this file — just know that when other files do:
//
//   const notion = require('../auth/notion');
//
// ...they get back this client object, which has methods for talking to Notion.
// It's the same idea as how you required express in your To-Do API:
//
//   const express = require('express');
//   const app = express();
//
// Here we're doing the same thing but for the Notion SDK instead of Express.

const { Client } = require('@notionhq/client');

// The Client constructor takes an auth token from your .env file.
// process.env.NOTION_TOKEN reads the NOTION_TOKEN variable that dotenv loaded.
// This is how the SDK knows which Notion workspace to connect to.
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Export the client directly (not wrapped in an object) so other files can use it.
// This is a named export — compare to how you exported route handlers in your To-Do API.
module.exports = notion;
