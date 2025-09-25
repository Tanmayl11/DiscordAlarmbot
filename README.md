
# Discord Alarm Bot

A Discord bot for scheduling one-time and recurring messages with easy-to-manage alarms and notifications. Supports timezone-aware scheduling and role-based access for server management.

## Features

* **Schedule one-time messages** using `/schedule`
* **Schedule recurring messages** on specific days of the week with `/repeat`
* **List alarms** created by you (`/list-my-alarms`) or all server alarms (`/list-all-alarms`, `/list-all-alarms-with-id`)
* **Cancel alarms** individually (`/cancel`) or all server alarms (`/cancel-all-alarms`)
* **Role-based access** for server-wide commands (requires `Manage Server` permission)
* **Monday-first day indexing** (Monday=0, Sunday=6) for consistent scheduling
* **Timezone support** using IANA timezones (e.g., `Asia/Calcutta`)

## Prerequisites

* **Node.js** : Version 14 or higher (LTS recommended, e.g., v18). Install from [nodejs.org](https://nodejs.org/) or use `nvm install 18`.
* **npm** : Included with Node.js for package management.
* **Discord Bot Token** : Create a bot on the [Discord Developer Portal](https://discord.com/developers/applications) with `bot` scope and `Send Messages`, `Embed Links`, and `Manage Server` permissions.
* **Server Access** : A Discord server where you have permission to add the bot.

## Setup

1. **Clone the Repository** :

```bash
   git clone <repository-url>
   cd discord-alarm-bot
```

1. **Install Dependencies** :
   Install the required Node.js packages:

```bash
   npm install discord.js@14.22.1 luxon@3.7.2 node-cron@2.4.0
```

* `discord.js`: For interacting with the Discord API.
* `luxon`: For timezone-aware date and time handling.
* `node-cron`: For scheduling recurring tasks.

1. **Configure Environment Variables** :
   Create a `.env` file in the project root with the following:

```plaintext
   DISCORD_BOT_TOKEN=your_bot_token
   CLIENT_ID=your_bot_application_id
   GUILD_ID=your_server_id
   OWNER_ID=your_user_id
   PORT=8000
```

* Replace `your_bot_token` with the token from the Discord Developer Portal.
* Replace `your_bot_application_id` with the bot's application ID.
* Replace `your_server_id` with your Discord server's ID (enable Developer Mode in Discord to copy).
* Replace `your_user_id` with your Discord user ID (for owner-specific commands, optional).
* `PORT` is for local hosting (optional, defaults to 8000).

1. **Deploy Commands** :
   Register the bot's slash commands with Discord:

```bash
   node deploy-commands.js
```

   Ensure `deploy-commands.js` is configured with your `CLIENT_ID` and `GUILD_ID`.

1. **Start the Bot** :
   Run the bot using:

```bash
   npm start
```

   Assumes `package.json` has a `"start": "node index.js"` script. If not, run `node index.js` directly.

1. **Invite the Bot** :

* Go to the Discord Developer Portal, select your bot, and generate an OAuth2 URL with `bot` scope and the required permissions (`Send Messages`, `Embed Links`, `Manage Server`).
* Open the URL in a browser and add the bot to your server.

## Commands

* **/schedule**
  * Description: Schedule a one-time message at a specific time and timezone.
  * Options:
    * `time`: Time in `HH:MM` format (e.g., `14:30`).
    * `timezone`: IANA timezone (e.g., `Asia/Calcutta`).
    * `message`: The message to send.
  * Example: `/schedule time:14:30 timezone:Asia/Calcutta message:Meeting reminder!`
* **/repeat**
  * Description: Schedule a recurring message on a specific day of the week.
  * Options:
    * `day`: Day of the week (Monday–Sunday).
    * `time`: Time in `HH:MM` format.
    * `timezone`: IANA timezone.
    * `message`: The message to send.
  * Example: `/repeat day:Sunday time:23:59 timezone:Asia/Calcutta message:Weekly update`
* **/list-my-alarms**
  * Description: List all alarms created by you, including IDs for cancellation.
  * Output: Embeds with alarm ID, schedule, timezone, and message.
  * Example: `/list-my-alarms`
* **/list-all-alarms**
  * Description: List all active alarms in the server.
  * Output: Embeds with schedule, timezone, and message (no IDs).
  * Example: `/list-all-alarms`
* **/list-all-alarms-with-id**
  * Description: List all active alarms in the server with IDs (requires `Manage Server` permission).
  * Output: Embeds with alarm ID, schedule, timezone, and message.
  * Example: `/list-all-alarms-with-id`
* **/cancel**
  * Description: Cancel a specific alarm by ID.
  * Options:
    * `id`: The alarm ID (from `/list-my-alarms` or `/list-all-alarms-with-id`).
  * Example: `/cancel id:1420360514869006409`
* **/cancel-all-alarms**
  * Description: Cancel all alarms in the server (requires `Administrator` privileges).
  * Example: `/cancel-all-alarms`

## Notes

* **Timezone Support** : Uses `luxon` for accurate timezone handling. Ensure valid IANA timezones (e.g., `America/New_York`, `Europe/London`).
* **Day Indexing** : Uses Monday-first indexing (Monday=0, Sunday=6) for consistency.
* **Persistence** : Alarms are stored in-memory. For production, consider adding a database (e.g., SQLite) to persist alarms across restarts.
* **Logging** : Critical errors are logged to the console. Debug logs have been removed for production.

## Troubleshooting

* **Bot Not Responding** : Verify `DISCORD_BOT_TOKEN`, `CLIENT_ID`, and `GUILD_ID` in `.env`. Ensure the bot is invited with correct permissions.
* **Invalid Timezone** : Use valid IANA timezones. Check available timezones with `/schedule` or `/repeat` autocomplete.
* **Alarms Not Firing** : Confirm `node-cron` is scheduling correctly. Check console for errors (e.g., `Error sending scheduled message`).
* **SonarLint Warnings** : The codebase complies with SonarLint `S3800` (type consistency for `mapToCronDay`).

## Contributing

* Submit issues or pull requests to the [repository](https://grok.com/c/repository-url).
* Ensure code follows Monday-first indexing and includes tests for new features.
* Run `npm install` and `node deploy-commands.js` after adding new commands.
