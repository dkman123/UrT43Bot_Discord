// UrT43Bot for discord rcon access

// using discord.js 14
const { Client, Events, GatewayIntentBits, Partials  } = require('discord.js');
const conf = require('./config/config.json')
// config.json
// {
// "channelIDsToListen": [ "333333333333333337" ],
// "roleRequired": "1111111111111111113",
// "server": "22.22.222.24",
// "port": "27960",
// "rconPassword": "xxxxxxxxxx"
// }

// channelIDsToListen is a comma separated list of channels to listen to. So you can set up an rcon channel
// leave channelIDsToListen as an empty array [ ] to disable filter
// to get the channel ID turn on dev mode, right click the channel name, copy ID (at the bottom)

// roleRequired is the role a user needs to be in order to issue commands (the bot will ignore you if you're not in this role)
// NOTE: To get the RoleID
//       Type command /@RoleName
//       Replacing the RoleName with what you want
//       It will reply with <@&99999>
//       Just keep the numbers
//       If it fails you need to allow @mentions to the group/role
//       You can also turn on developer mode then show/copy IDs

// bot settings
// https://discord.com/developers/applications

// add the bot to a server
// https://discordapp.com/oauth2/authorize?&client_id=1042448223983382668&scope=bot&permissions=67584
// permissions=8 for administrator, but above is all you need to listen and respond (Send Messages, Read Message History)

var logger = require('winston');
var auth = require('./config/auth.json');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
	colorize: true
});

// {
//   error: 0,
//   warn: 1,
//   info: 2,
//   http: 3,
//   verbose: 4,
//   debug: 5,
//   silly: 6
// }
logger.level = 'info';
//logger.level = 'debug';
//logger.level = 'silly';
// DEBUG
logger.debug('starting');
// Initialize Discord Bot
var bot = new Client({
	//token: auth.token,
	//autorun: true,
	//login: true,
	// https://discord.com/developers/applications
	// Applications - Bot - Privileged Gateway Intents section
	// Enable the Message Content Intent
	intents: [
		// depending on version: Intents.FLAGS = 13, GatewayIntentBits = 14:
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	]
	//partials: [
	//	Partials.Message,
	//	Partials.Channel
	//]
});

bot.on('ready', () => {
	logger.info('Connected');
	if (bot.user) {
		logger.info('Logged in as: ' + bot.user.username + ' - (' + bot.user.id + ')');
	}
});

function PermissionCheck(message) {
	//console.log("PermissionCheck " + message);

	if (!message.member) {
		logger.debug("Member was empty");
		return false;
	}
	// DEBUG
	//console.log(message.member.roles.cache);

	if (message.member && message.member.roles && message.member.roles.cache.some(role => role.id === conf.roleRequired)) {
		logger.debug("User has required role");
	}
	else {
		logger.info("Required role not found on user");
		logger.info("role " + conf.roleRequired + " not in " + message.member.roles.cache);
		return false;
	}

	if (!conf.channelIDsToListen || conf.channelIDsToListen.length < 1 || conf.channelIDsToListen.includes(message.channelId)) {
		logger.debug("channel is in monitor list or it's empty");
	}
	else {
		logger.info("channel NOT in list");
		logger.info("channel " + message.channelId + " not in " + conf.channelIDsToListen);
		return false;
	}

	return true;
}

function ProcessLog(message, args) {
	// NOTE: changing log level on the fly is "supposed" to work, but it is NOT
	if (args.length < 1) {
		logger.info('no log level specified');
	}
	else {
		var level = args[0].toLowerCase();
		if (level == "error"
			|| level == "warn"
			|| level == "info"
			|| level == "http"
			|| level == "verbose"
			|| level == "debug"
			|| level == "silly") {
			logger.level = level;
			message.channel.send("Logger set to " + level);
		}
		else {
			logger.level = "info";
			message.channel.send("Unrecognized level. Logger set to info. Available: error, warn, info, http, erbose, debug, silly.");
		}
		logger.info("Log level: " + logger.level.toString());
	}
}

