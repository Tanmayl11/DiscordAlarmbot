
# Discord Alarm Bot

A Discord bot for scheduling both one-time and repeating messages with easy-to-manage alarms and notifications.

## Features

- **Schedule one-time** or **recurring messages**
- **List** and **cancel** alarms for individual users or the entire server
- **Role-based access** for specific commands (Admin/Leader)

## Setup

1. Clone the repository.
2. Install dependencies: `npm install`
3. Create a `.env` file with:
   ```plaintext
   DISCORD_BOT_TOKEN=your_bot_token
   CLIENT_ID=your_bot_app_id
   GUILD_ID=your_server_id
   OWNER_ID=your_user_id
   PORT=8000
   ```
4. Deploy commands: `node deploy-commands.js`
5. Start the bot: `npm start`

## Commands

- `/schedule`: Schedule a one-time message
- `/repeat`: Schedule a recurring message
- `/list-my-alarms`: List alarms created by you
- `/cancel`: Cancel a specific alarm
- `/list-all-alarms`: List all active alarms (Admin/Leader only)
- `/cancel-all-alarms`: Cancel all alarms in the server (Admin/Leader only)

## Contributing

Feel free to submit issues or pull requests.
