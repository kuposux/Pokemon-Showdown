// The server port - the port to run Pokemon Showdown under
      exports.port = 8000;

// The setuid user - if you're using a port below 1024, you probably want to run
// PS as root and set this to an unprivileged user
      exports.setuid = '';

// protocol - WebSockets ("ws") or Socket.IO ("io").
// We recommend using WebSockets unless you have a really compelling reason not to.
      exports.protocol = 'ws';

// The server ID - a unique ID describing this Showdown server
      exports.serverid = 'kupo';

// Host names that we will accept in login tokens.
//
// When the client connects to a Pokemon Showdown server at example.com,
// the client requests a signed assertion from the login server as proof
// that the user controls the name which she is using. The signed assertion
// will contain the hostname that the client used to connect to the server,
// which would be example.com in this case. The server verifies that the
// hostname provided is a valid hostname -- namely, one of the hostnames
// provided in this array.
//
// You should specify the hostnames here that people use to connect to your
// server. For example, if your server is hosted on battle.example.com, you
// would specify 'battle.example.com' here.
//
// If this is set to an empty array ([]), which is the default, the server
// will accept the first token, and will then add the hostname in that token
// (and the corresponding IP address) to tokenhosts.
      exports.tokenhosts = ['localhost', 'kupo.no-ip.org','204.112.213.60'];

// A signed assertion from the login server must be presented to this
// server within this many seconds. This can be 1 minute (or possibly
// less) unless your clock is wrong. In order to accommodate servers
// with inaccurate clocks, the default is 25 hours.
      exports.tokenexpiry = 25*60*60;

// The server token - to access the login database and ladder on pokemonshowdown.com
// This token must be registered for accessing the ladder, but you will
// still be able to login with an unregistered token.
      exports.servertoken = 'exampletoken-382hgraw4jr2tioq';

// Proxy IP - a list of proxy IPs with trusted X-Forwarded-For headers
// The list can be an array, or a string with whatever delimiter you wish.
// Leave at false to never trust any proxy. Set to true to trust all
// proxies. DO NOT SET TO TRUE UNLESS YOU ARE SURE YOU ARE BEHIND A
// TRUSTED PROXY.
      exports.proxyip = false;

// login server data - don't forget the http:// and the trailing slash
// This is the URL of the user database and ladder mentioned earlier.
// Don't change this setting - there aren't any other login servers right now
      exports.loginserver = 'http://play.pokemonshowdown.com/';
      exports.loginserverkeyalgo = "RSA-SHA1";
      exports.loginserverpublickeyid = 1;
      exports.loginserverpublickey = "-----BEGIN PUBLIC KEY-----\n" +
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2O8mOdl6ELJvx+XufPNk\n" +
	"piAwG6G7dOG61RCly4inBtQ8OgAcotfbq1km1FIZJ4II7IzcmGAwQLoBb9TfpNNi\n" +
	"+rN4shVth15riL4ip6YjKNxH4EFPTgvq5GnPmXdIIDxYnzRd3hIVqsCu6iKNcQm+\n" +
	"e/yyQEd4NRCtNeQEHodkZK/7usZzY9gzePQeS6OclzXaS6G99dNBP3Z6frapEckE\n" +
	"B2TSjcOvFaHWqbMR1Tk+B7ZEFvOXjsjlcL8PByqRErHglIxeujqtjzR46sLq6ofJ\n" +
	"vohoUaig9PjfEfyPgcObzOjUki9QLcRcvqUZGTKmDUTgwjCGY22OlvfYI+qW0hxx\n" +
	"mQIDAQAB\n" +
	"-----END PUBLIC KEY-----\n";
      
// Pokemon of the Day - put a pokemon's name here to make it Pokemon of the Day
// The PotD will always be in the #2 slot (not #1 so it won't be a lead)
// in every randomly-generated team.
      exports.potd = '';
      
// crash guard - write errors to log file instead of crashing
// This is normally not recommended - if Node wants to crash, the
// server needs to be restarted
// Unfortunately, socket.io bug 409 requires some sort of crash guard
// https://github.com/LearnBoost/socket.io/issues/609
      exports.crashguard = true;

// local sysop - automatically promote users who connect from
// 127.0.0.1 to the highest ranking group (Usually &, or sysop)
      exports.localsysop = true;

// report joins and leaves - shows messages like "<USERNAME> joined"
// Join and leave messages are small and consolidated, so there will never
// be more than one line of messages.
// This feature can lag larger servers - turn this off if your server is
// getting more than 80 or so users.
      exports.reportjoins = true;

// report battles - shows messages like "OU battle started"
// This feature can lag larger servers - turn this off if your server is
// getting more than 160 or so users.
      exports.reportbattles = true;