function ProcessStatus(message, args) {
	logger.debug('sending status');

	var udp = require('dgram');
	var buffer = require('buffer');

	// creating a client socket
	var client = udp.createSocket('udp4');
	var replyString = "";

	// get status message
	var arr = [];
	arr.push(255);
	arr.push(255);
	arr.push(255);
	arr.push(255);
	var str = "getstatus ";
	for (var i = 0, l = str.length; i < l; i ++) {
		var ascii = str.charCodeAt(i);
		arr.push(ascii);
	}

	client.on('message', function(reply, info){
		//console.log('Data received from server : ' + reply.toString());
		console.debug("Received " + reply.length.toString() + " bytes from " + info.address.toString() + ":" + info.port.toString() + "\n");
		client.close();

		// "19" skips 0xFF0xFF0xFF0xFFstatusResponse\n
		var parse = new String(reply).substring(19).split('\\');
		// DEGUG
		//console.log(parse);
		var dict = new Object();
		var numKey = 1;
		var numVal = 2;
		while(numKey < parse.length) {
			dict[parse[numKey]] = parse[numVal];
			numKey += 2;
			numVal += 2;
		}
		// for(var key in dict) {
			// var val = dict[key];
			// replyString += key + ": " + val + "\r\n";
		// }
		// DEGUG
		//console.log(dict);
		replyString = "\r\nmapname: " + dict["mapname"];
		replyString += "\r\ntimelimit: " + dict["timelimit"];
		replyString += "\r\ng_suddendeath: " + dict["g_suddendeath"];
		replyString += "\r\ng_NextMap: " + dict["g_NextMap"];

		/*
		// read players from last element
		var players = new Map();
		parse = dict["g_modversion"].split("\n");
		// DEBUG
		//console.log(parse);
		numKey = 1;
		while(numKey < parse.length) {
			pl = parse[numKey].split("\"");
			// DEBUG
			//console.log(pl);
			if (pl.length > 1) {
				players[pl[1]] = pl[0];
			}
			numKey += 1;
		}
		////remove blank
		// if(players.has("undefined")) {
			// players.delete("undefined");
		// }
		// DEBUG
		//console.log(players);
		replyString += "```\r\n\r\nScore Ping Player";
		for(var key in players) {
			var val = players[key];
			replyString += "\r\n" + val + " " + key;
		}
		replyString += "```";
		*/

		message.channel.send(replyString);

		var args = [ "players" ];
		ProcessRConPlayers(message, args);
	});

	//sending msg
	console.debug("connecting to " + conf.server + ":" + conf.port);
	var dataBytes = Buffer.from(arr);
	logger.debug(dataBytes);
	// DEBUG
	//console.debug(dataBytes);
	client.send(dataBytes, conf.port, conf.server, function(error){
		if(error){
			logger.error(error);
		} else {
			logger.debug('Data sent !!!');
		}
	});
}

function ProcessRCon(message, args){
	if (args.length < 1) {
		logger.info('no rcon command specified');
	}
	else {
		var udp = require('dgram');
		var buffer = require('buffer');

		// creating a client socket
		var udpClient = udp.createSocket('udp4');

		// build command
		var str = "rcon \"" + conf.rconPassword + "\"";
		for (var idx = 0; idx < args.length; idx++ ){
			str += " " + args[idx];
		}
		// NOTE: shows rcon password
		////console.log("sending message: " + str);

		// get message
		var arr = [];
		arr.push(255);
		arr.push(255);
		arr.push(255);
		arr.push(255);
		for (var idx = 0, len = str.length; idx < len; idx ++) {
			var ascii = str.charCodeAt(idx);
			arr.push(ascii);
		}
		var dataBytes = Buffer.from(arr);
		////logger.debug(dataBytes);

		var numBytesReceived = 0;
		var replyString = "";
		var timeoutID = 0;

		udpClient.on('message', function(reply, info){
			var rstr = reply.toString();
			rstr = rstr.replace(/....print\n/, '');
			rstr = rstr.replace(/ +/, ' ');
			//logger.debug(Buffer.from(rstr, 'utf8').toString('hex'));
			if (numBytesReceived == 0) {
				logger.debug('Data received from server : ');
			}
			// DEBUG
			//console.log(rstr);
			logger.debug("Received " + reply.length.toString() + " bytes from " + info.address.toString() + ":" + info.port.toString() + "\n");
			numBytesReceived += reply.length;
			replyString += rstr;

			// DEBUG: if you want to see each packet received
			//message.channel.send(rstr);

			// DEBUG: shows packet size
			//console.log(info);

			if(reply.length < conf.messageCompleteUnder) {
				logger.debug("done");
				////console.log(timeoutID);
				closeConnection();
			}
		});

		//sending msg
		logger.debug("connecting to " + conf.server + ":" + conf.port);
		// DEBUG
		//console.debug(dataBytes);
		udpClient.send(dataBytes, parseInt(conf.port), conf.server, function(error){
			if(error){
				logger.error(error);
				udpClient.close();
			} else {
				logger.debug('Data sent !!!');
				timeoutID = setTimeout(closeConnection, 6000, 'timeout');
			}
		});

		function closeConnection() {
			clearTimeout(timeoutID);
			udpClient.close();
			logger.debug('connection closed');
			logger.info("Received " + numBytesReceived.toString() + " bytes total");

			// there's a message limit of 2000 chars
			if (replyString.length > 1986){
				logger.info("reply length " + replyString.length);
				var BLOCK = 1500;
				for(idx = 0; idx * BLOCK < replyString.length; idx++) {
					var end = idx * BLOCK + BLOCK;
					if (end > replyString.length) {
						end = replyString.length;
					}
					var sub = replyString.substring(idx * BLOCK, end);
					message.channel.send("```" + sub + "```");
				}
			}
			else {
				message.channel.send("```" + replyString + "```");
			}
		}

	}//else
}

