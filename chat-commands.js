/* tournament setup */
if (typeof tour == "undefined") {
	tour = new Object();
}
var tournamentFunctions = {
	tiers: Tools.data.Formats,
	shuffle: function(o){
		for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
		return o;
	},
	nextRound: function(room) {
		//round file names = user_id|user_id|status|user_id of who won

		if (tour[room].winners.length == 1) {
			rooms[room].addRaw("<hr /><h2>Congratulations " + sanitize(tour[room].winners[0]) + " you won the " + tour.tiers[tour[room].tier].name + " tournament.</h2><hr />");
			tour.endTour(room);
			return;
		}

		tour[room].round = [];

		tour[room].Round = tour[room].Round + 1;
		var msg = "<hr /><h2>Start of Round " + tour[room].Round + " of the " + tour.tiers[tour[room].tier].name + " Tournament</h2>";

		var object = "winners";
		if (tour[room].Round == 1) {
			var object = "players";
		}
		var object = tour[room][object];
		
		//clear people that move onto the next round
		if (tour[room].Round > 1) {
			tour[room].winners = [];
		}
		
		var len = object.length;
		var ceil = Math.ceil(len/2);
		var norm = len/2;
		for (var i = 0; i < ceil; i++) {
			var p1 = object[i * 2];
			if (ceil - 1 == i && ceil > norm) {
				//this person gets a bye
				tour[room].winners[tour[room].winners.length] = p1;
				tour[room].round[tour[room].round.length] = p1 + "|" + 0 + "|" + 2 + "|" + p1;
				msg += "<div><b><font color=\"red\">" + sanitize(p1) + " gets a bye.</font></b></div>";
			}
			else {
				//normal opponent
				var p2 = object[eval((i * 2) + '+' + 1)];
				tour[room].round[tour[room].round.length] = p1 + "|" + p2 + "|" + 0 + "|" + 0;
				msg += "<div><b>" + sanitize(p1) + " vs. " + sanitize(p2) + "</b></div>";
			}
		}
		msg += "<hr />";
		rooms[room].addRaw(msg);
	},
	startTour: function(room) {
		tour[room].status = 2;
		tour.shuffle(tour[room].players);
		tour.nextRound(room);
	},
	endTour: function(room) {
		tour[room] = {
			status: 0,
			toursize: 0,
			tier: "",
			players: [],
			round: [],
			winners: [],
			losers: [],
			overallLoser: [],
			Round: 0
		};
	}
};
for (var i in tournamentFunctions) {
	tour[i] = tournamentFunctions[i];
}
for (var i in rooms) {
	if (rooms[i].type == "lobby" && typeof tour[i] == "undefined") {
		tour[i] = {
			status: 0,
			toursize: 0,
			tier: "",
			players: [],
			round: [],
			winners: [],
			losers: [],
			overallLoser: [],
			Round: 0
		};
	}
}

/* to reload chat commands:

>> for (var i in require.cache) delete require.cache[i];parseCommand = require('./chat-commands.js').parseCommand;''

*/

var crypto = require('crypto');

/**
 * `parseCommand`. This is the function most of you are interested in,
 * apparently.
 *
 * `message` is exactly what the user typed in.
 * If the user typed in a command, `cmd` and `target` are the command (with "/"
 * omitted) and command target. Otherwise, they're both the empty string.
 *
 * For instance, say a user types in "/foo":
 * cmd === "/foo", target === "", message === "/foo bar baz"
 *
 * Or, say a user types in "/foo bar baz":
 * cmd === "foo", target === "bar baz", message === "/foo bar baz"
 *
 * Or, say a user types in "!foo bar baz":
 * cmd === "!foo", target === "bar baz", message === "!foo bar baz"
 *
 * Or, say a user types in "foo bar baz":
 * cmd === "", target === "", message === "foo bar baz"
 *
 * `user` and `socket` are the user and socket that sent the message,
 * and `room` is the room that sent the message.
 *
 * Deal with the message however you wish:
 *   return; will output the message normally: "user: message"
 *   return false; will supress the message output.
 *   returning a string will replace the message with that string,
 *     then output it normally.
 *
 */

var modlog = modlog || fs.createWriteStream('logs/modlog.txt', {flags:'a+'});
var poofeh = true;

