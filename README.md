# **Discord**Scheduler**Bot**

**This**Discord bot allows users to schedule one**-**time and repeating messages **in** their server**.**

## **Features**

**-**Schedule one**-**time messages
**-**Schedule repeating messages on specific days **of** the week
**-**List all active alarms **for** a server
**-**Cancel scheduled messages
**-**Admin and **Leader** role permissions **for** certain commands

## **Setup**

**1.**Clone**this** repository
**2.**Install dependencies**:**`**npm install**`
**3.**Create a **`**.env**`** file and add your **Discord** bot token and client **ID**:
**`**`**`**    DISCORD_BOT_TOKEN=your_bot_token_here    CLIENT_ID=your_client_id_here **`**`**`**
**4.**Deploy slash commands**:**`**node deploy-commands.js**`
**5.**Start the bot**:**`**npm start**`

## **Commands**

**-**`**/schedule**`**:**Schedule a one**-**time message
**-**`**/repeat**`**:**Schedule a repeating message
**-**`**/list-alarms**`**:**List all active alarms **for** the **server**(**Admin**/**Leader** only**)**
**-**`**/cancel**`**:**Cancel a scheduled message

## **Contributing**

**Feel** free to open issues or submit pull requests to improve the bot**.**

## **License**

**This** project is licensed under the **MIT**License**.**