function ProcessRConPlayers(message, args){
	if (args.length < 1) {
		logger.info('no rcon command specified');
	}
	else {
		var udp = require('dgram');
		var buffer = require('buffer');

		// creating a client socket
		var udpClient = udp.createSocket('udp4');

		// build command
		var str = "rcon \"" + conf.rconPassword + "\"";
		for (var idx = 0; idx < args.length; idx++ ){
			str += " " + args[idx];
		}
		// NOTE: shows rcon password
		////console.log("sending message: " + str);

		// get message
		var arr = [];
		arr.push(255);
		arr.push(255);
		arr.push(255);
		arr.push(255);
		for (var idx = 0, len = str.length; idx < len; idx ++) {
			var ascii = str.charCodeAt(idx);
			arr.push(ascii);
		}
		var dataBytes = Buffer.from(arr);
		////logger.debug(dataBytes);

		var numBytesReceived = 0;
		var replyString = "";
		var timeoutID = 0;

		udpClient.on('message', function(reply, info){
			var rstr = reply.toString();
			rstr = rstr.replace(/....print\n/, '');
			rstr = rstr.replace(/ +/, ' ');
			// DEBUG
			//logger.debug(Buffer.from(rstr, 'utf8').toString('hex'));
			if (numBytesReceived == 0) {
				logger.debug('Data received from server : ');
			}
			logger.debug("Received " + reply.length.toString() + " bytes from " + info.address.toString() + ":" + info.port.toString() + "\n");
			logger.silly(rstr);
			// DEBUG
			//console.log(rstr);
			numBytesReceived += reply.length;

			//// remove elements
			//rstr = rstr.replace(/Map:[A-Za-z\-_\.0-9]+\n/, '');
			//rstr = rstr.replace(/GameType: [A-Z]+\n/, '');
			//rstr = rstr.replace(/MatchMode: O[FN]+\n/, '');
			//rstr = rstr.replace(/WarmupPhase: [YESNO]+\n/, '');
			//// NOTE: GameTime counts down

			//// remove IP
			//rstr = rstr.replace(/IP:[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+\n/g, '');
			//// remove CTF
			//rstr = rstr.replace(/CTF: /g, '');
			//// squish KDA
			//rstr = rstr.replace(/KILLS:/g, "K:");
			//rstr = rstr.replace(/DEATHS:/g, "D:");
			//rstr = rstr.replace(/ASSISTS:/g, "A:");
			//rstr = rstr.replace(/TEAM:/g, "T:");
			//// remove auth
			//rstr = rstr.replace(/AUTH:[a-zA-Z0-9_\.\-]+ /g, '');

			// old parse spot

			// DEBUG
			//console.log(output);
			//logger.silly(output);
			replyString += rstr;

			// DEBUG: if you want to see each packet received
			//message.channel.send(rstr);

			// DEBUG: shows packet size
			//console.log(info);

			if(reply.length < conf.messageCompleteUnder) {
				logger.debug("done");
				////console.log(timeoutID);
				closeConnection();
			}
		});

		//sending msg
		logger.debug("connecting to " + conf.server + ":" + conf.port);
		// DEBUG
		//console.debug(dataBytes);
		udpClient.send(dataBytes, parseInt(conf.port), conf.server, function(error){
			if(error){
				logger.error(error);
				udpClient.close();
			} else {
				logger.debug('Data sent !!!');
				timeoutID = setTimeout(closeConnection, 6000, 'timeout');
			}
		});

		function closeConnection() {
			clearTimeout(timeoutID);
			udpClient.close();
			logger.debug('connection closed');
			logger.info("Received " + numBytesReceived.toString() + " bytes total");

			// DEBUG
			//console.log(replyString);

			//SAMPLE:
			//Map:ut4_jerusalem_f43\n
			//Players: 13\n
			//GameType: CTF\n
			//Scores: R:0 B:0\n
			//MatchMode: OFF\n
			//WarmupPhase: NO\n
			//GameTime: 00:13:43\n
			//0:[LAG]diddy_ TEAM:RED KILLS:2 DEATHS:1 ASSISTS:0 PING:100 AUTH:didpul IP:189.131.97.5:27960\n
			//CTF: CAP:0 RET:0 KFC:0 STC:0 PRF:0\n
			//5:kJ'|Party TEAM:RED KILLS:0 DEATHS:1 ASSISTS:0 PING:48 AUTH:theripper IP:145.224.28.59:27960\n
			//CTF: CAP:0 RET:0 KFC:0 STC:0 PRF:0\n
			//
			// CAP capture Flag
			// RET return Flag
			// KFC kill flag carrier
			// STC stop cap
			// PRF protect flag

			logger.silly(replyString);
			if (replyString.length > 0) {

				// shorten Spec team name
				replyString = replyString.replaceAll("SPECTATOR", "SPEC");
				// split it per line
				const arr = replyString.split("\n");
				var Map = arr[0];
				var PlayerCount = arr[1];
				//var GameType = arr[2];
				var Scores = arr[3];
				//var MatchMode = arr[4];
				//var WarmupPhase = arr[5];
				var GameTime = arr[6];
				// player fields
				const Fld = {
					// line 1
					Slot: 0,
					Name: 1,
					Team: 3,
					Kills: 5,
					Deaths: 7,
					Assists: 9,
					Ping: 11,
					Auth: 13,
					IP: 15,
					Port: 16,
					// line 2
					ctfBlank: 1,
					Cap: 3,
					Ret: 5,
					KFC: 7,
					STC: 9,
					PRF: 11,
				};
				const maxName = 20;
				var output = new String();
				output += Map + "\n";
				output += PlayerCount + "\n";
				output += Scores + "\n";
				output += GameTime + "\n";
				output += "ID " + "Name".padEnd(maxName) + " Team   K   D   A Ping FC FR KC SC PF\n";

				// players start at index 7
				for(var idx = 7; idx < arr.length; idx += 2) {
					var playerStr = arr[idx].replaceAll(":", " ");
					// a clan/player name with colons in it
					playerStr.replace(". AnP .", ".:AnP:.");
					var info = playerStr.split(" ");
					logger.silly(playerStr);
					logger.silly(info);

					if (info.length > Fld.Auth) {
						output = output + info[Fld.Slot].padStart(2) + " "
							+ info[Fld.Name].substring(0, maxName).padEnd(maxName) + " "
							+ info[Fld.Team].padEnd(4) + " "
							+ info[Fld.Kills].padStart(3) + " "
							+ info[Fld.Deaths].padStart(3) + " "
							+ info[Fld.Assists].padStart(3) + " "
							+ info[Fld.Ping].padStart(4) + " ";

						// 2nd line
						playerStr = arr[idx + 1].replaceAll(":", " ");
						info = playerStr.split(" ");
						logger.silly(playerStr);
						logger.silly(info);

						if (info.length > Fld.STC) {
							// some times it comes out as CTF CAP so the indices need to shift left by one
							if (info[1] == "") {
								output = output
									+ info[Fld.Cap].padStart(2) + " "
									+ info[Fld.Ret].padStart(2) + " "
									+ info[Fld.KFC].padStart(2) + " "
									+ info[Fld.STC].padStart(2) + " "
									+ info[Fld.PRF].padStart(2) + "\n";
							}
							else {
								output = output
									+ info[Fld.Cap - 1].padStart(2) + " "
									+ info[Fld.Ret - 1].padStart(2) + " "
									+ info[Fld.KFC - 1].padStart(2) + " "
									+ info[Fld.STC - 1].padStart(2) + " "
									+ info[Fld.PRF - 1].padStart(2) + "\n";
							}
						}
					}
				}

				// DEBUG
				//console.log(output);
				logger.silly(output);
				replyString = output;
			}
			

			//message.channel.send("```" + replyString + "```");

			if (replyString.length > 1986){
				logger.info("reply length " + replyString.length);
				var BLOCK = 1500;
				for(idx = 0; idx * BLOCK < replyString.length; idx++) {
					var end = idx * BLOCK + BLOCK;
					if (end > replyString.length) {
						end = replyString.length;
					}
					var sub = replyString.substring(idx * BLOCK, end);
					message.channel.send("```" + sub + "```");
				}
			}
			else {
				message.channel.send("```" + replyString + "```");
			}
		}

	}//else
}

