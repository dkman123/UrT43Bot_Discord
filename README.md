# UrT43Bot_Discord
Discord bot for Urban Terror 4.3

This is able to send RCon commands to the server.

Set the /config/config.json values

You can leave channelIDsToListen as an empty set if you want to listen to all channels.

You need to set roleRequired to a valid role on your discord server.

Set the server, port, and rconPassword for your Urban Terror server.

Generate your bot auth token (see the bot file for momre info)
Set that in /config/auth.json

You can run it locally using node.js or on a hosting site such as daki.cc

It has not been tested running locally on the UrT server.  The UDP framework does not like reaching out to the loopback address, so it might not work.  Though reaching out to the external IP might work.