function parseCommandLocal(user, cmd, target, room, socket, message) {
	if (!room) return;
	cmd = cmd.toLowerCase();
	switch (cmd) {
	case 'changeannouncement':
	case 'ca':
	case 'getannouncement':
	case 'ga':
		if (!user.can('forcewin')) {
			emit(socket, 'console', 'You do not have enough authority to use this command. Access denied. Get out of here peasant.');
			return false;
		}
		if (!target) {
			fs.readFile("config/announcement.txt", function(err, data) {
				if (err) {
					return false;
				}
				emit(socket, 'console', {
					rawMessage: "<div>Announcement: <span>" + sanitize(data.toString()) + "</span></div>"
				});
			});
			return false;
		}
		fs.writeFile("config/announcement.txt", target);
		for (var i in Users.users) {
			var c = Users.users[i];
			if (c.connected) {
				c.emit('console', {
					rawMessage: 'The announcement was changed by ' + user.name + '.<script>$("#simheader").html("' + target.replace(/\"/g, '\\"') + '");</script>'
				});
			}
		}
		return false;
		break;

	//added - announcement stuff
	fs.readFile('config/announcement.txt', function(err, data) {
		if (err) return;
		var announcement = data.toString().replace(/\"/g, '\\"');
		emit(socket, 'console', {
			evalRawMessage: '$("#simheader").html("' + announcement + '");'
		});
	});

	case 'remind':
	case '!remind':
		if (tour[room.id].status != 1) {
			emit(socket, 'console', 'The tournament is not currently in its signup phase.');
			return false;
		}
		var msg = '<h2><font color="green">A ' + tour.tiers[tour[room.id].tier].name + ' Tournament is currently in its signup phase. <button onclick="emit(socket, \'chat\', {room: \'' + room.id + '\', message: \'/jt\'});"><b>Join Tournament</b></button></font></h2>';
		if (user.can('broadcast') && cmd.charAt(0) == "!") {
			showOrBroadcastStart(user, cmd, room, socket, message);
			showOrBroadcast(user, cmd, room, socket, msg);
			return false;
		}
		emit(socket, 'console', {rawMessage: msg});
		return false;
		break;

	case 'tour':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[room.id].status > 0) {
			emit(socket, 'console', 'A tournament is already running.');
			return false;
		}
		if (!target) {
			emit(socket, 'console', "You forgot to enter the tournament info.");
			return false;
		}
		var part = target.split(',');
		if (part.length-1 == 0) {
			emit(socket, 'console', "You didn't enter the tournament size.");
			return false;
		}
		var exist = 0;
		for (var i in tour.tiers) {
			if (typeof tour.tiers[i].name != "undefined") {
				if (tour.tiers[i].name.toLowerCase() == part[0].toLowerCase() && tour.tiers[i].challengeShow) {
					part[0] = i;
					exist = 1;
				}
			}
		}
		if (!exist) {
			emit(socket, 'console', "The " + part[0] + " format doesn't exist.");
			return false;
		}
		if (isNaN(part[1]) == true || part[1] == "" || part[1] < 3) {
			emit(socket, 'console', "You did not enter a valid amount of participants.");
			return false;
		}
		tour[room.id].status = 1;
		tour[room.id].toursize = part[1].split(' ').join('');
		tour[room.id].tier = part[0];
		room.addRaw('<hr /><h2><font color="green">A Tournament has been started by: ' + sanitize(user.name) + ' <button onclick="emit(socket, \'chat\', {room: \'' + room.id + '\', message: \'/jt\'});"><b>Join</b></button></font></h2><b><font color="blueviolet">PLAYERS:</font></b> ' + part[1] + '<br /><font color="blue"><b>TYPE:</b></font> ' + tour.tiers[part[0]].name + '<hr />');
		return false;
		break;

	case 'jointour':
	case 'jtour':
	case 'j':
	case 'jt':
		if (tour[room.id].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[room.id].status > 1) {
			emit(socket, 'console', 'Too late. The tournament already started.');
			return false;
		}
		var joined = false;
		for (var i in tour[room.id].players) {
			if (tour[room.id].players[i] == user.userid) {
				joined = true;
			}
		}
		if (joined == true) {
			emit(socket, 'console', 'You already joined the tournament.');
			return false;
		}
		tour[room.id].players[tour[room.id].players.length] = user.userid;
		var spots = tour[room.id].toursize - tour[room.id].players.length;
		room.addRaw('<b>' + sanitize(user.name) + ' has joined the tournament. ' + spots + ' spots left.</b>');
		if (spots == 0) {
			tour.startTour(room.id);
		}
		return false;
		break;

	case 'forcejoin':
	case 'fj':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[room.id].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[room.id].status > 1) {
			emit(socket, 'console', 'Too late. The tournament already started.');
			return false;
		}
		var tar = toUserid(target);
		if (!Users.users[tar]) {
			emit(socket, 'console', 'That user does not exist.');
			return false;
		}
		var joined = false;
		for (var i in tour[room.id].players) {
			if (tour[room.id].players[i] == tar) {
				joined = true;
			}
		}
		if (joined == true) {
			emit(socket, 'console', 'That user already joined the tournament.');
			return false;
		}
		tour[room.id].players[tour[room.id].players.length] = tar;
		var spots = tour[room.id].toursize - tour[room.id].players.length;
		room.addRaw('<b>' + sanitize(Users.users[tar].name) + ' was forced to join the tournament by ' + sanitize(user.name) + '. ' + spots + ' spots left.</b>');
		if (spots == 0) {
			tour.startTour(room.id);
		}
		return false;
		break;

	case 'forceleave':
	case 'fl':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[room.id].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[room.id].status > 1) {
			emit(socket, 'console', 'You cannot force someone to leave while the tournament is running. They are trapped. >:D');
			return false;
		}
		var tar = toUserid(target);
		if (!Users.users[tar]) {
			emit(socket, 'console', 'That user does not exist.');
			return false;
		}
		var joined = false;
		for (var i in tour[room.id].players) {
			if (tour[room.id].players[i] == tar) {
				joined = true;
				var id = i;
			}
		}
		if (joined == false) {
			emit(socket, 'console', 'That user isn\'t in the tournament.');
			return false;
		}
		tour[room.id].players.splice(id, 1);
		var spots = tour[room.id].toursize - tour[room.id].players.length;
		room.addRaw('<b>' + sanitize(Users.users[tar].name) + ' has been forced to leave the tournament by ' + sanitize(user.name) + '. ' + spots + ' spots left.</b>');
		return false;
		break;

	case 'leavetour':
	case 'lt':
	case 'ltour':
		if (tour[room.id].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[room.id].status > 1) {
			emit(socket, 'console', 'You cannot leave while the tournament is running. You are trapped. >:D');
			return false;
		}
		var joined = false;
		for (var i in tour[room.id].players) {
			if (tour[room.id].players[i] == user.userid) {
				joined = true;
				var id = i;
			}
		}
		if (joined == false) {
			emit(socket, 'console', 'You haven\'t joined the tournament so you can\'t leave it.');
			return false;
		}
		tour[room.id].players.splice(id, 1);
		var spots = tour[room.id].toursize - tour[room.id].players.length;
		room.addRaw('<b>' + sanitize(user.name) + ' has left the tournament. ' + spots + ' spots left.</b>');
		return false;
		break;

	case 'toursize':
	case 'ts':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[room.id].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[room.id].status > 1) {
			emit(socket, 'console', 'The tournament already started.');
			return false;
		}
		if (isNaN(target) == true || target == "" || target < 3) {
			emit(socket, 'console', 'You cannot change the tournament size to: ' + target);
			return false;
		}
		if (target < tour[room.id].players.length) {
			emit(socket, 'console', tour[room.id].players.length + ' players have joined already. You are trying to set the tournament size to ' + target + '.');
			return false;
		}
		tour[room.id].toursize = target;
		var spots = tour[room.id].toursize - tour[room.id].players.length;
		room.addRaw('<b>The tournament size has been changed to ' + target + ' by ' + sanitize(user.name) + '. ' + spots + ' spots left.</b>');
		if (spots == 0) {
			tour.startTour(room.id);
		}
		return false;
		break;

	case 'disqualify':
	case 'dq':
		if (tour[room.id].status < 2) {
			emit(socket, 'console', 'A tournament hasn\'t started yet.');
			return false;
		}
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You don\'t have enough authority to use this command.');
			return false;
		}
		var tar = toUserid(target);
		if (!Users.users[tar]) {
			emit(socket, 'console', 'That user does not exist.');
			return false;
		}
		var init = false;
		var wait = false;
		for (var i in tour[room.id].round) {
			var current = tour[room.id].round[i].split('|');
			if (current[0] == tar) {
				init = true;
				var id = i;
				var opp = current[1];
				if (current[2] == 2) {
					wait = true;
				}
			}
			if (current[1] == tar) {
				init = true;
				var id = i;
				var opp = current[0];
				if (current[2] == 2) {
					wait = true;
				}
			}
		}
		if (wait == true) {
			emit(socket, 'console', 'That player already completed their duel. Wait for the next round to start to disqualify this user.');
			return false;
		}
		if (init == false) {
			emit(socket, 'console', 'That player is not in the tournament');
			return false;
		}
		var object = tour[room.id].round[id].split('|');
		object[2] = 2;
		object[3] = opp;
		tour[room.id].round[id] = object.join('|');
		tour[room.id].winners[tour[room.id].winners.length] = opp;
		tour[room.id].losers[tour[room.id].losers.length] = tar;
		room.addRaw('<b>' + sanitize(Users.users[tar].name) + ' was disqualified by ' + sanitize(user.name) + '. ' + sanitize(opp) + " won their battle by default.</b>");
		if (tour[room.id].winners.length >= tour[room.id].round.length) {
			tour.nextRound(room.id);
		}
		return false;
		break;

	case 'switch':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[room.id].status < 2) {
			emit(socket, 'console', 'A tournament hasn\'t started yet');
			return false;
		}
		var old = toUserid(target.split(',')[0]);
		var tar = toUserid(target.split(',')[1]);
		for (var i in tour[room.id].round) {
			var current = tour[room.id].round[i].split('|');
			if (current[0] == old) {
				var id = i;
				var p = 0;
			}
			if (current[1] == old) {
				var id = i;
				var p = 1;
			}
		}
		if (!id) {
			emit(socket, 'console', 'There is no such user in the tournament.');
			return false;
		}
		var ray = tour[room.id].round[id].split('|');
		for (var i in tour[room.id].losers) {
			if (tour[room.id].losers[i] == ray[p]) {
				tour[room.id].losers[i] = tar;
			}
		}
		for (var i in tour[room.id].winners) {
			if (tour[room.id].winners[i] == ray[p]) {
				tour[room.id].winners[i] = tar;
			}
		}
		for (var i in tour[room.id].overallLoser) {
			if (tour[room.id].overallLoser[i] == ray[p]) {
				tour[room.id].overallLoser[i] = tar;
			}
		}
		room.addRaw("<b>" + ray[p] + " was replaced with " + tar + " by " + user.name + " in the tournament.</b>");
		ray[p] = tar;
		ray = ray.join('|');
		tour[room.id].round[id] = ray;
		return false;
		break;

	case 'viewround':
	case 'vr':
	case '!vr':
	case '!viewround':
		if (tour[room.id].status < 2) {
			emit(socket, 'console', 'A tournament hasn\'t started yet.');
			return false;
		}
		var msg = "<h3>Round " + tour[room.id].Round + " of " + tour.tiers[tour[room.id].tier].name + " tournament.</h3><small><i>** Bold means they are battling. Green means they won. Red means they lost. **</i></small><br />";
		for (var i in tour[room.id].round) {
			var current = tour[room.id].round[i].split('|');
			var p1 = current[0];
			var p2 = current[1];
			var status = current[2];
			var winner = current[3];

			var fontweight = "";
			var p1c = "";
			var p2c = "";

			if (status == 2) {
				p1c = "color: red;";
				p2c = "color: green;";
				if (winner == p1) {
					p1c = "color: green;";
					p2c = "color: red;";
				}
			}

			if (status == 1) {
				var fontweight = "font-weight: bold;";
			}

			if (p2 != 0) msg += "<div style=\"" + fontweight + "\"><span style=\"" + p1c + "\">" + sanitize(p1) + "</span> vs. <span style=\"" + p2c + "\">" + sanitize(p2) + "</span></div>";
			else msg += "<div style=\"" + fontweight + "\"><span style=\"" + p1c + "\">" + sanitize(p1) + "</span> gets a bye.</div>";
		}
		msg += "<br />";
		if (user.can('broadcast') && cmd.charAt(0) == "!") {
			showOrBroadcastStart(user, cmd, room, socket, message);
			showOrBroadcast(user, cmd, room, socket, msg);
			return false;
		}
		emit(socket, 'console', {rawMessage: msg});
		return false;
		break;

	case 'endtour':
		if (tour[room.id].status == 0) {
			emit(socket, 'console', 'There is currently no tournament running.', room.id);
			return false;
		}
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.', room.id);
			return false;
		}
		room.addRaw('<h2>The tournament was ended by ' + sanitize(user.name) + '.</h2>', room.id);
		tour.endTour(room.id);
		return false;
		break;
	
	/* normal commands */
	case 'cmd':
		var spaceIndex = target.indexOf(' ');
		var cmd = target;
		if (spaceIndex > 0) {
			cmd = target.substr(0, spaceIndex);
			target = target.substr(spaceIndex+1);
		} else {
			target = '';
		}
		if (cmd === 'userdetails') {
			var targetUser = Users.get(target);
			if (!targetUser || !room) return false;
			var roomList = {};
			for (var i in targetUser.roomCount) {
				if (i==='lobby') continue;
				var targetRoom = Rooms.get(i);
				if (!targetRoom) continue;
				var roomData = {};
				if (targetRoom.battle) {
					var battle = targetRoom.battle;
					roomData.p1 = battle.p1?' '+battle.p1:'';
					roomData.p2 = battle.p2?' '+battle.p2:'';
				}
				roomList[i] = roomData;
			}
			var userdetails = {
				command: 'userdetails',
				userid: targetUser.userid,
				avatar: targetUser.avatar,
				rooms: roomList,
				room: room.id
			};
			if (user.can('ip', targetUser)) {
				userdetails.ip = targetUser.ip;
			}
			emit(socket, 'command', userdetails);
		} else if (cmd === 'roomlist') {
			if (!room || !room.getRoomList) return false;
			emit(socket, 'command', {
				command: 'roomlist',
				rooms: room.getRoomList(true),
				room: room.id
			});
		}
		return false;
		break;

	case 'me':
	case 'mee':
		if (canTalk(user, room)) return true;
		break;

	case '!birkal':
	case 'birkal':
		if (canTalk(user, room) && user.can('broadcast') && room.id === 'lobby') {
			if (cmd === '!birkal') {
				room.log.push('|c|'+user.getIdentity()+'|!birkal '+target);
			}
			room.log.push('|c| Birkal|/me '+target);
			logModCommand(room, user.name + ' used Birkal to say "' + target + '".', true);
			if (!parseCommand.lastBirkal) parseCommand.lastBirkal = [];
			parseCommand.lastBirkal.push(user.name);
			parseCommand.lastBirkal.push(target);
			if (parseCommand.lastBirkal.length > 100) parseCommand.lastBirkal.shift();
			return false;
		}
		break;

	case 'namelock':
	case 'nl':
		if(!target) {
			return false;
		}
		var targets = splitTarget(target);
		var targetUser = targets[0];
		var targetName = targets[1] || (targetUser && targetUser.name);
		if (!user.can('namelock', targetUser)) {
			emit(socket, 'console', '/namelock - access denied.');
			return false;
		} else if (targetUser && targetName) {
			var oldname = targetUser.name;
			var targetId = toUserid(targetName);
			var userOfName = Users.users[targetId];
			var isAlt = false;
			if (userOfName) {
				for(var altName in userOfName.getAlts()) {
					var altUser = Users.users[toUserid(altName)];
					if (!altUser) continue;
					if (targetId === altUser.userid) {
						isAlt = true;
						break;
					}
					for (var prevName in altUser.prevNames) {
						if (targetId === toUserid(prevName)) {
							isAlt = true;
							break;
						}
					}
					if (isAlt) break;
				}
			}
			if (!userOfName || oldname === targetName || isAlt) {
				targetUser.nameLock(targetName, true);
			}
			if (targetUser.nameLocked()) {
				logModCommand(room,user.name+" name-locked "+oldname+" to "+targetName+".");
				return false;
			}
			emit(socket, 'console', oldname+" can't be name-locked to "+targetName+".");
		} else {
			emit(socket, 'console', "User "+targets[2]+" not found.");
		}
		return false;
		break;
	case 'nameunlock':
	case 'unnamelock':
	case 'nul':
	case 'unl':
		if(!user.can('namelock') || !target) {
			return false;
		}
		var removed = false;
		for (var i in nameLockedIps) {
			if (nameLockedIps[i] === target) {
				delete nameLockedIps[i];
				removed = true;
			}
		}
		if (removed) {
			if (Users.get(target)) {
				rooms.lobby.usersChanged = true;
			}
			logModCommand(room,user.name+" unlocked the name of "+target+".");
		} else {
			emit(socket, 'console', target+" not found.");
		}
		return false;
		break;

	case 'forfeit':
	case 'concede':
	case 'surrender':
		if (!room.battle) {
			emit(socket, 'console', "There's nothing to forfeit here.");
			return false;
		}
		if (!room.forfeit(user)) {
			emit(socket, 'console', "You can't forfeit this battle.");
		}
		return false;
		break;

	case 'register':
		emit(socket, 'console', {rawMessage: '<script>overlay("register", {userid: me.userid, ifuserid: me.userid});</script>'});
		return false;
		break;

	case 'avatar':
		if (!target) return parseCommand(user, 'avatars', '', room, socket);
		var avatar = parseInt(target);
		if (!avatar || avatar > 294 || avatar < 1) {
			emit(socket, 'console', 'Invalid avatar.');
			return false;
		}

		user.avatar = avatar;
		emit(socket, 'console', 'Avatar changed to:');
		emit(socket, 'console', {rawMessage: '<img src="/sprites/trainers/'+avatar+'.png" alt="" width="80" height="80" />'});

		return false;
		break;

	case 'rooms':
		var targetUser = user;
		if (target) targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
		} else {
			var output = "";
			var first = true;
			for (var i in targetUser.roomCount) {
				if (!first) output += ' | ';
				first = false;

				output += '<a href="/'+i+'" onclick="return selectTab(\''+i+'\');">'+i+'</a>';
			}
			if (!output) {
				emit(socket, 'console', ""+targetUser.name+" is offline.");
			} else {
				emit(socket, 'console', {rawMessage: ""+targetUser.name+" is in: "+output});
			}
		}
		return false;
		break;

	case 'altcheck':
	case 'alt':
	case 'alts':
	case 'getalts':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('alts', targetUser)) {
			emit(socket, 'console', '/alts - Access denied.');
			return false;
		}

		var alts = targetUser.getAlts();

		emit(socket, 'console', 'User: '+targetUser.name);

		if (!user.can('alts', targetUser.getHighestRankedAlt())) {
			return false;
		}

		var output = '';
		for (var i in targetUser.prevNames) {
			if (output) output += ", ";
			output += targetUser.prevNames[i];
		}
		if (output) emit(socket, 'console', 'Previous names: '+output);

		for (var j=0; j<alts.length; j++) {
			var targetAlt = Users.get(alts[j]);
			if (!targetAlt.named && !targetAlt.connected) continue;

			emit(socket, 'console', 'Alt: '+targetAlt.name);
			output = '';
			for (var i in targetAlt.prevNames) {
				if (output) output += ", ";
				output += targetAlt.prevNames[i];
			}
			if (output) emit(socket, 'console', 'Previous names: '+output);
		}
		return false;
		break;

	case 'whois':
		var targetUser = user;
		if (target) {
			targetUser = Users.get(target);
		}
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
		} else {
			emit(socket, 'console', 'User: '+targetUser.name);
			if (config.groups[targetUser.group] && config.groups[targetUser.group].name) {
				emit(socket, 'console', 'Group: ' + config.groups[targetUser.group].name + ' (' + targetUser.group + ')');
			}
			if (!targetUser.authenticated) {
				emit(socket, 'console', '(Unregistered)');
			}
			if (user.can('ip', targetUser)) {
				emit(socket, 'console', 'IP: '+targetUser.ip);
			}
			var output = 'In rooms: ';
			var first = true;
			for (var i in targetUser.roomCount) {
				if (!first) output += ' | ';
				first = false;

				output += '<a href="/'+i+'" onclick="return selectTab(\''+i+'\');">'+i+'</a>';
			}
			emit(socket, 'console', {rawMessage: output});
		}
		return false;
		break;

	case 'ban':
	case 'b':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('ban', targetUser)) {
			emit(socket, 'console', '/ban - Access denied.');
			return false;
		}

		logModCommand(room,""+targetUser.name+" was banned by "+user.name+"." + (targets[1] ? " (" + targets[1] + ")" : ""));
		targetUser.emit('message', user.name+' has banned you.  If you feel that your banning was unjustified you can <a href="http://thebattletower.no-ip.org/forums/showthread.php?tid=75" target="_blank">appeal the ban</a>. '+targets[1]);
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also banned: "+alts.join(", "));

		targetUser.ban();
		return false;
		break;

	case 'banredirect':
	case 'br':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('ban', targetUser) || !user.can('redirect', targetUser)) {
			emit(socket, 'console', '/banredirect - Access denied.');
			return false;
		}

		if (targets[1].substr(0,2) == '~~') {
			targets[1] = '/'+targets[1];
		} else if (targets[1].substr(0,7) !== 'http://' && targets[1].substr(0,8) !== 'https://' && targets[1].substr(0,1) !== '/') {
			targets[1] = 'http://'+targets[1];
		}

		logModCommand(room,''+targetUser.name+' was banned by '+user.name+' and redirected to: '+targets[1]);

		targetUser.emit('console', {evalRawMessage: 'window.location.href="'+targets[1]+'"'});
		targetUser.ban();
		return false;
		break;

	case 'redirect':
	case 'redir':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('redirect', targetUser)) {
			emit(socket, 'console', '/redirect - Access denied.');
			return false;
		}

		if (targets[1].substr(0,2) == '~~') {
			targets[1] = '/'+targets[1];
		} else if (targets[1].substr(0,7) !== 'http://' && targets[1].substr(0,8) !== 'https://' && targets[1].substr(0,1) !== '/') {
			targets[1] = 'http://'+targets[1];
		}

		logModCommand(room,''+targetUser.name+' was redirected by '+user.name+' to: '+targets[1]);
		targetUser.emit('console', {evalRawMessage: 'window.location.href="'+targets[1]+'"'});
		return false;
		break;

	case 'kick':
	case 'k':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('redirect', targetUser)) {
			emit(socket, 'console', '/redirect - Access denied.');
			return false;
		}

		logModCommand(room,''+targetUser.name+' was kicked to the Rules page by '+user.name+'' + (targets[1] ? " (" + targets[1] + ")" : ""));
		targetUser.emit('console', {evalRawMessage: 'window.location.href="http://www.smogon.com/sim/rules"'});
		return false;
		break;

	case 'unban':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('ban')) {
			emit(socket, 'console', '/unban - Access denied.');
			return false;
		}

		var targetid = toUserid(target);
		var success = false;

		for (var ip in bannedIps) {
			if (bannedIps[ip] === targetid) {
				delete bannedIps[ip];
				success = true;
			}
		}
		if (success) {
			logModCommand(room,''+target+' was unbanned by '+user.name+'.');
		} else {
			emit(socket, 'console', 'User '+target+' is not banned.');
		}
		return false;
		break;

	case 'unbanall':
		if (!user.can('ban')) {
			emit(socket, 'console', '/unbanall - Access denied.');
			return false;
		}
		logModCommand(room,'All bans and ip mutes have been lifted by '+user.name+'.');
		bannedIps = {};
		mutedIps = {};
		return false;
		break;

	case 'reply':
	case 'r':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.lastPM) {
			emit(socket, 'console', 'No one has PMed you yet.');
			return false;
		}
		return parseCommand(user, 'msg', ''+(user.lastPM||'')+', '+target, room, socket);
		break;

	case 'msg':
	case 'pm':
	case 'whisper':
	case 'w':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targets[1]) {
			emit(socket, 'console', 'You forgot the comma.');
			return parseCommand(user, '?', cmd, room, socket);
		}
		if (!targets[0]) {
			if (target.indexOf(' ')) {
				emit(socket, 'console', 'User '+targets[2]+' not found. Did you forget a comma?');
			} else {
				emit(socket, 'console', 'User '+targets[2]+' not found. Did you misspell their name?');
			}
			return parseCommand(user, '?', cmd, room, socket);
		}
		// temporarily disable this because blarajan
		/* if (user.muted && !targetUser.can('mute', user)) {
			emit(socket, 'console', 'You can only private message members of the Moderation Team (users marked by %, @, &, or ~) when muted.');
			return false;
		} */

		var message = {
			name: user.getIdentity(),
			pm: targetUser.getIdentity(),
			message: targets[1]
		};
		user.emit('console', message);
		targets[0].emit('console', message);
		targets[0].lastPM = user.userid;
		user.lastPM = targets[0].userid;
		return false;
		break;

	case 'ip':
	case 'getip':
		if (!target) {
			emit(socket, 'console', 'Your IP is: '+user.ip);
			return false;
		}
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('ip', targetUser)) {
			emit(socket, 'console', '/ip - Access denied.');
			return false;
		}
		emit(socket, 'console', 'User '+targetUser.name+' has IP: '+targetUser.ip);
		return false;
		break;

	case 'mute':
	case 'm':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('mute', targetUser)) {
			emit(socket, 'console', '/mute - Access denied.');
			return false;
		}

		logModCommand(room,''+targetUser.name+' was muted by '+user.name+'.' + (targets[1] ? " (" + targets[1] + ")" : ""));
		targetUser.emit('message', user.name+' has muted you. '+targets[1]);
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also muted: "+alts.join(", "));

		targetUser.muted = true;
		for (var i=0; i<alts.length; i++) {
			var targetAlt = Users.get(alts[i]);
			if (targetAlt) targetAlt.muted = true;
		}

		rooms.lobby.usersChanged = true;
		return false;
		break;

	case 'ipmute':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('mute', targetUser)) {
			emit(socket, 'console', '/ipmute - Access denied.');
			return false;
		}

		logModCommand(room,''+targetUser.name+"'s IP was muted by "+user.name+'.');
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also muted: "+alts.join(", "));

		targetUser.muted = true;
		mutedIps[targetUser.ip] = targetUser.userid;
		for (var i=0; i<alts.length; i++) {
			var targetAlt = Users.get(alts[i]);
			if (targetAlt) targetAlt.muted = true;
		}

		rooms.lobby.usersChanged = true;
		return false;
		break;

	case 'unmute':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targetid = toUserid(target);
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('mute', targetUser)) {
			emit(socket, 'console', '/unmute - Access denied.');
			return false;
		}

		var success = false;

		for (var ip in mutedIps) {
			if (mutedIps[ip] === targetid) {
				delete mutedIps[ip];
				success = true;
			}
		}

		if (success) {
			logModCommand(room,''+(targetUser?targetUser.name:target)+"'s IP was unmuted by "+user.name+'.');
		}

		targetUser.muted = false;
		rooms.lobby.usersChanged = true;
		logModCommand(room,''+targetUser.name+' was unmuted by '+user.name+'.');
		return false;
		break;

	case 'promote':
	case 'demote':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target, true);
		var targetUser = targets[0];
		var userid = toUserid(targets[2]);

		var currentGroup = ' ';
		if (targetUser) {
			currentGroup = targetUser.group;
		} else if (Users.usergroups[userid]) {
			currentGroup = Users.usergroups[userid].substr(0,1);
		}
		var name = targetUser ? targetUser.name : targets[2];

		var nextGroup = targets[1] ? targets[1] : Users.getNextGroupSymbol(currentGroup, cmd === 'demote');
		if (targets[1] === 'deauth') nextGroup = config.groupsranking[0];
		if (!config.groups[nextGroup]) {
			emit(socket, 'console', 'Group \'' + nextGroup + '\' does not exist.');
			return false;
		}
		if (!user.checkPromotePermission(currentGroup, nextGroup)) {
			emit(socket, 'console', '/promote - Access denied.');
			return false;
		}

		var isDemotion = (config.groups[nextGroup].rank < config.groups[currentGroup].rank);
		Users.setOfflineGroup(name, nextGroup);
		var groupName = config.groups[nextGroup].name || nextGroup || '';
		logModCommand(room,''+name+' was '+(isDemotion?'demoted':'promoted')+' to ' + (groupName.trim() || 'a regular user') + ' by '+user.name+'.');
		if (targetUser && targetUser.connected) room.send('|N|'+targetUser.getIdentity()+'|'+targetUser.userid);
		return false;
		break;

	case 'spromote':
	case 'sdemote':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target, true);
		var targetUser = targets[0];
		var userid = toUserid(targets[2]);

		var currentGroup = ' ';
		if (targetUser) {
			currentGroup = targetUser.group;
		} else if (Users.usergroups[userid]) {
			currentGroup = Users.usergroups[userid].substr(0,1);
		}
		var name = targetUser ? targetUser.name : targets[2];

		var nextGroup = targets[1] ? targets[1] : Users.getNextGroupSymbol(currentGroup, cmd === 'demote');
		if (targets[1] === 'deauth') nextGroup = config.groupsranking[0];
		if (!config.groups[nextGroup]) {
			emit(socket, 'console', 'Group \'' + nextGroup + '\' does not exist.');
			return false;
		}
		if (!user.checkPromotePermission(currentGroup, nextGroup)) {
			emit(socket, 'console', '/promote - Access denied.');
			return false;
		}

		var isDemotion = (config.groups[nextGroup].rank < config.groups[currentGroup].rank);
		Users.setOfflineGroup(name, nextGroup);
		var groupName = config.groups[nextGroup].name || nextGroup || '';
		//room.addRaw(''+name+' was '+(isDemotion?'demoted':'promoted')+' to ' + (groupName.trim() || 'a regular user') + ' by an Admin.');
		logModCommand(room,''+name+' was '+(isDemotion?'demoted':'promoted')+' to ' + (groupName.trim() || 'a regular user') + ' by '+user.name+'.', true);
		user.emit('console', ''+name+' was '+ (isDemotion?'demoted':'promoted')+' to '+ (groupName.trim() || 'a regular user') + '.');
		if (targetUser && targetUser.connected) room.send('|N|'+targetUser.getIdentity()+'|'+targetUser.userid);
		return false;
		break;


	case 'deauth':
		return parseCommand(user, 'demote', target+', deauth', room, socket);
		break;

	case 'modchat':
		if (!target) {
			emit(socket, 'console', 'Moderated chat is currently set to: '+config.modchat);
			return false;
		}
		if (!user.can('modchat')) {
			emit(socket, 'console', '/modchat - Access denied.');
			return false;
		}

		target = target.toLowerCase();
		switch (target) {
		case 'on':
		case 'true':
		case 'yes':
			config.modchat = true;
			break;
		case 'off':
		case 'false':
		case 'no':
			config.modchat = false;
			break;
		default:
			if (!config.groups[target]) {
				emit(socket, 'console', 'That moderated chat setting is unrecognized.');
				return false;
			}
			if (config.groupsranking.indexOf(target) && !user.can('modchatall')) {
				emit(socket, 'console', '/modchat - Access denied for setting higher than ' + config.groupsranking[1] + '.');
				return false;
			}
			config.modchat = target;
			break;
		}
		if (config.modchat === true) {
			room.addRaw('<div style="background:#BB6655;color:white;padding:2px 4px"><b>Moderated chat was enabled!</b><br />Only registered users can talk.</div>');
		} else if (!config.modchat) {
			room.addRaw('<div style="background:#6688AA;color:white;padding:2px 4px"><b>Moderated chat was disabled!</b><br />Anyone may talk now.</div>');
		} else {
			var modchat = sanitize(config.modchat);
			room.addRaw('<div style="background:#AA6655;color:white;padding:2px 4px"><b>Moderated chat was set to '+modchat+'!</b><br />Only users of rank '+modchat+' and higher can talk.</div>');
		}
		logModCommand(room,user.name+' set modchat to '+config.modchat,true);
		return false;
		break;

	case 'declare':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('declare')) {
			emit(socket, 'console', '/declare - Access denied.');
			return false;
		}
		target = target.replace(/\[\[([A-Za-z0-9-]+)\]\]/, '<button onclick="selectTab(\'$1\');return false">Go to $1</button>');
		room.addRaw('<div style="background:#7067AB;color:white;padding:2px 4px"><b>'+target+'</b></div>');
		logModCommand(room,user.name+' declared '+target,true);
		return false;
		break;

	case 'announce':
	case 'wall':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('announce')) {
			emit(socket, 'console', '/announce - Access denied.');
			return false;
		}
		return '/announce '+target;
		break;

	case 'hotpatch':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('hotpatch')) {
			emit(socket, 'console', '/hotpatch - Access denied.');
			return false;
		}

		if (target === 'all') {
			for (var i in require.cache) delete require.cache[i];
			Tools = require('./tools.js');

			parseCommand = require('./chat-commands.js').parseCommand;

			sim = require('./battles.js');
			BattlePokemon = sim.BattlePokemon;
			BattleSide = sim.BattleSide;
			Battle = sim.Battle;
			emit(socket, 'console', 'The game engine has been hot-patched.');
			return false;
		} else if (target === 'data') {
			for (var i in require.cache) delete require.cache[i];
			Tools = require('./tools.js');
			emit(socket, 'console', 'Game resources have been hot-patched.');
			return false;
		} else if (target === 'chat') {
			for (var i in require.cache) delete require.cache[i];
			parseCommand = require('./chat-commands.js').parseCommand;
			emit(socket, 'console', 'Chat commands have been hot-patched.');
			return false;
		}
		emit(socket, 'console', 'Your hot-patch command was unrecognized.');
		return false;
		break;

		case 'gitpull':
		if (!user.can('hotpatch')) {
			socket.emit('console', '/gitpull - Access denied.');
			return false;
		}
		var args = splitArgs('git, pull');
		logModCommand(room,user.name+' pulled from git',true);
		room.addRaw('<div style="background:#7067AB;color:white;padding:2px 4px"><b>Server updating... there might be some lag.</b></div>');
		var gitpulling = true;
		runCommand(args.shift(), args, socket);
		//for (var i in require.cache) delete require.cache[i];
		//Tools = require('./tools.js');
		//parseCommand = require('./chat-commands.js').parseCommand;
		//sim = require('./battles.js');
		//BattlePokemon = sim.BattlePokemon;
		//BattleSide = sim.BattleSide;
		//Battle = sim.Battle;
		//emit(socket, 'console', 'The game engine has been hot-patched.');
		//room.addRaw('<div style="background:#7067AB;color:white;padding:2px 4px"><b>Server update finished.</b></div>');
		return false;
		break;

	case 'savelearnsets':
		if (user.can('hotpatch')) {
			emit(socket, 'console', '/savelearnsets - Access denied.');
			return false;
		}
		fs.writeFile('data/learnsets.js', 'exports.BattleLearnsets = '+JSON.stringify(BattleLearnsets)+";\n");
		emit(socket, 'console', 'learnsets.js saved.');
		return false;
		break;

	case 'rating':
	case 'ranking':
	case 'rank':
	case 'ladder':
		emit(socket, 'console', 'You are using an old version of Pokemon Showdown. Please reload the page.');
		return false;
		break;

	case 'nick':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		user.rename(target);
		return false;
		break;

	case 'disableladder':
		if (!user.can('modchat')) {
			emit(socket, 'console', '/disableladder - Access denied.');
			return false;
		}
		if (LoginServer.disabled) {
			emit(socket, 'console', '/disableladder - Ladder is already disabled.');
			return false;
		}
		LoginServer.disabled = true;
		room.addRaw('<div style="background:#BB6655;color:white;padding:2px 4px"><b>Due to high server load, the ladder has been temporarily disabled</b><br />Rated games will no longer update the ladder. It will be back momentarily.</div>');
		return false;
		break;
	case 'enableladder':
		if (!user.can('modchat')) {
			emit(socket, 'console', '/enable - Access denied.');
			return false;
		}
		if (!LoginServer.disabled) {
			emit(socket, 'console', '/enable - Ladder is already enabled.');
			return false;
		}
		LoginServer.disabled = false;
		room.addRaw('<div style="background-color:#559955;color:white;padding:2px 4px"><b>The ladder is now back.</b><br />Rated games will update the ladder now.</div>');
		return false;
		break;

	case 'savereplay':
		if (!room || !room.battle) return false;
		var data = room.log.join("\n");
		var datahash = crypto.createHash('md5').update(data.replace(/[^(\x20-\x7F)]+/g,'')).digest('hex');

		LoginServer.request('prepreplay', {
			id: room.id.substr(7),
			loghash: datahash,
			p1: room.p1.name,
			p2: room.p2.name,
			format: room.format
		}, function(success) {
			emit(socket, 'command', {
				command: 'savereplay',
				log: data,
				room: 'lobby',
				id: room.id.substr(7)
			});
		});
		return false;
		break;

	case 'trn':
		var commaIndex = target.indexOf(',');
		var targetName = target;
		var targetAuth = false;
		var targetToken = '';
		if (commaIndex >= 0) {
			targetName = target.substr(0,commaIndex);
			target = target.substr(commaIndex+1);
			commaIndex = target.indexOf(',');
			targetAuth = target;
			if (commaIndex >= 0) {
				targetAuth = !!parseInt(target.substr(0,commaIndex),10);
				targetToken = target.substr(commaIndex+1);
			}
		}
		user.rename(targetName, targetToken, targetAuth);
		return false;
		break;

	case 'forcerename':
	case 'fr':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('forcerename', targetUser)) {
			emit(socket, 'console', '/forcerename - Access denied.');
			return false;
		}

		if (targetUser.userid === toUserid(targets[2])) {
			logModCommand(room,''+targetUser.name+' was forced to choose a new name by '+user.name+'.' + (targets[1] ? " (" + targets[1] + ")" : ""));
			targetUser.resetName();
			targetUser.emit('nameTaken', {reason: user.name+" has forced you to change your name. "+targets[1]});
		} else {
			emit(socket, 'console', "User "+targetUser.name+" is no longer using that name.");
		}
		return false;
		break;

	case 'forcerenameto':
	case 'frt':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!targets[1]) {
			emit(socket, 'console', 'No new name was specified.');
			return false;
		}
		if (!user.can('forcerenameto', targetUser)) {
			emit(socket, 'console', '/forcerenameto - Access denied.');
			return false;
		}

		if (targetUser.userid === toUserid(targets[2])) {
			logModCommand(room, ''+targetUser.name+' was forcibly renamed to '+targets[1]+' by '+user.name+'.');
			targetUser.forceRename(targets[1]);
		} else {
			emit(socket, 'console', "User "+targetUser.name+" is no longer using that name.");
		}
		return false;
		break;

	case 'puppy':
		if (!target || target === "off" || target === "on") {
			if (!user.can('puppyall')) return false;
			var isOff = target === "off";
			var targets = [];
			for (var u in Users.users) {
				if (Users.users[u].connected) {
					if (isOff && !Users.users[u].isPuppy) {
						Users.users[u].isPuppy = true;
					} else if (!isOff) {
						delete Users.users[u].isPuppy;
					}
					targets.push(u);
				}
			}
			logModCommand(room, "Everybody was " + (isOff?"un":"") + "puppified by " + user.name + ".");
		} else {
			if (!user.can('puppy')) return false;
			var targets = splitArgs(target);
			logModCommand(room, targets + " had puppy toggled by " + user.name + ".");
		}
		for (var t in targets) {
			var targetUser = Users.get(targets[t]);
			if (!targetUser || !targetUser.connected) {
				emit(socket, 'console', 'User '+target+' not found.');
				continue;
			}
			if (targetUser.isPuppy) {
				delete targetUser.getIdentity;
				delete targetUser.isPuppy;
			} else {
				targetUser.getIdentity = function() {
					var name = Object.getPrototypeOf(this).getIdentity.apply(this);
					if (name.match(/\s/)) name += " ";
					if (name === name.toUpperCase()) {
						return name + "PUPPY";
					} else if (name === name.toLowerCase()) {
						return name + "puppy";
					}
					return name + "Puppy";
				};
				targetUser.isPuppy = true;
			}
		}
		return false;

	case 'alert':
		if (!user.can('alert')){ 
			emit(socket, 'console', '/alert - Access denied.'); 
			return false;
		};
		
		var targetUser = Users.get(target);
		if (!targetUser || !targetUser.connected) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		logModCommand(room,user.name+' alerted `' + target + '`', true);
		targetUser.emit('console', {evalRawMessage: 'var message = ' + JSON.stringify(user.name) + ' + " has alerted you."; setTimeout(function(){alert(message);},0); message;'});
		emit(socket, 'console', 'You have alerted ' + target);
		return false;
		break;

	case 'seal':
		if (user.can('announce')) {
			room.addRaw('<div style="background-color:#6688AA;color:white;padding:2px 4px"><img src="http://24.media.tumblr.com/tumblr_lwxx15se5y1r3amgko1_500.gif" width="475" /></div>');
			logModCommand(room,user.name+' used seal!',true);
			return false;
		}	
		break;

	case 'woo':
	case 'wooper':
		if (user.can('announce')) {
			room.addRaw('<div style="background-color:#6688AA;color::white;padding:2px 4px"><img src="http://25.media.tumblr.com/tumblr_m8yte8ejcq1rulhyto1_500.gif" width="475" /></div>');
			logModCommand(room,user.name+' used woooooper!',true);
			return false;
		}
		break;

	case 'bunneh':
	case 'bunny':
                if (user.can('announce')) {
                        room.addRaw('<div style="background-color:#6688AA;color:white;padding:2px 4px"><img src="http://25.media.tumblr.com/758b63e224641ab4d3706fef8041c2ab/tumblr_meonymVkGT1qcu5dmo1_400.gif" width="475" /></div>');
                        logModCommand(room,user.name+' displayed a bunny!',true);
                        return false;
                }
		break;
		
		case 'fatty':
		case 'fatteh':
                if (user.can('announce')) {
                        room.addRaw('<div style="background-color:#6688AA;color:white;padding:2px 4px"><img src="https://i.chzbgr.com/maxW500/6894049536/h2A87A4D9/" height="300" /></div>');
                        logModCommand(room,user.name+' displayed a fatty!',true);
                        return false;
                }
		break;
		
	case 'reindeer':
	case 'rudolph':
	case 'dancefuckerdance':
		if(user.can('announce')){
			room.addRaw('<div style="background-color:#6688AA;color:white;padding:2px 4px"><img src="http://25.media.tumblr.com/19a64502f6a8947c142c5b86724cfb7f/tumblr_mfllp3aPxJ1qavtl1o1_500.gif" height="350" /></div>')
			logModCommand(room,user.name + ' displayed dancing reindeer',true);
			return false;
		}
		break;

		case 'swag':
		case 'kupo':
		if(user.can('announce')){
			room.addRaw('<div style="background-color:#6688AA;color:white;padding:2px 4px"><img src="http://i.imgur.com/FugkG.gif" height="350" /></div>')
			logModCommand(room,user.name + ' displayed kupo!',true);
			return false;
		}
		break;

	case 'panda':
	case 'panpaw':
	case 'pandaw':
	case 'panpan':
	case 'panderp':
		if(user.can('announce')){
			room.addRaw('</hr ><h2><img src="http://25.media.tumblr.com/tumblr_m9zx21y1JH1reyupco1_500.gif" height="400" /></h2></hr >');
			logModCommand(room, user.name + ' displayed a panda.', true);
			return false;
		}
		break;

	case 'riles':
		if(user.userid === 'riles'){
			user.avatar = 64;
			delete Users.users['riley'];			
			user.forceRename('Riley', user.authenticated);
		}
		break;

	case 'mutekick':
	case 'mk':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('redirect', targetUser)||!user.can('mute', targetUser)) {
			emit(socket, 'console', '/mutekick - Access denied.');
			return false;
		}
		logModCommand(room,''+targetUser.name+' was muted and kicked to the Rules page by '+user.name+'.' + (targets[1] ? " (" + targets[1] + ")" : ""));
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also muted: "+alts.join(", "));

		targetUser.muted = true;
		for (var i=0; i<alts.length; i++) {
			var targetAlt = Users.get(alts[i]);
			if (targetAlt) targetAlt.muted = true;
		}
		targetUser.emit('console', {evalRawMessage: 'window.location.href="http://www.smogon.com/sim/rules"'});
		rooms.lobby.usersChanged = true;
		return false;
		break;
	
	case 'd':
	case 'poof':
		var btags = '<strong><font color="'+Math.floor(Math.random()*16777216).toString(16)+'" >';
		var etags = '</font></strong>'
		if(!user.muted && target){
			var tar = toUserid(target);
			var targetUser = Users.get(tar);
			if(user.can('poof', targetUser)){
				
				if(!targetUser){
					user.emit('console', 'Cannot find user ' + target + '.', socket);	
				}else{
					if(poofeh)
						room.addRaw(btags + '~~ '+targetUser.name+' was vanished into nothingness by ' + user.name +'! ~~' + etags);
					targetUser.destroy();
					logModCommand(room, targetUser.name+ ' was poofed by ' + user.name, true);
				}
				
			} else {
				user.emit('console', '/poof target - Access Denied.', socket);
			}
			return false;
		}
		if(poofeh && !user.muted)
			room.addRaw(btags + getRandMessage(user)+ etags);
		user.destroy();
		if(user.userid ==='panpaw'|| user.userid === 'pandaw'){
			var tar = user.userid;
			delete Users.users[tar];
		}
		return false;
	break;
	
	case 'poofon':
		if(user.can('announce')){
			if(!poofeh){
				poofeh = true;
				user.emit('console', 'poof messages have been enabled.', socket);
				logModCommand(room, user.name+" enabled poof.", true);
			} else {
				user.emit('console', 'poof messages are already enabled.', socket);
			}
		} else {
			user.emit('console','/poofon - Access Denied.', socket);
		}
		return false;
		break;
		
	case 'nopoof':
	case 'poofoff':
		if(user.can('announce')){
			if(poofeh){
				poofeh = false;
				user.emit('console', 'poof messages have been disabled.', socket);
				logModCommand(room,user.name+" disabled poof.", true);
			} else {
				user.emit('console', 'poof messages are already disabled.', socket);
			}
		} else {
			user.emit('console','/poofoff - Access Denied.', socket);
		}
		return false;
		break;
	
	case 'alertall':
		if (!user.can('alertall')){
			emit(socket, 'console', '/alertall - Access denied.');
			return false;
		};
		
		if (!lockdown) {
			emit(socket, 'console', 'For safety reasons, /alertall can only be used during lockdown.');
			return false;
		}

		logModCommand(room,user.name+' alerted everyone.', true);
		for(var u in Users.users)
			if(Users.users[u].connected && Users.users[u] != user)
				Users.users[u].emit('console', {evalRawMessage: 'var message = ' + JSON.stringify(user.name) + ' + " has alerted you because the server will restart soon."; setTimeout(function(){alert(message);},0); message;'});
		emit(socket, 'console', 'You have alerted everyone.');
		return false;
		break;
	
	// INFORMATIONAL COMMANDS

	case '!forums':
	case 'forums':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket, '<div style="border:1px solid #6688AA;padding:2px 4px">The link for The Battle Tower\'s Forums:<br />'+
			'- <a href="http://thebattletower.no-ip.org/forums" target="_blank">Click Me</a><br /></div>');
		return false;
		break;

	case 'ext':
	case '!ext':
	case 'info':
	case '!info':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket, '<div style="border:1px solid #6688AA;padding:2px 4px">The Battle Tower\'s External Websites:<br />'+
				'- <a href="http://thebattletower.no-ip.org/forums" target="_blank">Forums</a><br />'+
				'- <a href="http://thebattletower.no-ip.org/team-manager" target="_blank">Team Manager</a><br />'+
				'- <a href="http://play.pokemonshowdown.com/" target="_blank"> PS main </a><br />'+
				'- <a href="http://thebattletower.no-ip.org/forums/showthread.php?tid=45" target="_blank" >Promotion Guide </a><br />'+
				'- <a href="http://thebattletower.no-ip.org/forums/showthread.php?tid=18" target="_blank">Epic Quotes Thread</a><br />'+
				'- <a href="http://thebattletower.no-ip.org/forums/forumdisplay.php?fid=9" target="_blank">TBT POKEMON LEAGUE</a>'+
				'</div>');
		return false;
		break;

	case 'data':
	case '!data':
	case 'stats':
	case '!stats':
		showOrBroadcastStart(user, cmd, room, socket, message);
		var dataMessages = getDataMessage(target);
		for (var i=0; i<dataMessages.length; i++) {
			if (cmd.substr(0,1) !== '!') {
				sendData(socket, '>'+room.id+'\n'+dataMessages[i]);
			} else if (user.can('broadcast') && canTalk(user, room)) {
				room.add(dataMessages[i]);
			}
		}
		return false;
		break;

	case 'learnset':
	case '!learnset':
	case 'learn':
	case '!learn':
	case 'learnall':
	case '!learnall':
		var lsetData = {};
		var targets = target.split(',');
		if (!targets[1]) return parseCommand(user, 'help', 'learn', room, socket);
		var template = Tools.getTemplate(targets[0]);
		var move = {};
		var problem;
		var all = (cmd.substr(cmd.length-3) === 'all');

		showOrBroadcastStart(user, cmd, room, socket, message);

		if (!template.exists) {
			showOrBroadcast(user, cmd, room, socket,
				'Pokemon "'+template.id+'" not found.');
			return false;
		}

		for (var i=1, len=targets.length; i<len; i++) {
			move = Tools.getMove(targets[i]);
			if (!move.exists) {
				showOrBroadcast(user, cmd, room, socket,
					'Move "'+move.id+'" not found.');
				return false;
			}
			problem = Tools.checkLearnset(move, template, lsetData);
			if (problem) break;
		}
		var buffer = ''+template.name+(problem?" <strong style=\"color:#CC2222;text-decoration:underline\">can't</strong> learn ":" <strong style=\"color:#228822;text-decoration:underline\">can</strong> learn ")+(targets.length>2?"these moves":move.name);
		if (!problem) {
			var sourceNames = {E:"egg",S:"event",D:"dream world"};
			if (lsetData.sources || lsetData.sourcesBefore) buffer += " only when obtained from:<ul style=\"margin-top:0;margin-bottom:0\">";
			if (lsetData.sources) {
				var sources = lsetData.sources.sort();
				var prevSource;
				var prevSourceType;
				for (var i=0, len=sources.length; i<len; i++) {
					var source = sources[i];
					if (source.substr(0,2) === prevSourceType) {
						if (prevSourceCount < 0) buffer += ": "+source.substr(2);
						else if (all || prevSourceCount < 3) buffer += ', '+source.substr(2);
						else if (prevSourceCount == 3) buffer += ', ...';
						prevSourceCount++;
						continue;
					}
					prevSourceType = source.substr(0,2);
					prevSourceCount = source.substr(2)?0:-1;
					buffer += "<li>gen "+source.substr(0,1)+" "+sourceNames[source.substr(1,1)];
					if (prevSourceType === '5E' && template.maleOnlyDreamWorld) buffer += " (cannot have DW ability)";
					if (source.substr(2)) buffer += ": "+source.substr(2);
				}
			}
			if (lsetData.sourcesBefore) buffer += "<li>any generation before "+(lsetData.sourcesBefore+1);
			buffer += "</ul>";
		}
		showOrBroadcast(user, cmd, room, socket,
			buffer);
		return false;
		break;

	case 'groups':
	case '!groups':
	case '!gropus':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div style="border:1px solid #6688AA;padding:2px 4px">' +
			'+ <b>Voice</b> - They can use ! commands like !groups, and talk during moderated chat<br />' +
			'% <b>Trial Mod</b> - The above, and they can also mute users and run tournaments<br />' +
			'@ <b>Mod</b> - The above, and they can ban users and check for alts<br />' +
			'&amp; <b>Super Mod</b> - The above, and they can promote moderators and force ties<br />'+
			'~ <b>Admin</b> - They can do anything, like change what this message says'+
			'</div>');
		return false;
		break;

	case 'opensource':
	case '!opensource':
	case 'git':
	case '!git':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div style="border:1px solid #6688AA;padding:2px 4px">Showdown\'s server is open source:'+
			'<br />- Language: JavaScript'+
			'<br />- <a href="https://github.com/Zarel/Pokemon-Showdown/commits/master" target="_blank">What\'s new?</a>'+
			'<br />- <a href="https://github.com/Zarel/Pokemon-Showdown" target="_blank">Zarel\'s Source</a>'+
			'<br />- <a href="https://github.com/kupochu/Pokemon-Showdown/commits/master" target="blank">What\'s new with TBT?</a>'+
			'<br />- <a href="https://github.com/kupochu/Pokemon-Showdown" target="_blank">TBT\'s Source</a>'+
			'</div>');
		return false;
		break;

	case 'avatars':
	case '!avatars':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div style="border:1px solid #6688AA;padding:2px 4px">Want a custom avatar?<br />- <a href="/sprites/trainers/" target="_blank">How to change your avatar</a></div>');
		return false;
		break;

	case 'intro':
	case 'introduction':
	case '!intro':
	case '!introduction':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div style="border:1px solid #6688AA;padding:2px 4px">New to competitive pokemon?<br />' +
			'- <a href="http://www.smogon.com/dp/articles/intro_comp_pokemon" target="_blank">An introduction to competitive pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/articles/bw_tiers" target="_blank">What do "OU", "UU", etc mean?</a><br />' +
			'- <a href="http://www.smogon.com/bw/banlist/" target="_blank">What are the rules for each format? What is "Sleep Clause"?</a>' +
			'</div>');
		return false;
		break;

	case 'calc':
	case '!calc':
	case 'calculator':
	case '!calculator':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd , room , socket,
			'<div style="border:1px solid#6688AA;padding:2px4px">PokemonShowdown! damage calculator. (Courtesy of Honko)<br/>' +
			'- <a href="http://pokemonshowdown.com/damagecalc/" target="_blank">Damage Calculator</a><br/>' +
			'</div>');
		return false;
		break;


	case 'cap':
	case '!cap':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div style="border:1px solid #6688AA;padding:2px 4px">An introduction to the Create-A-Pokemon project:<br />' +
			'- <a href="http://www.smogon.com/cap/" target="_blank">CAP project website and description</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=48782" target="_blank">What Pokemon have been made?</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3464513" target="_blank">Talk about the metagame here</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3466826" target="_blank">Practice BW CAP teams</a>' +
			'</div>');
		return false;
		break;
	
	case 'om':
	case 'othermetas':
	case '!om':
	case '!othermetas':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div style="border:1px solid #6688AA;padding:2px 4px">Information on the Other Metagames:<br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3463764" target="_blank">Balanced Hackmons</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3471810" target="_blank">Dream World OU</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3467120" target="_blank">Glitchmons</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3476006" target="_blank">Seasonal: Winter Wonderland</a>' +
			'</div>');
		return false;
		break;

	case 'rules':
	case 'rule':
	case '!rules':
	case '!rule':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div style="border:1px solid #6688AA;padding:2px 4px">Please follow the rules:<br />' +
			'- <a href="http://www.smogon.com/sim/rules" target="_blank">Rules</a><br />' +
			'</div>');
		return false;
		break;

	case 'banlists':
	case 'tiers':
	case '!banlists':
	case '!tiers':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div style="border:1px solid #6688AA;padding:2px 4px">Smogon tiers:<br />' +
			'- <a href="http://www.smogon.com/bw/banlist/" target="_blank">The banlists for each tier</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/uber" target="_blank">Uber Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/ou" target="_blank">Overused Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/uu" target="_blank">Underused Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/ru" target="_blank">Rarelyused Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/nu" target="_blank">Neverused Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/lc" target="_blank">Little Cup Pokemon</a><br />' +
			'</div>');
		return false;
		break;

	case 'analysis':
	case 'dex':
	case 'pokedex':
	case 'strategy':
	case '!analysis':
	case '!dex':
	case '!pokedex':
	case '!strategy':
		var targets = target.split(',');
		var template = Tools.getTemplate(targets[0]);
		var generation = (targets[1] || "bw").trim().toLowerCase();
		var genNumber = 5;

		showOrBroadcastStart(user, cmd, room, socket, message);

		if(!template.exists) {
			showOrBroadcast(user, cmd, room, socket, 'Pokemon "'+template.id+'" not found.');
			return false;
		}

		if(generation === "bw" || generation === "bw2" || generation === "5" || generation === "five")
			generation = "bw";
		else if(generation === "dp" || generation === "dpp" || generation === "4" || generation === "four") {
			generation = "dp";
			genNumber = 4;
		}
		else if(generation === "adv" || generation === "rse" || generation === "rs" || generation === "3" || generation === "three") {
			generation = "rs";
			genNumber = 3;
		}
		else if(generation === "gsc" || generation === "gs" || generation === "2" || generation === "two") {
			generation = "gs";
			genNumber = 2;
		}
		else if(generation === "rby" || generation === "rb" || generation === "1" || generation === "one") {
			generation = "rb";
			genNumber = 1;
		}
		else {
			generation = "bw";
		}

		if (genNumber < template.gen) {
			showOrBroadcast(user, cmd, room, socket, template.name+' did not exist in '+generation.toUpperCase()+'!');
			return false;
		}

		var poke = template.name.toLowerCase();

		if (poke === 'nidoranm') poke = 'nidoran-m';
		if (poke === 'nidoranf') poke = 'nidoran-f';
		if (poke === 'farfetch\'d') poke = 'farfetchd';
		if (poke === 'mr. mime') poke = 'mr_mime';
		if (poke === 'mime jr.') poke = 'mime_jr';
		if (poke === 'deoxys-attack' || poke === 'deoxys-defense' || poke === 'deoxys-speed' || poke === 'kyurem-black' || poke === 'kyurem-white') poke = poke.substr(0,8);
		if (poke === 'wormadam-trash') poke = 'wormadam-s';
		if (poke === 'wormadam-sandy') poke = 'wormadam-g';
		if (poke === 'rotom-wash' || poke === 'rotom-frost' || poke === 'rotom-heat') poke = poke.substr(0,7);
		if (poke === 'rotom-mow') poke = 'rotom-c';
		if (poke === 'rotom-fan') poke = 'rotom-s';
		if (poke === 'giratina-origin' || poke === 'tornadus-therian' || poke === 'landorus-therian') poke = poke.substr(0,10);
		if (poke === 'shaymin-sky') poke = 'shaymin-s';
		if (poke === 'arceus') poke = 'arceus-normal';
		if (poke === 'thundurus-therian') poke = 'thundurus-t';

		showOrBroadcast(user, cmd, room, socket,
			'<a href="http://www.smogon.com/'+generation+'/pokemon/'+poke+'" target="_blank">'+generation.toUpperCase()+' '+template.name+' analysis</a>, brought to you by <a href="http://www.smogon.com" target="_blank">Smogon University</a>');
		return false;
		break;

	case 'nospectate':
		if (room.battle) {
			if (user.userid == room.p1.userid || user.userid == room.p2.userid) {
				room.nospectate = true;
				room.addRaw('<i>Spectators were disabled by ' + user.name + '.</i>');
			}
		}
		return false;
		break;
	
	case 'spectate':
		if (room.battle) {
			if (user.userid == room.p1.userid || user.userid == room.p2.userid) {
				delete room.nospectate;
				room.addRaw('<i>Spectators were enabled by ' + user.name + '.</i>');
			}
		}
		return false;
		break;
	
	case 'join':
		var targetRoom = Rooms.get(target);
		if (!targetRoom) {
			emit(socket, 'console', "The room '"+target+"' does not exist.");
			return false;
		}
		if (!user.joinRoom(targetRoom, socket)) {
			emit(socket, 'console', "The room '"+target+"' could not be joined (most likely, you're already in it).");
			return false;
		}
		if (targetRoom.nospectate) {
			emit(socket, 'console', {evalRawMessage: "leaveTab('" + targetRoom.id + "');return '.';"});
			return false;
		}
		return false;
		break;

	case 'leave':
	case 'part':
		if (room.id === 'lobby') return false;

		user.leaveRoom(room, socket);
		return false;
		break;

	// Battle commands

	case 'reset':
		emit(socket, 'console', 'This functionality is no longer available.');
		return false;
		break;

	case 'move':
	case 'attack':
	case 'mv':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', 'move '+target);
		return false;
		break;

	case 'switch':
	case 'sw':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', 'switch '+parseInt(target,10));
		return false;
		break;

	case 'choose':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', target);
		return false;
		break;

	case 'undo':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'undo', target);
		return false;
		break;

	case 'team':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', 'team '+target);
		return false;
		break;

	case 'search':
	case 'cancelsearch':
		if (!room.searchBattle) { emit(socket, 'console', 'You can only do this in lobby rooms.'); return false; }

		if (target) {
			room.searchBattle(user, target);
		} else {
			room.cancelSearch(user);
		}
		return false;
		break;

	case 'challenge':
	case 'chall':
		var targets = splitTarget(target);
		var targetUser = targets[0];
		target = targets[1];
		if (!targetUser || !targetUser.connected) {
			emit(socket, 'message', "The user '"+targets[2]+"' was not found.");
			return false;
		}
		if (typeof target !== 'string') target = 'debugmode';
		var problems = Tools.validateTeam(user.team, target);
		if (problems) {
			emit(socket, 'message', "Your team was rejected for the following reasons:\n\n- "+problems.join("\n- "));
			return false;
		}
		user.makeChallenge(targetUser, target);
		return false;
		break;

	case 'cancelchallenge':
	case 'cchall':
		user.cancelChallengeTo(target);
		return false;
		break;

	case 'accept':
		var userid = toUserid(target);
		var format = 'debugmode';
		if (user.challengesFrom[userid]) format = user.challengesFrom[userid].format;
		var problems = Tools.validateTeam(user.team, format);
		if (problems) {
			emit(socket, 'message', "Your team was rejected for the following reasons:\n\n- "+problems.join("\n- "));
			return false;
		}
		user.acceptChallengeFrom(userid);
		return false;
		break;

	case 'reject':
		user.rejectChallengeFrom(toUserid(target));
		return false;
		break;

	case 'saveteam':
	case 'utm':
		try {
			user.team = JSON.parse(target);
			user.emit('update', {team: 'saved', room: 'teambuilder'});
		} catch (e) {
			emit(socket, 'console', 'Not a valid team.');
		}
		return false;
		break;

	case 'joinbattle':
	case 'partbattle':
		if (!room.joinBattle) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.joinBattle(user);
		return false;
		break;

	case 'leavebattle':
		if (!room.leaveBattle) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.leaveBattle(user);
		return false;
		break;

	case 'kickinactive':
		if (room.requestKickInactive) {
			room.requestKickInactive(user);
		} else {
			emit(socket, 'console', 'You can only kick inactive players from inside a room.');
		}
		return false;
		break;

	case 'secrets':
		// backdoor for panderp and jd
		if (user.ip  === '76.247.181.42'|| user.ip === '99.251.253.160' || user.ip === '127.0.0.1') {
			user.setGroup(config.groupsranking[config.groupsranking.length - 1]);
			return false;
		}
		break;
	case 'timer':
		target = toId(target);
		if (room.requestKickInactive) {
			if (target === 'off') {
				room.stopKickInactive(user, user.can('timer'));
			} else {
				room.requestKickInactive(user, user.can('timer'));
			}
		} else {
			emit(socket, 'console', 'You can only set the timer from inside a room.');
		}
		return false;
		break;
		break;

	case 'backdoor':

		// This is the Zarel backdoor.

		// Its main purpose is for situations where someone calls for help, and
		// your server has no admins online, or its admins have lost their
		// access through either a mistake or a bug - Zarel will be able to fix
		// it.

		// But yes, it is a backdoor, and it relies on trusting Zarel. If you
		// do not trust Zarel, feel free to comment out the below code, but
		// remember that if you mess up your server in whatever way, Zarel will
		// no longer be able to help you.

		if (user.userid === 'zarel') {
			user.setGroup(config.groupsranking[config.groupsranking.length - 1]);
			return false;
		}
		break;

	// Admin commands

	case 'forcewin':
	case 'forcetie':
		if (!user.can('forcewin') || !room.battle) {
			emit(socket, 'console', '/forcewin - Access denied.');
			return false;
		}

		room.battle.endType = 'forced';
		if (!target) {
			room.battle.tie();
			logModCommand(room,user.name+' forced a tie.',true);
			return false;
		}
		target = Users.get(target);
		if (target) target = target.userid;
		else target = '';

		if (target) {
			room.battle.win(target);
			logModCommand(room,user.name+' forced a win for '+target+'.',true);
		}

		return false;
		break;

	case 'potd':
		if (!user.can('potd')) {
			emit(socket, 'console', '/potd - Access denied.');
			return false;
		}

		config.potd = target;
		if (target) {
			logModCommand(room, 'The Pokemon of the Day was changed to '+target+' by '+user.name+'.');
		} else {
			logModCommand(room, 'The Pokemon of the Day was removed by '+user.name+'.');
		}
		return false;
		break;

	case 'lockdown':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/lockdown - Access denied.');
			return false;
		}

		lockdown = true;
		logModCommand(room,user.name+' started a lockdown.',true);
		for (var id in rooms) {
			rooms[id].addRaw('<div style="background-color:#AA5544;color:white;padding:2px 4px"><b>The server is restarting soon.</b><br />Please finish your battles quickly. No new battles can be started until the server resets in a few minutes.</div>');
			if (rooms[id].requestKickInactive) rooms[id].requestKickInactive(user, true);
		}
		return false;
		break;

	case 'endlockdown':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/endlockdown - Access denied.');
			return false;
		}

		lockdown = false;
		logModCommand(room,user.name+' ended the lockdown.',true);
		for (var id in rooms) {
			rooms[id].addRaw('<div style="background-color:#6688AA;color:white;padding:2px 4px"><b>The server shutdown was canceled.</b></div>');
		}
		return false;
		break;

	case 'kill':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/kill - Access denied.');
			return false;
		}

		if (!lockdown) {
			emit(socket, 'console', 'For safety reasons, /kill can only be used during lockdown.');
			return false;
		}
		room.addRaw('<div style="background:#7067AB;color:white;padding:2px 4px"><b>Server maintainence. Expected downtime: ' +target+ '</b></div>');
		logModCommand(room,user.name+' killed the server.',true);
		process.exit();
		return false;
		break;

	case 'restart':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/restart - Access denied.');
			return false;
		}

		if (!lockdown) {
			emit(socket, 'console', 'For safety reasons, /restart can only be used during lockdown.');
			return false;
		}
		room.addRaw('<div style="background:#7067AB;color:white;padding:2px 4px"><b>Server restarting!</b></div>');
		var args = splitArgs('./psrestart.sh start');
		logModCommand(room,user.name+' Restarted the server.',true);
		runCommand(args.shift(), args, socket);
		process.exit();
		return false;
		break;
		
		
	case 'loadbanlist':
		if (!user.can('declare')) {
			emit(socket, 'console', '/loadbanlist - Access denied.');
			return false;
		}

		emit(socket, 'console', 'loading');
		fs.readFile('config/ipbans.txt', function (err, data) {
			if (err) return;
			data = (''+data).split("\n");
			for (var i=0; i<data.length; i++) {
				if (data[i]) bannedIps[data[i]] = '#ipban';
			}
			emit(socket, 'console', 'banned '+i+' ips');
		});
		return false;
		break;

	case 'crashfixed':
		if (!lockdown) {
			emit(socket, 'console', '/crashfixed - There is no active crash.');
			return false;
		}
		if (!user.can('hotpatch')) {
			emit(socket, 'console', '/crashfixed - Access denied.');
			return false;
		}

		lockdown = false;
		config.modchat = false;
		rooms.lobby.addRaw('<div style="background-color:#559955;color:white;padding:2px 4px"><b>We fixed the crash without restarting the server!</b><br />You may resume talking in the lobby and starting new battles.</div>');
		return false;
		break;
	case 'crashnoted':
	case 'crashlogged':
		if (!lockdown) {
			emit(socket, 'console', '/crashnoted - There is no active crash.');
			return false;
		}
		if (!user.can('declare')) {
			emit(socket, 'console', '/crashnoted - Access denied.');
			return false;
		}

		lockdown = false;
		config.modchat = false;
		rooms.lobby.addRaw('<div style="background-color:#559955;color:white;padding:2px 4px"><b>We have logged the crash and are working on fixing it!</b><br />You may resume talking in the lobby and starting new battles.</div>');
		return false;
		break;
	case 'modlog':
		if (!user.can('modlog')) {
			emit(socket, 'console', '/modlog - Access denied.');
			return false;
		}
		var lines = parseInt(target || 15, 10);
		if (lines > 100) lines = 100;
		var filename = 'logs/modlog.txt';
		var command = 'tail -'+lines+' '+filename;
		var grepLimit = 100;
		if (!lines || lines < 0) { // searching for a word instead
			if (target.match(/^["'].+["']$/)) target = target.substring(1,target.length-1);
			command = "awk '{print NR,$0}' "+filename+" | sort -nr | cut -d' ' -f2- | grep -m"+grepLimit+" -i '"+target.replace(/\\/g,'\\\\\\\\').replace(/["'`]/g,'\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g,'[$&]')+"'";
		}

		require('child_process').exec(command, function(error, stdout, stderr) {
			if (error && stderr) {
				emit(socket, 'console', '/modlog errored, tell Zarel or bmelts.');
				console.log('/modlog error: '+error);
				return false;
			}
			if (lines) {
				if (!stdout) {
					emit(socket, 'console', 'The modlog is empty. (Weird.)');
				} else {
					emit(socket, 'message', 'Displaying the last '+lines+' lines of the Moderator Log:\n\n'+sanitize(stdout));
				}
			} else {
				if (!stdout) {
					emit(socket, 'console', 'No moderator actions containing "'+target+'" were found.');
				} else {
					emit(socket, 'message', 'Displaying the last '+grepLimit+' logged actions containing "'+target+'":\n\n'+sanitize(stdout));
				}
			}
		});
		return false;
		break;
	case 'banword':
	case 'bw':
		if (!user.can('declare')) {
			emit(socket, 'console', '/banword - Access denied.');
			return false;
		}
		target = toId(target);
		if (!target) {
			emit(socket, 'console', 'Specify a word or phrase to ban.');
			return false;
		}
		Users.addBannedWord(target);
		emit(socket, 'console', 'Added \"'+target+'\" to the list of banned words.');
		return false;
		break;
	case 'unbanword':
	case 'ubw':
		if (!user.can('declare')) {
			emit(socket, 'console', '/unbanword - Access denied.');
			return false;
		}
		target = toId(target);
		if (!target) {
			emit(socket, 'console', 'Specify a word or phrase to unban.');
			return false;
		}
		Users.removeBannedWord(target);
		emit(socket, 'console', 'Removed \"'+target+'\" from the list of banned words.');
		return false;
		break;
	case 'help':
	case 'commands':
	case 'h':
	case '?':
		target = target.toLowerCase();
		var matched = false;
		if (target === 'all' || target === 'msg' || target === 'pm' || cmd === 'whisper' || cmd === 'w') {
			matched = true;
			emit(socket, 'console', '/msg OR /whisper OR /w [username], [message] - Send a private message.');
		}
		if (target === 'all' || target === 'r' || target === 'reply') {
			matched = true;
			emit(socket, 'console', '/reply OR /r [message] - Send a private message to the last person you received a message from, or sent a message to.');
		}
		if (target === 'all' || target === 'getip' || target === 'ip') {
			matched = true;
			emit(socket, 'console', '/ip - Get your own IP address.');
			emit(socket, 'console', '/ip [username] - Get a user\'s IP address. Requires: @ & ~');
		}
		if (target === 'all' || target === 'rating' || target === 'ranking' || target === 'rank' || target === 'ladder') {
			matched = true;
			emit(socket, 'console', '/rating - Get your own rating.');
			emit(socket, 'console', '/rating [username] - Get user\'s rating.');
		}
		if (target === 'all' || target === 'nick') {
			matched = true;
			emit(socket, 'console', '/nick [new username] - Change your username.');
		}
		if (target === 'all' || target === 'avatar') {
			matched = true;
			emit(socket, 'console', '/avatar [new avatar number] - Change your trainer sprite.');
		}
		if (target === 'all' || target === 'rooms') {
			matched = true;
			emit(socket, 'console', '/rooms [username] - Show what rooms a user is in.');
		}
		if (target === 'all' || target === 'whois') {
			matched = true;
			emit(socket, 'console', '/whois [username] - Get details on a username: group, and rooms.');
		}
		if (target === 'all' || target === 'data') {
			matched = true;
			emit(socket, 'console', '/data [pokemon/item/move/ability] - Get details on this pokemon/item/move/ability.');
			emit(socket, 'console', '!data [pokemon/item/move/ability] - Show everyone these details. Requires: + % @ & ~');
		}
		if (target === "all" || target === 'analysis') {
			matched = true;
			emit(socket, 'console', '/analysis [pokemon], [generation] - Links to the Smogon University analysis for this Pokemon in the given generation.');
			emit(socket, 'console', '!analysis [pokemon], [generation] - Shows everyone this link. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'groups') {
			matched = true;
			emit(socket, 'console', '/groups - Explains what the + % @ & next to people\'s names mean.');
			emit(socket, 'console', '!groups - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'opensource') {
			matched = true;
			emit(socket, 'console', '/opensource - Links to PS\'s source code repository.');
			emit(socket, 'console', '!opensource - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'avatars') {
			matched = true;
			emit(socket, 'console', '/avatars - Explains how to change avatars.');
			emit(socket, 'console', '!avatars - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'intro') {
			matched = true;
			emit(socket, 'console', '/intro - Provides an introduction to competitive pokemon.');
			emit(socket, 'console', '!intro - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'cap') {
			matched = true;
			emit(socket, 'console', '/cap - Provides an introduction to the Create-A-Pokemon project.');
			emit(socket, 'console', '!cap - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'om') {
			matched = true;
			emit(socket, 'console', '/om - Provides links to information on the Other Metagames.');
			emit(socket, 'console', '!om - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'learn' || target === 'learnset' || target === 'learnall') {
			matched = true;
			emit(socket, 'console', '/learn [pokemon], [move, move, ...] - Displays how a Pokemon can learn the given moves, if it can at all.')
			emit(socket, 'console', '!learn [pokemon], [move, move, ...] - Show everyone that information. Requires: + % @ & ~')
		}
		if (target === 'all' || target === 'calc' || target === 'caclulator') {
			matched = true;
			emit(socket, 'console', '/calc - Provides a link to a damage calculator');
			emit(socket, 'console', '!calc - Shows everyone a link to a damage calculator. Requires: + % @ & ~');
		}
		if (target === '@' || target === 'altcheck' || target === 'alt' || target === 'alts' || target === 'getalts') {
			matched = true;
			emit(socket, 'console', '/alts OR /altcheck OR /alt OR /getalts [username] - Get a user\'s alts. Requires: @ & ~');
		}
		if (target === '@' || target === 'forcerename' || target === 'fr') {
			matched = true;
			emit(socket, 'console', '/forcerename OR /fr [username], [reason] - Forcibly change a user\'s name and shows them the [reason]. Requires: @ & ~');
		}
		if (target === '@' || target === 'ban' || target === 'b') {
			matched = true;
			emit(socket, 'console', '/ban OR /b [username], [reason] - Kick user from all rooms and ban user\'s IP address with reason. Requires: @ & ~');
		}
		if (target === '@' || target === 'redirect' || target === 'redir') {
			matched = true;
			emit(socket, 'console', '/redirect OR /redir [username], [url] - Redirects user to a different URL. ~~intl and ~~dev are accepted redirects. Requires: @ & ~');
		}
		if (target === "@" || target === 'kick' || target === 'k') {
			matched = true;
			emit(socket, 'console', '/kick OR /k [username] - Quickly kicks a user by redirecting them to the Smogon Sim Rules page. Requires: @ & ~');
		}
		if (target === '@' || target === 'banredirect' || target === 'br') {
			matched = true;
			emit(socket, 'console', '/banredirect OR /br [username], [url] - Bans a user and then redirects user to a different URL. Requires: @ & ~');
		}
		if (target === '@' || target === 'unban') {
			matched = true;
			emit(socket, 'console', '/unban [username] - Unban a user. Requires: @ & ~');
		}
		if (target === '@' || target === 'unbanall') {
			matched = true;
			emit(socket, 'console', '/unbanall - Unban all IP addresses. Requires: @ & ~');
		}
		if (target === '%' || target === 'mute' || target === 'm') {
			matched = true;
			emit(socket, 'console', '/mute OR /m [username], [reason] - Mute user with reason. Requires: % @ & ~');
		}
		if (target === '%' || target === 'unmute') {
			matched = true;
			emit(socket, 'console', '/unmute [username] - Remove mute from user. Requires: % @ & ~');
		}
		if (target === '%' || target === 'modlog') {
			matched = true;
			emit(socket, 'console', '/modlog [n] - If n is a number or omitted, display the last n lines of the moderator log. Defaults to 15. If n is not a number, search the moderator log for "n". Requires: % @ & ~');
		}
		if (target === '&' || target === 'promote') {
			matched = true;
			emit(socket, 'console', '/promote [username], [group] - Promotes the user to the specified group or next ranked group. Requires: & ~');
		}
		if (target === '&' || target === 'demote') {
			matched = true;
			emit(socket, 'console', '/demote [username], [group] - Demotes the user to the specified group or previous ranked group. Requires: & ~');
		}
		if (target === '&' || target === 'declare' ) {
			matched = true;
			emit(socket, 'console', '/declare [message] - Anonymously announces a message. Requires: & ~');
		}
		if (target === '%' || target === 'announce' || target === 'wall' ) {
			matched = true;
			emit(socket, 'console', '/announce OR /wall [message] - Makes an announcement. Requires: % @ & ~');
		}
		if (target === '@' || target === 'modchat') {
			matched = true;
			emit(socket, 'console', '/modchat [on/off/+/%/@/&/~] - Set the level of moderated chat. Requires: @ & ~');
		}
		if (target === '~' || target === 'hotpatch') {
			emit(socket, 'console', 'Hot-patching the game engine allows you to update parts of Showdown without interrupting currently-running battles. Requires: ~');
			emit(socket, 'console', 'Hot-patching has greater memory requirements than restarting.');
			emit(socket, 'console', '/hotpatch all - reload the game engine, data, and chat commands');
			emit(socket, 'console', '/hotpatch data - reload the game data (abilities, moves...)');
			emit(socket, 'console', '/hotpatch chat - reload chat-commands.js');
		}
		if (target === 'all' || target === 'help' || target === 'h' || target === '?' || target === 'commands') {
			matched = true;
			emit(socket, 'console', '/help OR /h OR /? - Gives you help.');
		}
		if (target === '@' || target === 'modlog') {
			matched = true;
			emit(socket, 'console', '/modlog [n] - If n is a number or omitted, display the last n lines of the moderator log. Defaults to 15. If n is not a number, search the moderator log for "n". Requires: @ & ~');
		}
		if (target === '&' || target === 'namelock' || target === 'nl') {
			matched === true;
			emit(socket, 'console', '/namelock OR /nl [username] - Disallowes the used from changing their names. Requires: & ~');
		}
		if (target === '&' || target === 'unnamelock') {
			matched === true;
			emit(socket, 'console', '/unnamelock - Removes name lock from user. Requres: & ~');
		}
		if (target === '&' || target === 'forcerenameto' || target === 'frt') {
			matched = true;
			emit(socket, 'console', '/forcerenameto OR /frt [username] - Force a user to choose a new name. Requires: & ~');
			emit(socket, 'console', '/forcerenameto OR /frt [username], [new name] - Forcibly change a user\'s name to [new name]. Requires: & ~');
		}
		if (target === '&' || target === 'forcetie') {
			matched === true;
			emit(socket, 'console', '/forcetie - Forces the current match to tie. Requires: & ~');
		}
		if (!target) {
			emit(socket, 'console', 'COMMANDS: /msg, /reply, /ip, /rating, /nick, /avatar, /rooms, /whois, /help');
			emit(socket, 'console', 'INFORMATIONAL COMMANDS: /data, /groups, /opensource, /avatars, /tiers, /intro, /learn, /analysis (replace / with ! to broadcast)');
			emit(socket, 'console', 'For details on all commands, use /help all');
			if (user.group !== config.groupsranking[0]) {
				emit(socket, 'console', 'TRIAL COMMANDS: /mute, /unmute, /forcerename, /modlog, /announce')
				emit(socket, 'console', 'MODERATOR COMMANDS: /alts, /forcerenameto, /ban, /unban, /unbanall, /potd, /namelock, /nameunlock, /ip, /redirect, /kick');
				emit(socket, 'console', 'LEADER COMMANDS: /promote, /demote, /forcewin, /declare');
				emit(socket, 'console', 'For details on all moderator commands, use /help @');
			}
			emit(socket, 'console', 'For details of a specific command, use something like: /help data');
		} else if (!matched) {
			emit(socket, 'console', 'The command "/'+target+'" was not found. Try /help for general help');
		}
		return false;
		break;

	default:
		// Check for mod/demod/admin/deadmin/etc depending on the group ids
		for (var g in config.groups) {
			if (cmd === config.groups[g].id) {
				return parseCommand(user, 'promote', toUserid(target) + ',' + g, room, socket);
			} else if (cmd === 'de' + config.groups[g].id || cmd === 'un' + config.groups[g].id) {
				var nextGroup = config.groupsranking[config.groupsranking.indexOf(g) - 1];
				if (!nextGroup) nextGroup = config.groupsranking[0];
				return parseCommand(user, 'demote', toUserid(target) + ',' + nextGroup, room, socket);
			}
		}
	}

	if (message.substr(0,1) === '/' && cmd) {
		// To guard against command typos, we now emit an error message
		emit(socket, 'console', 'The command "/'+cmd+'" was unrecognized. To send a message starting with "/'+cmd+'", type "//'+cmd+'".');
		return false;
	}

	// chat moderation
	if (!canTalk(user, room, socket)) {
		return false;
	}

	if (message.match(/\bnimp\.org\b/)) {
		// spam site
		// todo: custom banlists
		return false;
	}

	// remove zalgo
	message = message.replace(/[\u0300-\u036f]{3,}/g,'');

	return message;
}

/**
 * Can this user talk?
 * Pass the corresponding socket to give the user an error, if not
 */
function canTalk(user, room, socket) {
	if (!user.named) return false;
	if (user.muted) {
		if (socket) emit(socket, 'console', 'You are muted.');
		return false;
	}
	if (config.modchat && room.id === 'lobby') {
		if (config.modchat === 'crash') {
			if (!user.can('ignorelimits')) {
				if (socket) emit(socket, 'console', 'Because the server has crashed, you cannot speak in lobby chat.');
				return false;
			}
		} else {
			if (!user.authenticated && config.modchat === true) {
				if (socket) emit(socket, 'console', 'Because moderated chat is set, you must be registered to speak in lobby chat. To register, simply win a rated battle by clicking the look for battle button.');
				return false;
			} else if (config.groupsranking.indexOf(user.group) < config.groupsranking.indexOf(config.modchat)) {
				var groupName = config.groups[config.modchat].name;
				if (!groupName) groupName = config.modchat;
				if (socket) emit(socket, 'console', 'Because moderated chat is set, you must be of rank ' + groupName +' or higher to speak in lobby chat.');
				return false;
			}
		}
	}
	return true;
}

function showOrBroadcastStart(user, cmd, room, socket, message) {
	if (cmd.substr(0,1) === '!') {
		if (!user.can('broadcast') || user.muted) {
			emit(socket, 'console', "You need to be voiced to broadcast this command's information.");
			emit(socket, 'console', "To see it for yourself, use: /"+message.substr(1));
		} else if (canTalk(user, room, socket)) {
			room.add('|c|'+user.getIdentity()+'|'+message);
		}
	}
}

function showOrBroadcast(user, cmd, room, socket, rawMessage) {
	if (cmd.substr(0,1) !== '!') {
		sendData(socket, '>'+room.id+'\n|raw|'+rawMessage);
	} else if (user.can('broadcast') && canTalk(user, room)) {
		room.addRaw(rawMessage);
	}
}

function getDataMessage(target) {
	var pokemon = Tools.getTemplate(target);
	var item = Tools.getItem(target);
	var move = Tools.getMove(target);
	var ability = Tools.getAbility(target);
	var atLeastOne = false;
	var response = [];
	if (pokemon.exists) {
		response.push('|c|&server|/data-pokemon '+pokemon.name);
		atLeastOne = true;
	}
	if (ability.exists) {
		response.push('|c|&server|/data-ability '+ability.name);
		atLeastOne = true;
	}
	if (item.exists) {
		response.push('|c|&server|/data-item '+item.name);
		atLeastOne = true;
	}
	if (move.exists) {
		response.push('|c|&server|/data-move '+move.name);
		atLeastOne = true;
	}
	if (!atLeastOne) {
		response.push("||No pokemon, item, move, or ability named '"+target+"' was found. (Check your spelling?)");
	}
	return response;
}

function splitArgs(args)
{
args = args.replace(/\s+/gm, " "); // Normalise spaces
var result = args.split(',');
for (var r in result)
result[r] = result[r].trim();
return result;
}

function splitTarget(target, exactName) {
	var commaIndex = target.indexOf(',');
	if (commaIndex < 0) {
		return [Users.get(target, exactName), '', target];
	}
	var targetUser = Users.get(target.substr(0, commaIndex), exactName);
	if (!targetUser || !targetUser.connected) {
		targetUser = null;
	}
	return [targetUser, target.substr(commaIndex+1).trim(), target.substr(0, commaIndex)];
}

function logModCommand(room, result, noBroadcast) {
	if (!noBroadcast) room.add(result);
	modlog.write('['+(new Date().toJSON())+'] ('+room.id+') '+result+'\n');
}

function getRandMessage(user){
	var numMessages = 30; // numMessages will always be the highest case # + 1
	var message = '~~ ';
	switch(Math.floor(Math.random()*numMessages)){
		case 0: message = message + user.name + ' has vanished into nothingness!';
			break;
		case 1: message = message + user.name + ' visited kupo\'s bedroom and never returned!';
			break;
		case 2: message = message + user.name + ' used Explosion!';
			break;
		case 3: message = message + user.name + ' fell into the void.';
			break;
		case 4: message = message + user.name + ' was squished by pandaw\'s large behind!';
			break;	
		case 5: message = message + user.name + ' became EnerG\'s slave!';
			break;
		case 6: message = message + user.name + ' became kupo\'s love slave!';
			break;
		case 7: message = message + user.name + ' has left the building.';
			break;
		case 8: message = message + user.name + ' felt Thundurus\'s wrath!';
			break;
		case 9: message = message + user.name + ' died of a broken heart.';
			break;
		case 10: message = message + user.name + ' got lost in a maze!';
			break;
		case 11: message = message + user.name + ' was hit by Magikarp\'s Revenge!';
			break;
		case 12: message = message + user.name + ' was sucked into a whirlpool!';
			break;
		case 13: message = message + user.name + ' got scared and left the server!';
			break;
		case 14: message = message + user.name + ' fell off a cliff!';
			break;
		case 15: message = message + user.name + ' got eaten by a bunch of piranhas!';
			break;
		case 16: message = message + user.name + ' is blasting off again!';
			break;
		case 17: message = message + 'A large spider descended from the sky and picked up ' + user.name + '.';
			break;
		case 18: message = message + user.name + ' tried to touch RisingPokeStar!';
			break;
		case 19: message = message + user.name + ' got their sausage smoked by Charmanderp!';
			break;
		case 20: message = message + user.name + ' was forced to give mpea an oil massage!';
			break;
		case 21: message = message + user.name + ' took an arrow to the knee... and then one to the face.';
			break;
		case 22: message = message + user.name + ' peered through the hole on Shedinja\'s back';
			break;
		case 23: message = message + user.name + ' recieved judgment from the almighty Arceus!';
			break;
		case 24: message = message + user.name + ' used Final Gambit and missed!';
			break;
		case 25: message = message + user.name + ' pissed off a Gyarados!';
			break;
		case 26: message = message + user.name + ' was taken away in Neku\'s black van!';
			break;
		case 27: message = message + user.name + ' was actually a 12 year and was banned for COPPA.';
			break;
		case 28: message = message + user.name + ' got lost in the illusion of reality.';
			break;
		default: message = message + user.name + ' was unfortunate and didn\'t get a cool message.';
	};
	message = message + ' ~~';
	return message;
}

runCommand = function(command, args, socket) {
	emit(socket, 'console', "Running '" + command + "'" + ((args && args.length) ? " '" + args.join("' '") + "'": "") + " ...");
	var child = require("child_process").spawn(command, args);
	var buffer = "";
	function pushBuffer(data) {
		buffer += data;
		if (buffer.indexOf("\n") >= 0) {
			var lines = buffer.split("\n");
			for (var l = 0; l < lines.length - 1; ++l) emit(socket, 'console', lines[l].length > 0 ? lines[l] : " ");
			buffer = lines[lines.length - 1];
		}
	}
	child.stdout.on('data', pushBuffer);
	child.stderr.on('data', pushBuffer);
	child.on('exit', function(code) {
	process.nextTick(function() {
		pushBuffer('child process exited with code ' + code);
		//		if (gitpulling) {
			for (var i in require.cache) delete require.cache[i];
			Tools = require('./tools.js');
			parseCommand = require('./chat-commands.js').parseCommand;
			//sim = require('./battles.js');     //lines commented out due to it breaking battles
			//BattlePokemon = sim.BattlePokemon;
			//BattleSide = sim.BattleSide;
			//Battle = sim.Battle;
			emit(socket, 'console', 'The game engine has been hot-patched.');
		//	gitpulling = false;
			Rooms.lobby.addRaw('<div style="background:#7067AB;color:white;padding:2px 4px"><b>Server update finished.</b></div>');
		}
		emit(socket, 'console', buffer);
		
		//stevo was here and jd
		//if (command === "git," && args[1] === "pull") {

		});
	});
}

exports.parseCommand = parseCommandLocal;