function ProcessHelp(message) {
    logger.debug("ProcessHelp " + message);
	var replyString = "Help: \r\n";
	replyString += "status: A quick status \r\n";
	replyString += "rcon status: Player slot, score, ping, and name \r\n";
	replyString += "rcon players: Player name, scores, pings, some map details\r\n";
	replyString += "rcon serverinfo: server.cfg info\r\n";
	replyString += "rcon cq: list the player queue\r\n";
	replyString += "\r\n";
	replyString += "rcon cyclemap: Force move to the next map\r\n";
	replyString += "rcon g_gravity <value>: Set gravity on the server. 800 = normal; 100 = moon\r\n";
	replyString += "rcon kick <slot|name>: Kick a player off the server\r\n";
	replyString += "rcon g_nextmap <name>: Set the next map. Do not include the extension\r\n";
	replyString += "rcon nuke <slot|name>: Nuke a player\r\n";
	replyString += "rcon exec server.cfg: Reset the server\r\n";
	replyString += "rcon removeIP \"<IP>\": to remove a banned IP\r\n";
	replyString += "rcon reload: Restart the current map\r\n";
	replyString += "rcon smite <slot|name>: Kill a player\r\n";
	replyString += "rcon slap <slot|name>: Slap a player around\r\n";
	replyString += "rcon swap <slot|name> <slot|name>: Swap two players between teams\r\n";
	replyString += "rcon set timelimit \"<minutes>\": Set the time limit\r\n";
	replyString += "\r\n";
	replyString += "rcon set <svar> <value>: Set the server variable for any variable\r\n";
	replyString += "\tA list of cvars is at <https://urbanterror.fandom.com/wiki/CVARS>\r\n";
	replyString += "rcon g_instagib <0|1>\r\n";
	replyString += "rcon sv_infiniteStamina <0|1>\r\n";

	message.channel.send(replyString);
}