// moderated chat - prevent unregistered, unvoiced users from speaking
// This should only be enabled temporarily, when you're dealing with
// huge influxes of spammy users.
      exports.modchat = false;

// List of IPs from which the dev console (>> and >>>) can be used.
// The console is incredibly powerful because it allows the execution of
// arbitrary commands on the local computer (as the user running the
// server). If an account with the console permission were compromised,
// it could possibly be used to take over the server computer. As such,
// you should only specify a small range of trusted IPs here, or none
// at all. By default, only localhost can use the dev console.
// In addition to connecting from a valid IP, a user must *also* have
// the `console` permission in order to use the dev console.
// Setting this to an empty array ([]) will disable the dev console.
      exports.consoleips = ['127.0.0.1', '204.112.213.60', '76.247.181.42'];

// Whether to watch the config file for changes. If this is enabled,
// then the config.js file will be reloaded when it is changed.
// This can be used to change some settings using a text editor on
// the server. The main intended application of this is for people
// who have SSH access to the server to be able to add themselves
// to `consoleips` above and have it take effect without restarting
// the server. It is set to false by default because it probably
// will not be useful to most users. Note that there will be
// a brief delay between you saving the new config file and it
// being reloaded by the server. This feature might not work on Windows.
exports.watchconfig = false;

// loglobby - whether to log the lobby.
exports.loglobby = true;

// loguserstats - how often (in milliseconds) to write user stats to the
// lobby log. This has no effect if `loglobby` is disabled.
exports.loguserstats = 1000*60*10; // 10 minutes

// simulatorprocesses - the number of processes to use for handling battles
// You should leave this at 1 unless your server has a very large amount of
// traffic (i.e. hundreds of concurrent battles).
exports.simulatorprocesses = 1;


// permissions and groups:
// Each entry in `groupsranking' specifies the ranking of the groups.
// Each entry in `groups' is a seperate group. Some of the members are "special"
// while the rest is just a normal permission.
// The special members are as follows:
// - id: Specifies an id for the group.
// - name: Specifies the human-readable name for the group.
// - root: If this is true, the group can do anything.
// - inherit: The group uses the group specified's permissions if it cannot
// find the permission in the current group. Never make the graph
// produced using this member have any cycles, or the server won't run.
// - jurisdiction: The default jurisdiction for targeted permissions where one isn't
// explictly specified. "Targeted permissions" are permissions
// that might affect another user, such as `ban' or `promote'.
// 's' is a special group where it means the user itself only
// and 'u' is another special group where it means all groups
// lower in rank than the current group.
// All the possible permissions are as follows:
// - console: Developer console (>>).
// - lockdown: /lockdown and /endlockdown commands.
// - hotpatch: /hotpatch, /crashfixed and /savelearnsets commands.
// - ignorelimits: Ignore limits such as chat message length.
// - promote: Promoting and demoting. Will only work if the target user's current
// group and target group are both in jurisdiction.
// - ban: Banning and unbanning.
// - mute: Muting and unmuting.
// - receivemutedpms: Receive PMs from muted users.
// - forcerename: /fr command.
// - forcerenameto: /frt command.
// - redirect: /redir command.
// - ip: IP checking.
// - alts: Alt checking.
// - broadcast: Broadcast informational commands.
// - announce: /announce command.
// - modchat: Set modchat.
// - potd: Set PotD.
// - forcewin: /forcewin command.
// - battlemessage: /a command.

      exports.groupsranking = [' ', '+', '%', '@', '&', '~'];
      exports.groups = {
                        '~': {
                              id: "owner",
                              name: "Owner",
                              root: true,
                              rank: 5
                        },
                        '&': {
                              id: "admin",
                              name: "Administrator",
                              inherit: '@',
                              jurisdiction: '@us',
                              promote: 'u',
                              forcewin: true,
                              declare: true,
                              modchatall: true,
                              poof:true,
                              potd: true,
                              namelock: true,
                              forcerenameto: true,
                              rank: 4
                        },
                        '@': {
                              id: "op",
                              name: "Operator",
                              inherit: '%',
                              jurisdiction: 'u',
                              ban: true,
                              modchat: true,
                              redirect: true,
                              hideauth: true,
                              kick: true,
                              forcerename: true,
                              ip: true,
                              alts: '@u',
                              rank: 3
                        },
                        '%': {
                              id: "hop",
                              name: "Half Operator",
                              inherit: '+',
                              jurisdiction: 'u',
                              announce: true,
                              mute: true,
                              modlog: true,
                              forcerename: true,
                              rank: 2
                      },
                      '+': {
                              id: "voice",
                              name: "Voice",
                              inherit: ' ',
                              broadcast: true,
                              cpoof: true,
                              rank: 1
                      },
                      ' ': {
                              ip: 's',
                              alts: 's',
                              rank: 0
                      }
            };      

//tinyedit