bot.on('messageCreate', (message) => {
	// DEBUG
	//console.log(message);

	// Our bot needs to know if it will execute a command
	// It will listen for messages that will start with `!`

	if (!message.content) {
		var name = "";
		if (message && message.author) {
			name = message.author.username;
		}
		logger.error("no message content from " + name);
		return;
	}

	if (message.content.substring(0, 1) == '!') {

		var args = message.content.substring(1).split(' ');
		var cmd = args[0];
		args = args.splice(1);
		logger.info('Command: ' + cmd);

		switch(cmd) {

			// !ping
			case 'ping':
				//logger.debug("; user: " + message.author.username + "; userID: " + message.author.id + "; channelID: " + message.channelId + "; message: " + message.Content);

				if(!PermissionCheck(message)) {
					return;
				}

				logger.debug('sending pong');
				message.channel.send("Pong!");
			break;

			// !log
			case 'log':
				if(!PermissionCheck(message)) {
					return;
				}

				ProcessLog(message, args);
			break;

			// !confCheck
			case 'confCheck':

				if(!PermissionCheck(message)) {
					return;
				}

				logger.debug('checking config');
				var str = "Server: " + conf.server + "; Port: " + conf.port;
				message.channel.send(str.toString());
			break;

			// !status
			case 'status':
				if(!PermissionCheck(message)) {
					return;
				}

				ProcessStatus(message, args);
			break;

			// !rcon
			case 'rcon':
				if(!PermissionCheck(message)) {
					return;
				}

				ProcessRCon(message, args);
			break;

			// !help
			case 'help':
				if(!PermissionCheck(message)) {
					return;
				}

				ProcessHelp(message);
			break;
			
			// !test
			case 'test':
				if(!PermissionCheck(message)) {
					return;
				}
				
				var rstr = "18:Skrech TEAM:BLUE KILLS:1 DEATHS:0 ASSISTS:0 PING:148 AUTH:--- IP:196.190.219.186:27960 CTF: CAP:0 RET:0 KFC:0 STC:0 PRF:0";
				// remove IP
				rstr = rstr.replace(/IP:[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+/g, '');
				// remove CTF
				rstr = rstr.replace("CTF: ", '');
				// squish KDA
				rstr = rstr.replace("KILLS:", "K:");
				rstr = rstr.replace("DEATHS:", "D:");
				rstr = rstr.replace("ASSISTS:", "A:");
				rstr = rstr.replace("TEAM:", "T:");
				// remove auth
				rstr = rstr.replace(/AUTH:[a-zA-Z\-]+ /g, '');
				console.log(rstr);
			break;

		 } //switch

	} //if

});

bot.login(auth.token);
